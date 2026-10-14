import * as api from '@/api/marketing'
// 绑定时机及首次注册协议确认后启用。
export const invitationBindingEnabled = false
export function rememberInvitation(code?: string) {
  if (code && !uni.getStorageSync('flower-pending-invite-code'))
    uni.setStorageSync('flower-pending-invite-code', code)
}
export async function bindPendingInvitation() {
  const code = uni.getStorageSync('flower-pending-invite-code')
  if (!code) return
  await api.bindInvitationApi(String(code))
  uni.removeStorageSync('flower-pending-invite-code')
}
