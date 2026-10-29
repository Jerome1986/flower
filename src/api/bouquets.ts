import { request } from '@/utils/http'
import type { BouquetResponse, BouquetSelection, BouquetSubmission } from '@/types/bouquet'
import type { OrderQuote, OrderResponse } from '@/types/order-api'

// 获取平台上架的成品花束。
export const getBouquetsApi = () => {
  return request<BouquetResponse[]>({
    method: 'GET',
    url: '/shop/bouquets',
  })
}

// 获取成品花束详情与平台配送信息。
export const getBouquetApi = (id: string) => {
  return request<BouquetResponse>({
    method: 'GET',
    url: `/shop/bouquets/${encodeURIComponent(id)}`,
  })
}

// 获取定制花束订单报价。
export const quoteCustomApi = (data: BouquetSelection) => {
  return request<OrderQuote>({
    method: 'POST',
    url: '/user/custom-orders/quote',
    data,
  })
}

// 创建平台配送的定制订单。
export const submitCustomApi = (data: BouquetSubmission) => {
  return request<OrderResponse>({
    method: 'POST',
    url: '/user/custom-orders',
    data,
  })
}
