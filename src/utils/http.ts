import { useUserStore } from '@/stores/modules/user'
import type { Data, RequestOptions } from '@/types/http'
import { currentReturnUrl } from './login-return'
/**
 * 添加拦截器:
 *   拦截 request 请求
 *   拦截 uploadFile 文件上传
 *
 * TODO:
 *   1. 非 http 开头需拼接地址
 *   2. 请求超时
 *   3. 添加小程序端请求头标识
 *   4. 添加 token 请求头标识
 */
// API 基地址，默认使用线上服务；本地调试可通过 VITE_API_BASE_URL 覆盖。
// export const baseURL = (
//   import.meta.env.VITE_API_BASE_URL || 'https://service.hualishixu.cn/api'
// ).replace(/\/+$/, '')

export const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(
  /\/+$/,
  '',
)

// 添加拦截器
const httpInterceptor = {
  // 拦截前触发
  invoke(options: RequestOptions) {
    // 1. 非 http 开头需拼接地址
    if (!options.url.startsWith('http')) {
      options.url = baseURL + options.url
    }
    // 2. 请求超时, 默认 60s
    options.timeout = 10000
    // 3. 添加小程序端请求头标识
    options.header = {
      ...options.header,
      'source-client': 'minimap',
    }
    // 4. 添加 token 请求头标识
    const userStore = useUserStore()
    const token = userStore.token
    if (token) {
      options.header.Authorization = `Bearer ${token}`
    }
  },
}
// 将接口返回的站内图片路径补全为后端域名，小程序不能直接加载站内相对地址。
export const resolveApiImage = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path
  const origin = /^(https?:\/\/[^/]+)/i.exec(baseURL)?.[1] || ''
  return path.startsWith('/') && !path.startsWith('//') ? origin + path : ''
}
/**
 * 请求函数
 * @param  UniApp.RequestOptions
 * @returns Promise
 *  1. 返回 Promise 对象
 *  2. 获取数据成功
 *    2.1 提取核心数据 res.data
 *    2.2 添加类型，支持泛型
 *  3. 获取数据失败
 *    3.1 401错误  -> 清理用户信息，跳转到登录页
 *    3.2 其他错误 -> 根据后端错误信息轻提示
 *    3.3 网络错误 -> 提示用户换网络
 */
const safeShowToast = (message: unknown) => {
  const msg = Array.isArray(message)
    ? message.filter((item) => typeof item === 'string').join('；')
    : typeof message === 'string'
    ? message.trim()
    : ''
  if (!msg) return
  uni.showToast({
    icon: 'none',
    title: msg,
    duration: 2000,
    mask: true,
  })
}
// 2.2 添加类型，支持泛型
export const request = <T>(options: RequestOptions) => {
  // 1. 返回 Promise 对象
  const requestToken = useUserStore().token
  return new Promise<Data<T>>((resolve, reject) => {
    uni.request({
      ...options,
      // 响应成功
      success(res) {
        const body = res.data as Data<T> | null | undefined
        // 状态码 2xx， axios 就是这样设计的
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 2.根据后端状态码来提示报错
          if (body?.code !== 200) {
            safeShowToast(body?.message || '请求错误')
            reject(res)
            return
          }
          // 抛出服务器返回的结果
          resolve(res.data as Data<T>)
        } else if (res.statusCode === 401) {
          // 401错误  -> 清理用户信息，跳转到登录页
          const userStore = useUserStore()
          if (requestToken && requestToken === userStore.token) {
            const returnUrl = currentReturnUrl()
            userStore.clearProfile()
            uni.navigateTo({
              url:
                '/pages/login/index' +
                (returnUrl ? '?returnUrl=' + encodeURIComponent(returnUrl) : ''),
            })
          }
          safeShowToast(body?.message || '请求错误')
          reject(res)
        } else {
          // 其他错误 -> 根据后端错误信息轻提示
          safeShowToast(body?.message || '请求错误')
          reject(res)
        }
      },
      // 响应失败
      fail(err) {
        uni.showToast({
          icon: 'none',
          title: '网络错误，换个网络试试',
        })
        reject(err)
      },
    })
  })
}
uni.addInterceptor('request', httpInterceptor)
uni.addInterceptor('uploadFile', httpInterceptor)
