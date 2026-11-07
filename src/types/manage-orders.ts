import type { OrderResponse } from './order-api'

/** ManageOrdersParams。 */
export interface ManageOrdersParams {
  /** 当前页码 */
  page: number
  /** 每页记录数 */
  pageSize: number
  /** 门店编号 */
  storeId?: number
  /** 订单状态筛选分组 */
  statusGroup?: string
}

/** ManageOrders响应。 */
export interface ManageOrdersResponse {
  /** 当前列表数据 */
  list: OrderResponse[]
  /** 总记录数 */
  total: number
}

/** 管理门店。 */
export interface ManagedStore {
  /** 记录编号 */
  id: number
  /** 名称 */
  name: string
}

/** 订单操作。 */
export interface OrderAction {
  /** 操作动作 */
  action: string
  /** 并发控制版本号 */
  version?: number
  /** 自取核销码 */
  pickupCode?: string
}
