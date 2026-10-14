import { pendingIntegration } from '@/utils/integration'
import type { Bouquet, CustomSelection, CustomSubmission, CustomQuote } from '@/types/integration'
import type { OrderResponse } from '@/types/order-api'
export const getBouquetsApi = () => {
  return pendingIntegration<Bouquet[]>('成品花束')
}
export const getBouquetApi = (_id: string) => {
  return pendingIntegration<Bouquet>('成品花束')
}
export const quoteCustomApi = (_selection: CustomSelection) => {
  return pendingIntegration<CustomQuote>('花束下单')
}
export const submitCustomApi = (_input: CustomSubmission) => {
  return pendingIntegration<OrderResponse>('花束下单')
}
