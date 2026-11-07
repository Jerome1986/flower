// 首次分享来源交给微信注册接口绑定，不为已注册用户补绑。
export const rememberInvitation = (code?: string) => {
  if (!code || !/^[a-zA-Z0-9_-]{1,32}$/.test(code)) return
  if (!uni.getStorageSync('flower-pending-invite-code')) {
    uni.setStorageSync('flower-pending-invite-code', code)
  }
}
