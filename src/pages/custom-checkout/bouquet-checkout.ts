import * as api from '@/api/bouquets'
import { mapOrder } from '@/pages/orders/order-data'
import type { CustomSubmission } from '@/types/integration'
export const submitCustom = async (input: CustomSubmission) =>
  mapOrder(await api.submitCustomApi(input))
// 商品、报价、提交及用户订单读取联调全部通过后开启。
export const customCheckoutEnabled = false
