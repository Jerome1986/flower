import { getNewUserCoupon } from './new-user-coupon'

// 卡包与订单共用的本地演示券。
export interface Coupon {
  id: string
  type: 'cash' | 'exchange'
  title: string
  amount?: number
  scope: string
  source: string
  status: 'available' | 'locked' | 'used' | 'expired'
  expiresAt: number
  // 兑换商品及规格，旧演示券缺失时兼容玫瑰8支。
  productId?: string
  specification?: string
  exchangeQuantity?: number
  // 券适用的商品类别，默认门店散花。
  productType?: 'A' | 'B'
}

// 读取演示券，并合并当前用户真实领取的模拟新人券。
export function readCoupons(userId?: string): Coupon[] {
  if (!userId) return []
  // 本地已初始化的演示卡包。
  let saved: Coupon[] = uni.getStorageSync(`flower-demo-coupons-${userId}`) || []
  if (!saved.length && userId === 'test-user')
    saved = uni.getStorageSync('flower-demo-coupons') || []
  if (!saved.length) {
    // 卡包和结算共用的固定演示券，初始化后不重置日期。
    const createdAt = Date.now()
    saved = [
      {
        id: 'invite',
        type: 'exchange',
        title: '玫瑰鲜花兑换券',
        scope: '玫瑰 · 8支 / 份 · 可兑换1份',
        source: '邀请奖励',
        status: 'available',
        expiresAt: createdAt + 3 * 86400000,
      },
      {
        id: 'locked',
        type: 'cash',
        title: '邀请花礼券',
        amount: 10,
        scope: '门店散花可用',
        source: '邀请奖励',
        status: 'locked',
        expiresAt: createdAt + 2 * 86400000,
      },
      {
        id: 'used',
        type: 'exchange',
        title: '郁金香鲜花兑换券',
        scope: '郁金香 · 5支 / 份 · 可兑换1份',
        source: '演示已使用券',
        status: 'used',
        expiresAt: createdAt + 86400000,
      },
      {
        id: 'expired',
        type: 'cash',
        title: '邀请花礼券',
        amount: 10,
        scope: '门店散花可用',
        source: '邀请奖励',
        status: 'expired',
        expiresAt: createdAt - 86400000,
      },
    ]
  }
  uni.setStorageSync(`flower-demo-coupons-${userId}`, saved)
  // 按账户查询发放的新人券。
  const newcomer = userId ? getNewUserCoupon(userId) : null
  return [...(newcomer ? [newcomer] : []), ...saved.filter((coupon) => coupon.id !== 'new-user')]
}

// 按类型、商品规格、数量和有效期说明不可用原因。
export function couponReason(
  coupon: Coupon,
  productId: string,
  specification: string,
  quantity: number,
  custom: boolean,
): string {
  if (coupon.status !== 'available') return '优惠券已使用或被占用'
  if (coupon.expiresAt <= Date.now()) return '优惠券已过期'
  if ((coupon.productType || 'A') !== (custom ? 'B' : 'A')) return '不适用于当前商品类别'
  if (
    coupon.type === 'exchange' &&
    (productId !== (coupon.productId || 'rose') ||
      specification.replace(/\s/g, '') !== (coupon.specification || '8支').replace(/\s/g, ''))
  )
    return '商品或规格与兑换券不符'
  if (coupon.type === 'exchange' && quantity < (coupon.exchangeQuantity || 1))
    return '购买数量不足兑换份数'
  return ''
}

// 模拟支付成功后将券标记为已使用。
export function markCouponUsed(coupon: Coupon, userId?: string) {
  if (!userId) return
  if (userId && coupon.id === `new-user-${userId}`) {
    uni.setStorageSync(`flower-new-user-coupon-${userId}`, { ...coupon, status: 'used' })
    return
  }
  // 需要更新的演示卡包。
  const saved: Coupon[] = uni.getStorageSync(`flower-demo-coupons-${userId}`) || []
  uni.setStorageSync(
    `flower-demo-coupons-${userId}`,
    saved.map((item) => (item.id === coupon.id ? { ...item, status: 'used' } : item)),
  )
}
