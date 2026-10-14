import { pendingIntegration } from '@/utils/integration'
import type { UserInfo } from '@/types/user'
// 仅预留前端输入输出需求；正式微信登录和支付协议待提供。
export const loginWithWechatApi = (_code: string) => {
  return pendingIntegration<{
    token: string
    userInfo: UserInfo
  }>('微信登录')
}
export const payOrderApi = (_orderNo: string) => {
  return pendingIntegration<void>('微信支付')
}
