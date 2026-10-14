import type { SalesPeriod } from './report'
export interface SalesQuery {
  storeId: number
  period: SalesPeriod
}
/** GET /admin/sales 已实现协议：金额为整数分，区间为北京时间对应的 UTC 半开区间。 */
export interface SalesResponse {
  store: { id: number; name: string }
  period: SalesPeriod
  timezone: 'Asia/Shanghai'
  start: string
  end: string
  amount: number
  deliveryAmount: number
  receivedAmount: number
  salesCount: number
  count: number
  pending: number
  completed: number
  average: number
  giftQuantity: number
  giftStems: number | null
  giftUnknownStemsCount: number
  giftAmount: number
  giftExceptionCount: number
  states: { status: string; count: number }[]
}
/** 页面模型：金额转换为元；未知赠花支数保留 null。 */
export interface SalesSummary extends Omit<SalesResponse, 'states'> {
  states: { label: string; count: number }[]
}
