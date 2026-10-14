import { quoteOrderApi as quoteOrder } from '@/api/orders'
import { submitOrder, mapOrder } from '@/pages/orders/order-data'
import { quoteCouponOrderApi, submitCouponOrderApi } from '@/api/marketing'
import { couponCheckoutEnabled } from '@/pages/checkout/coupon-config'
import { pendingIntegration } from '@/utils/integration'
import type { OrderSelection, OrderSubmission } from '@/types/order-api'
export async function quoteCheckout(input: OrderSelection, couponId = '') {
  if (!couponId) return quoteOrder(input)
  if (!couponCheckoutEnabled)
    return pendingIntegration<Awaited<ReturnType<typeof quoteOrder>>>('结算用券')
  return { data: await quoteCouponOrderApi(input, couponId) }
}
export async function submitCheckout(input: OrderSubmission, couponId = '') {
  if (!couponId) return submitOrder(input)
  if (!couponCheckoutEnabled)
    return pendingIntegration<Awaited<ReturnType<typeof submitOrder>>>('结算用券')
  return mapOrder(await submitCouponOrderApi(input, couponId))
}
