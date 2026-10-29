/** 用户优惠券接口返回数据。 */
export interface CouponItem {
  id: number
  code: string
  userId: number
  templateId: number
  activityId: number | null
  invitationId: number | null
  source: 'NEW_USER' | 'INVITATION' | 'MANUAL'
  grantKey: string | null
  name: string
  type: 'CASH' | 'EXCHANGE'
  scope: 'ALL'
  cashAmount: string | null
  exchangeSpecId: number | null
  exchangeQuantity: number | null
  exchangeProductName: string | null
  exchangeSpecName: string | null
  activityName: string | null
  isFlowerGift: boolean
  reimbursementPerUnit: string | null
  status: 'AVAILABLE' | 'LOCKED' | 'USED' | 'EXPIRED'
  currentOrderId: number | null
  issuedAt: string
  expiresAt: string
  usedAt: string | null
  updatedAt: string
}

export interface Coupon {
  id: string
  type: 'cash' | 'exchange'
  title: string
  amount?: number
  scope: string
  source: string
  status: 'available' | 'locked' | 'used' | 'expired'
  expiresAt: number
  // 兑换商品及规格。
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
