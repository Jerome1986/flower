import { request } from '@/utils/http'
import type { UserInfo } from '@/types/user'

// 测试手机号登录。
export const testLoginApi = (phone: string) => {
  return request<{ token: string; userInfo: UserInfo }>({
    method: 'POST',
    url: '/user/test-login',
    data: { phone },
  })
}

// 获取当前用户信息。
export const getCurrentUserApi = () => {
  return request<UserInfo>({
    method: 'GET',
    url: '/user/me',
  })
}
