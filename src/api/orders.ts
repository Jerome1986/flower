import { request } from '@/utils/http'
import type { OrderSelection, OrderQuote, OrderSubmission, OrderResponse } from '@/types/order-api'

// 获取订单报价。
export const quoteOrderApi = (data: OrderSelection) => {
  return request<OrderQuote>({
    method: 'POST',
    url: '/user/orders/quote',
    data,
  })
}

// 创建普通订单。
export const submitOrderApi = (data: OrderSubmission) => {
  return request<OrderResponse>({
    method: 'POST',
    url: '/user/orders',
    data,
  })
}

// 获取用户订单列表。
export const getOrdersApi = () => {
  return request<OrderResponse[]>({
    method: 'GET',
    url: '/user/orders',
  })
}

// 获取订单详情。
export const getOrderApi = (orderNo: string) => {
  return request<OrderResponse>({
    method: 'GET',
    url: `/user/orders/${encodeURIComponent(orderNo)}`,
  })
}

// 取消订单。
export const cancelOrderApi = (orderNo: string) => {
  return request<OrderResponse>({
    method: 'POST',
    url: `/user/orders/${encodeURIComponent(orderNo)}/cancel`,
  })
}
