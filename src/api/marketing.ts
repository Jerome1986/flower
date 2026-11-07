import { request } from '@/utils/http'
import type { InvitationSummary, NewcomerGift } from '@/types/integration'
import type {
  OrderSelection,
  OrderSubmission,
  OrderQuote,
  OrderResponse,
  CartOrderSelection,
} from '@/types/order-api'
import type { CouponItem } from '@/types/coupon'
/** 查询当前登录用户的新人资格和已领取花礼券。 */
export const getNewcomerGiftApi = () => {
  // 1. 用户身份由请求工具自动携带的登录令牌确定。
  return request<NewcomerGift>({
    method: 'GET',
    url: '/marketing-activities/new-user-gift/status',
  })
}
/** 主动领取新人花礼，由后端重新校验资格并防止重复发券。 */
export const claimNewcomerGiftApi = () => {
  // 1. 不传用户或资格信息，使用服务端的最新校验结果。
  return request<NewcomerGift>({
    method: 'POST',
    url: '/marketing-activities/new-user-gift/claim',
  })
}
export const getAvailableCouponsApi = (selection: OrderSelection | CartOrderSelection) => {
  return request<CouponItem[]>({
    method: 'POST',
    url: '/user/orders/available-coupons',
    data: selection,
  })
}
/** 获取当前用户的邀请码、邀请记录和奖励规则。 */
export const getInvitationApi = () => {
  return request<InvitationSummary>({
    method: 'GET',
    url: '/user/invitations',
  })
}
/** 普通订单沿用统一报价/创建接口，优惠由服务端计算。 */
export const quoteCouponOrderApi = (selection: OrderSelection, couponId: string) => {
  return request<OrderQuote>({
    method: 'POST',
    url: '/user/orders/quote',
    data: { ...selection, couponId: Number(couponId) },
  })
}
export const submitCouponOrderApi = (input: OrderSubmission, couponId: string) => {
  return request<OrderResponse>({
    method: 'POST',
    url: '/user/orders',
    data: { ...input, couponId: Number(couponId) },
  })
}
