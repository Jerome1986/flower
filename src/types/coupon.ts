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
}

export type CouponStatus = Coupon['status']

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
