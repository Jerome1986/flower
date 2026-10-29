import * as api from '@/api/bouquets'
import { mapOrder } from '@/pages/orders/order-data'
import type { CustomSelection, CustomSubmission } from '@/types/integration'
import { positiveId } from '@/utils/order-input'

function selection(input: CustomSelection) {
  if (!positiveId(input.bouquetId) || !positiveId(input.specId))
    throw new Error('花束或规格参数无效，请重新选择')
  return { ...input, bouquetId: Number(input.bouquetId), specId: Number(input.specId) }
}
export async function quoteCustom(input: CustomSelection) {
  const { data } = await api.quoteCustomApi(selection(input))
  return data
}
export async function submitCustom(input: CustomSubmission) {
  const { data } = await api.submitCustomApi({ ...input, ...selection(input) })
  return mapOrder(data)
}
// 前端协议已接通；实际开放状态由后端平台配置、商品上下架决定。
export const customCheckoutEnabled = true
