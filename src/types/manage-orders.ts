import type { OrderResponse } from './order-api'

export interface ManageOrdersParams {
  page: number
  pageSize: number
  storeId?: number
  statusGroup?: string
}

export interface ManageOrdersResponse {
  list: OrderResponse[]
  total: number
}

export interface ManagedStore {
  id: number
  name: string
}

export interface OrderAction {
  action: string
  version?: number
  pickupCode?: string
}
