// 模拟新人券的展示数据。
export interface NewUserCoupon {
  id: string
  type: 'cash'
  title: string
  amount: number
  scope: string
  source: string
  status: 'available' | 'used'
  expiresAt: number
}

// 查询当前模拟用户已领取的新人券，过期后也保留领取记录。
export function getNewUserCoupon(userId: string): NewUserCoupon | null {
  return uni.getStorageSync(`flower-new-user-coupon-${userId}`) || null
}

// 首次模拟注册发新人券，重复调用保留原券与有效期。
export function grantNewUserCoupon(userId: string): NewUserCoupon {
  // 当前账户已发放的新人券。
  const existing = getNewUserCoupon(userId)
  if (existing) return existing
  // 发放后连续120小时有效的模拟现金券。
  const coupon: NewUserCoupon = { id: `new-user-${userId}`, type: 'cash', title: '新人花礼券', amount: 10, scope: '门店散花可用', source: '新人花礼', status: 'available', expiresAt: Date.now() + 120 * 3600000 }
  uni.setStorageSync(`flower-new-user-coupon-${userId}`, coupon)
  return coupon
}
