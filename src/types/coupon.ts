/** 用户优惠券接口返回数据。 */
export interface CouponItem {
  /** 记录编号 */
  id: number
  /** 业务编码 */
  code: string
  /** 用户编号 */
  userId: number
  /** 优惠券模板编号 */
  templateId: number
  /** 活动编号 */
  activityId: number | null
  /** 邀请关系编号 */
  invitationId: number | null
  /** 数据或奖励来源 */
  source: 'NEW_USER' | 'INVITATION' | 'MANUAL'
  /** 发券幂等键 */
  grantKey: string | null
  /** 名称 */
  name: string
  /** 业务类型 */
  type: 'CASH' | 'EXCHANGE'
  /** 适用范围 */
  scope: 'ALL'
  /** 现金券面额（元） */
  cashAmount: string | null
  /** 兑换商品规格编号 */
  exchangeSpecId: number | null
  /** 兑换份数 */
  exchangeQuantity: number | null
  /** 兑换商品名称 */
  exchangeProductName: string | null
  /** 兑换规格名称 */
  exchangeSpecName: string | null
  /** 活动名称 */
  activityName: string | null
  /** 是否计入赠花活动 */
  isFlowerGift: boolean
  /** 每份赠花报销单价（元） */
  reimbursementPerUnit: string | null
  /** 当前状态 */
  status: 'AVAILABLE' | 'LOCKED' | 'USED' | 'EXPIRED'
  /** 当前占用或使用该券的订单编号 */
  currentOrderId: number | null
  /** 发券时间 */
  issuedAt: string
  /** 失效时间 */
  expiresAt: string
  /** 最近使用时间 */
  usedAt: string | null
  /** 最近更新时间 */
  updatedAt: string
}

/** 优惠券。 */
export interface Coupon {
  /** 记录编号 */
  id: string
  /** 业务类型 */
  type: 'cash' | 'exchange'
  /** 标题 */
  title: string
  /** 金额（元） */
  amount?: number
  /** 适用范围 */
  scope: string
  /** 数据或奖励来源 */
  source: string
  /** 当前状态 */
  status: 'available' | 'locked' | 'used' | 'expired'
  /** 失效时间 */
  expiresAt: number
  /** 兑换商品及规格。 */
  productId?: string
  /** 规格展示名称 */
  specification?: string
  /** 兑换份数 */
  exchangeQuantity?: number
}

/** 优惠券状态。 */
export type CouponStatus = Coupon['status']

/** 新用户优惠券。 */
export interface NewUserCoupon {
  /** 记录编号 */
  id: string
  /** 业务类型 */
  type: 'cash'
  /** 标题 */
  title: string
  /** 金额（元） */
  amount: number
  /** 适用范围 */
  scope: string
  /** 数据或奖励来源 */
  source: string
  /** 当前状态 */
  status: 'available' | 'used'
  /** 失效时间 */
  expiresAt: number
}
