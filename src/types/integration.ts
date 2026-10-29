export type { SalesQuery, SalesSummary } from './sales'
export type { AddressInput } from './address'
import type { Coupon, CouponItem } from './coupon'
import type { InviteRecord } from './invite'
import type { OrderQuote } from './order-api'

/** 以下为前端需求模型，不是已确认的后端请求/响应协议。金额注明单位。 */
export interface CouponWallet {
  coupons: Coupon[]
  rules: string
}
/** 新人花礼状态，与后端查询和领取接口保持一致。 */
export interface NewcomerGift {
  activity: { id: number; name: string } | null
  activityAvailable: boolean
  eligible: boolean
  claimDeadline: string
  claimed: boolean
  canClaim: boolean
  reasonCode: string | null
  reason: string | null
  coupon: CouponItem | null
  newlyClaimed?: boolean
}
export interface InvitationSummary {
  code: string
  shareTitle: string
  sharePath: string
  shareImage?: string
  rules: string
  invitedCount: number
  rewardCount: number
  records: InviteRecord[]
}
export type { Bouquet } from './bouquet'
export interface CustomSelection {
  bouquetId: string
  specId: string
  quantity: number
  address: string
}
export interface CustomSubmission extends CustomSelection {
  requestKey: string
  contactName: string
  contactPhone: string
  remark: string
  expectedAmount: number
}
export type CustomQuote = OrderQuote // 金额为分，与普通订单报价一致。

export interface CouponOrderInput {
  couponId: string
}
