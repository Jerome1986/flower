import type { PayResult, PaymentSubmission } from '@/types/api-payment'
import { request } from '@/utils/http'
export type { PayResult, PaymentSubmission } from '@/types/api-payment'
/** 创建订单并获取微信支付签名参数，与旧项目的统一支付路径一致。 */
export const commonPayApi = (data: PaymentSubmission) =>
  request<PayResult>({ method: 'POST', url: '/pay/commonPay', data })
/** 已创建订单重新获取支付参数，避免取消支付后重复下单。 */
export const orderPayApi = (orderId: string, openid: string) =>
  request<PayResult>({ method: 'POST', url: '/pay/orderPay', data: { orderId, openid } })
/** 零元订单沿用旧项目的独立接口和 params 包装，不调起微信支付。 */
export const createOrderFreeApi = (params: PaymentSubmission) =>
  request<{
    orderId: string
  }>({ method: 'POST', url: '/order/createOrderFree', data: { params } })
