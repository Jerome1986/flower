export type { SalesQuery, SalesSummary } from './sales'
export type { AddressInput } from './address'
import type { Coupon } from './coupon'
import type { InviteRecord } from './invite'
import type { FlowerProduct } from './product'
import type { OrderQuote } from './order-api'

/** 以下为前端需求模型，不是已确认的后端请求/响应协议。金额注明单位。 */
export interface CouponWallet {
  coupons: Coupon[]
  rules: string
}
export interface NewcomerGift {
  coupon: Coupon | null
  claimable: boolean
  description: string
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
export interface Bouquet extends FlowerProduct {
  images: string[]
  deliveryArea: string
  deliveryFee: number
  specs: { id: string; name: string; unit: string; price: number; available: number }[]
}
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
