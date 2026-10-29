import { pendingIntegration } from '@/utils/integration'
import { request } from '@/utils/http'
import type { InvitationSummary, NewcomerGift } from '@/types/integration'
import type { OrderSelection, OrderSubmission, OrderQuote, OrderResponse } from '@/types/order-api'
import type { Coupon } from '@/types/coupon'
// 查询当前登录用户的新人资格和已领取花礼券。
export const getNewcomerGiftApi = () => {
  // 1. 用户身份由请求工具自动携带的登录令牌确定。
  return request<NewcomerGift>({
    method: 'GET',
    url: '/marketing-activities/new-user-gift/status',
  })
}
// 主动领取新人花礼，由后端重新校验资格并防止重复发券。
export const claimNewcomerGiftApi = () => {
  // 1. 不传用户或资格信息，使用服务端的最新校验结果。
  return request<NewcomerGift>({
    method: 'POST',
    url: '/marketing-activities/new-user-gift/claim',
  })
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
