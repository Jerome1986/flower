import { quoteCouponOrderApi, submitCouponOrderApi } from '@/api/marketing'
import { quoteOrderApi as quoteOrder } from '@/api/orders'
import { couponCheckoutEnabled } from '@/pages/checkout/coupon-config'
import { mapOrder, submitOrder } from '@/pages/orders/order-data'
import type { OrderSelection, OrderSubmission } from '@/types/order-api'
import { pendingIntegration } from '@/utils/integration'
// 根据是否使用优惠券选择订单报价接口。
export const quoteCheckout = async (input: OrderSelection, couponId = '') => {
  if (!couponId) return quoteOrder(input)
  if (!couponCheckoutEnabled)
    return pendingIntegration<Awaited<ReturnType<typeof quoteOrder>>>('结算用券')
  return quoteCouponOrderApi(input, couponId)
}
// 根据是否使用优惠券选择下单接口，并统一订单数据。
export const submitCheckout = async (input: OrderSubmission, couponId = '') => {
  if (!couponId) return submitOrder(input)
  if (!couponCheckoutEnabled)
    return pendingIntegration<Awaited<ReturnType<typeof submitOrder>>>('结算用券')
  return mapOrder((await submitCouponOrderApi(input, couponId)).data)
}
