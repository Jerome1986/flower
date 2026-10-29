import { request } from '@/utils/http'
import type { UserInfo, WxLoginResponse } from '@/types/user'

export const updateCurrentUserApi = (data: { nickname: string; age: number | null; gender: number }) =>
  request<UserInfo>({ method: 'PUT', url: '/user/me', data })

// 获取当前用户信息。
export const getCurrentUserApi = () => {
  return request<UserInfo>({
    method: 'GET',
    url: '/user/me',
  })
}

// 微信手机号登录。
export const wxLogin = (code: string, phoneCode: string, inviterCode: string) => {
  return request<WxLoginResponse>({
    method: 'POST',
    url: '/user/wx-login',
    data: { code, phoneCode, inviterCode },
  })
}
