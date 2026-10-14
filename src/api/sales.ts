import { request } from '@/utils/http'
import type { SalesQuery, SalesResponse } from '@/types/sales'

// 获取门店销售统计。
export const getSalesApi = (data: SalesQuery) => {
  return request<SalesResponse>({
    method: 'GET',
    url: '/admin/sales',
    data,
  })
}
