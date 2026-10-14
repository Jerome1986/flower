import { submitOrderApi, getOrdersApi, getOrderApi, cancelOrderApi } from '@/api/orders'
import { resolveApiImage } from '@/utils/http'
import type { PreviewOrder } from '@/types/order'
import type { OrderResponse, OrderSubmission } from '@/types/order-api'

export function mapOrder(order: OrderResponse): PreviewOrder {
  const status: Record<string, PreviewOrder['status']> = {
    PENDING_PAYMENT: 'unpaid',
    PENDING_ACCEPTANCE: 'pending',
    ACCEPTED: 'preparing',
    READY: 'ready',
    DELIVERING: 'delivering',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    CLOSED: 'cancelled',
  }
  return {
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
    productName: order.item?.productName ?? '',
    image: resolveApiImage(order.item?.coverImage ?? ''),
    specification: order.item?.specName ?? '',
    unit: order.item?.unit ?? '',
    quantity: order.item?.quantity ?? 0,
    storeName: order.storeSnapshot?.name ?? '',
    storeAddress: order.storeSnapshot?.address ?? '',
    storePhone: order.storeSnapshot?.phone ?? '',
    hours: order.storeSnapshot?.hours ?? '',
    contactName: order.contactName,
    phone: order.contactPhone,
    address: order.addressSnapshot?.detail ?? '',
    remark: order.remark ?? '',
    total: order.payableAmount / 100,
    productAmount: order.productAmount / 100,
    discount: order.discountAmount / 100,
    deliveryFee: order.deliveryFee / 100,
    createdAt: order.createdAt,
    pickupCode: order.pickupCode ?? undefined,
  }
}
export async function submitOrder(data: OrderSubmission) {
  const response = await submitOrderApi(data)
  return mapOrder(response.data)
}
export async function getOrders() {
  const { data } = await getOrdersApi()
  return data.map(mapOrder)
}
export async function getOrder(orderNo: string) {
  const { data } = await getOrderApi(orderNo)
  return mapOrder(data)
}
export async function cancelOrder(orderNo: string) {
  const { data } = await cancelOrderApi(orderNo)
  return mapOrder(data)
}
