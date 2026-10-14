import { pendingIntegration } from '@/utils/integration'
import type { CouponWallet, InvitationSummary, NewcomerGift } from '@/types/integration'
import type { OrderSelection, OrderSubmission, OrderQuote, OrderResponse } from '@/types/order-api'
import type { Coupon } from '@/types/coupon'
export const getWalletApi = () => {
  return pendingIntegration<CouponWallet>('花礼券')
}
export const getNewcomerGiftApi = () => {
  return pendingIntegration<NewcomerGift>('新人花礼')
}
export const claimNewcomerGiftApi = () => {
  return pendingIntegration<NewcomerGift>('新人花礼')
}
export const getAvailableCouponsApi = (_selection: OrderSelection) => {
  return pendingIntegration<Coupon[]>('订单优惠券')
}
export const getInvitationApi = () => {
  return pendingIntegration<InvitationSummary>('邀请活动')
}
export const bindInvitationApi = (_code: string) => {
  return pendingIntegration<void>('邀请活动')
}
// 含券报价和提交的后端协议待补，不把未确认字段发送给现有接口。
export const quoteCouponOrderApi = (_selection: OrderSelection, _couponId: string) => {
  return pendingIntegration<OrderQuote>('结算用券')
}
export const submitCouponOrderApi = (_input: OrderSubmission, _couponId: string) => {
  return pendingIntegration<OrderResponse>('结算用券')
}
