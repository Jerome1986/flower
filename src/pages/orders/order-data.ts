import { cancelOrderApi, getOrderApi, getOrdersApi, submitOrderApi } from '@/api/orders'
import type { PreviewOrder } from '@/types/order'
import type { OrderResponse, OrderSubmission } from '@/types/order-api'
import { resolveApiImage } from '@/utils/http'
export const mapOrder = (order: OrderResponse): PreviewOrder => {
  const items = (order.items?.length ? order.items : order.item ? [order.item] : []).map(
    (item) => ({
      productName: item.productName,
      image: resolveApiImage(item.coverImage),
      specification: item.specName,
      unit: item.unit,
      quantity: item.quantity,
      remark: 'remark' in item ? String(item.remark || '') : '',
      unitPrice:
        'unitPrice' in item && typeof item.unitPrice === 'number'
          ? item.unitPrice / 100
          : undefined,
    }),
  )
  const status: Record<string, PreviewOrder['status']> = {
    PENDING_PAYMENT: 'unpaid',
    PENDING_ACCEPTANCE: 'pending',
    ACCEPTED: 'preparing',
    READY: 'ready',
    PENDING_DISPATCH: 'pending',
    DISPATCHED: 'preparing',
    DELIVERING: 'delivering',
    COMPLETED: 'completed',
    CANCELLING: 'cancelling',
    CANCELLED: 'cancelled',
    CLOSED: 'cancelled',
  }
  return {
    items,
    expiresAt: order.expiresAt,
    version: order.version,
    logs: order.logs,
    orderNo: order.orderNo,
    userId: String(order.userId),
    storeId: String(order.storeId ?? ''),
    type: order.type === 'ORDINARY' ? 'ordinary' : 'custom',
    method: order.method === 'PICKUP' ? 'pickup' : 'delivery',
    status: status[order.status] ?? 'pending',
    backendStatus: order.status,
    paymentStatus: order.paymentStatus,
    productName: items.map((item) => item.productName).join('、'),
    image: items[0]?.image ?? '',
    specification: items[0]?.specification ?? '',
    unit: items[0]?.unit ?? '',
    quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    storeName: order.storeSnapshot?.name || (order.type === 'CUSTOM' ? '平台定制' : ''),
    storeAddress: order.storeSnapshot?.address ?? '',
    storePhone: order.storeSnapshot?.phone ?? order.serviceSnapshot?.servicePhone ?? '',
    hours: order.storeSnapshot?.hours ?? order.serviceSnapshot?.businessHours ?? '',
    contactName: order.contactName,
    phone: order.contactPhone,
    address: order.addressSnapshot?.detail ?? '',
    remark: order.remark ?? '',
    total: order.payableAmount / 100,
    productAmount: order.productAmount / 100,
    discount: order.discountAmount / 100,
    deliveryFee: order.deliveryFee / 100,
    createdAt: order.createdAt,
    pickupCode:
      order.method === 'PICKUP' && order.status === 'READY'
        ? order.pickupCode ?? undefined
        : undefined,
  }
}
export const submitOrder = async (data: OrderSubmission) => {
  const response = await submitOrderApi(data)
  return mapOrder(response.data)
}
export const getOrders = async () => {
  const { data } = await getOrdersApi()
  return data.map(mapOrder)
}
export const getOrder = async (orderNo: string) => {
  const { data } = await getOrderApi(orderNo)
  return mapOrder(data)
}
export const cancelOrder = async (orderNo: string) => {
  const { data } = await cancelOrderApi(orderNo)
  return mapOrder(data)
}
