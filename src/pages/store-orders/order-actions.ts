import { getManageOrderApi, getManageOrdersApi, performOrderActionApi } from '@/api/manage-orders'
import { mapOrder } from '@/pages/orders/order-data'
import { useUserStore } from '@/stores/modules/user'
import type { ManageOrdersParams } from '@/types/manage-orders'
import type { PreviewOrder } from '@/types/order'
export const orderActionLabels: Record<string, string> = {
  CREATE: '创建订单',
  CANCEL: '取消订单',
  CANCEL_REQUEST: '申请取消',
  PAY: '支付成功',
  REFUND: '退款成功',
  EXPIRE: '超时关闭',
  accept: '接单',
  ready: '备货完成',
  deliver: '开始配送',
  complete: '交付完成',
}
export const getManageOrders = async (params: ManageOrdersParams) => {
  const { data } = await getManageOrdersApi({
    page: params.page,
    pageSize: params.pageSize,
    ...(params.storeId !== undefined ? { storeId: params.storeId } : {}),
    ...(params.statusGroup !== undefined ? { statusGroup: params.statusGroup } : {}),
  })
  return { list: data.list.map(mapOrder), total: data.total }
}
export const getManageOrder = async (no: string) => {
  const { data } = await getManageOrderApi(no)
  return mapOrder(data)
}
export const manageAction = (order: PreviewOrder) => {
  if (order.type === 'custom' || order.backendStatus === 'CANCELLING') return undefined
  if (!['PAID', 'NOT_REQUIRED'].includes(order.paymentStatus || '')) return undefined
  if (order.status === 'pending') return { action: 'accept', label: '接单' }
  if (order.status === 'preparing') return { action: 'ready', label: '备货完成' }
  if (order.status === 'ready')
    return order.method === 'pickup'
      ? { action: 'complete', label: '输入取货码核销' }
      : { action: 'deliver', label: '开始配送' }
  if (order.status === 'delivering') return { action: 'complete', label: '配送完成' }
  return undefined
}
export const performAction = (
  order: PreviewOrder,
  cancel = false,
): Promise<PreviewOrder | undefined> => {
  if (order.type === 'custom') return Promise.resolve(undefined)
  const token = useUserStore().token
  const next = cancel ? { action: 'cancel', label: '取消订单' } : manageAction(order)
  if (!next) return Promise.resolve(undefined)
  return new Promise((resolve) => {
    const pickup = next.action === 'complete' && order.method === 'pickup'
    uni.showModal({
      title: next.label,
      content: pickup ? '' : '确认执行' + next.label + '？',
      editable: pickup,
      placeholderText: '请输入客户出示的6位取货码',
      success: async (result) => {
        if (!result.confirm || token !== useUserStore().token) return resolve(undefined)
        if (pickup && !/^\d{6}$/.test(result.content?.trim() || '')) {
          uni.showToast({ title: '请输入6位数字取货码', icon: 'none' })
          return resolve(undefined)
        }
        try {
          const { data } = await performOrderActionApi(order.orderNo, {
            action: next.action,
            version: order.version,
            ...(pickup ? { pickupCode: result.content?.trim() || '' } : {}),
          })
          resolve(mapOrder(data))
        } catch {
          resolve(undefined)
        }
      },
      fail: () => resolve(undefined),
    })
  })
}
