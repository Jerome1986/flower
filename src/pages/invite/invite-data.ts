import { getNewUserCoupon, grantNewUserCoupon } from '../coupons/new-user-coupon'
import { readCoupons, type Coupon } from '../coupons/coupon-data'

// 模拟邀请关系，每个新用户只绑定一次。
export interface InviteRecord {
  id: string
  inviterId: string
  name: string
  date: string
  reward: string
}
// 取得账户邀请码，并保存可验证的模拟映射。
export function getInviteCode(userId: string) {
  // 本地有效邀请码与用户的对应关系。
  const codes: Record<string, string> = uni.getStorageSync('flower-invite-codes') || {}
  // 稳定的邀请码，登录和返回页面不改变。
  const code = `FLOWER-${userId}`
  codes[code] = userId
  uni.setStorageSync('flower-invite-codes', codes)
  return code
}
// 分享进入后暂存首次有效来源，浏览不发奖励。
export function rememberInvitation(code?: string) {
  if (!code || uni.getStorageSync('flower-pending-inviter')) return
  // 已注册的模拟邀请码。
  const codes: Record<string, string> = uni.getStorageSync('flower-invite-codes') || {}
  if (codes[code]) uni.setStorageSync('flower-pending-inviter', codes[code])
}
// 查询当前用户成功邀请记录。
export function readInvites(userId: string): InviteRecord[] {
  // 本地所有邀请关系。
  const records: InviteRecord[] = uni.getStorageSync('flower-invites') || []
  return records.filter((record) => record.inviterId === userId)
}
// 模拟首次注册，发新人券并给有效邀请者发奖励。
export function registerUser(userId: string, phone: string) {
  // 已有新人券代表该账户已注册，老用户登录不重复奖励。
  const isNew = !getNewUserCoupon(userId)
  // 注册前首次有效邀请来源。
  const inviterId: string = uni.getStorageSync('flower-pending-inviter') || ''
  uni.removeStorageSync('flower-pending-inviter')
  grantNewUserCoupon(userId)
  if (!isNew || !inviterId || inviterId === userId) return
  // 已建立关系，重试不会增加次数。
  const records: InviteRecord[] = uni.getStorageSync('flower-invites') || []
  if (records.some((record) => record.id === userId)) return
  // 每次有效注册的一张指定商品兑换奖励券。
  const reward: Coupon = {
    id: `invite-${userId}`,
    type: 'exchange',
    title: '玫瑰鲜花兑换券',
    scope: '玫瑰 · 8支 / 份 · 可兑换1份',
    source: '邀请奖励',
    status: 'available',
    expiresAt: Date.now() + 120 * 3600000,
    productId: 'rose',
    specification: '8支',
    exchangeQuantity: 1,
  }
  // 邀请者现有演示券，保留原状态与有效期。
  const coupons = readCoupons(inviterId).filter((coupon) => !coupon.id.startsWith('new-user-'))
  uni.setStorageSync(`flower-demo-coupons-${inviterId}`, [...coupons, reward])
  uni.setStorageSync('flower-invites', [
    ...records,
    {
      id: userId,
      inviterId,
      name: `${phone.slice(0, 3)}****${phone.slice(-4)}`,
      date: new Date().toLocaleString('zh-CN', { hour12: false }),
      reward: '已发放1张奖励券',
    },
  ])
}
