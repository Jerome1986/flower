import { mockStores } from '../pages/index/mock-data'
import { readOrders } from './preview-orders'

// 从初始库存减去已确认普通订单，模拟各门店独立库存。
export function readStock(): Record<string, Record<string, number>> {
  // 每次重新计算，重复读取不会再次扣减。
  const stock: Record<string, Record<string, number>> = {}
  for (const store of mockStores) stock[store.id] = { ...store.stock }
  for (const order of readOrders()) {
    if (order.type === 'custom' || !order.storeId || !order.productId) continue
    // 该订单归属门店的可售库存。
    const storeStock = stock[order.storeId]
    if (storeStock && order.productId in storeStock)
      storeStock[order.productId] = Math.max(0, storeStock[order.productId] - order.quantity)
  }
  return stock
}
