import { request } from '@/utils/http'
import type { OrderResponse } from '@/types/order-api'
import type {
  ManageOrdersParams,
  ManageOrdersResponse,
  ManagedStore,
  OrderAction,
} from '@/types/manage-orders'

// 获取门店管理订单列表。
export const getManageOrdersApi = (params: ManageOrdersParams) => {
  return request<ManageOrdersResponse>({
    method: 'GET',
    url: '/admin/orders',
    data: params,
  })
}

// 获取门店管理订单详情。
export const getManageOrderApi = (orderNo: string) => {
  return request<OrderResponse>({
    method: 'GET',
    url: `/admin/orders/${encodeURIComponent(orderNo)}`,
  })
}

// 获取可管理门店列表。
export const getManagedStoresApi = () => {
  return request<ManagedStore[]>({
    method: 'GET',
    url: '/admin/orders/stores',
  })
}

// 执行订单操作。
export const performOrderActionApi = (orderNo: string, data: OrderAction) => {
  return request<OrderResponse>({
    method: 'POST',
    url: `/admin/orders/${encodeURIComponent(orderNo)}/actions`,
    data,
  })
}
