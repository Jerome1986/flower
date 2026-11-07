import * as api from '@/api/bouquets'
import { mapOrder } from '@/pages/orders/order-data'
import type { CustomSelection, CustomSubmission } from '@/types/integration'
import { positiveId, positiveQuantity } from '@/utils/order-input'

const selection = (input: CustomSelection) => {
  if (!positiveId(input.bouquetId) || !positiveId(input.specId))
    throw new Error('花束或规格参数无效，请重新选择')
  if (!positiveQuantity(input.quantity) || input.quantity > 999)
    throw new Error('单笔购买数量须为1至999')
  if (!input.address.trim()) throw new Error('请填写配送地址')
  return { ...input, bouquetId: Number(input.bouquetId), specId: Number(input.specId) }
}
export const quoteCustom = async (input: CustomSelection) => {
  const { data } = await api.quoteCustomApi(selection(input))
  return data
}
export const submitCustom = async (input: CustomSubmission) => {
  const { data } = await api.submitCustomApi({ ...input, ...selection(input) })
  return mapOrder(data)
}
// 按当前规格、数量及地址查询可用券。
export const getCustomCoupons = async (input: CustomSelection) => {
  const { couponId: _couponId, ...data } = selection(input)
  const { data: coupons } = await api.getCustomCouponsApi(data)
  return coupons
}
// 前端协议已接通；实际开放状态由后端平台配置、商品上下架决定。
export const customCheckoutEnabled = true
