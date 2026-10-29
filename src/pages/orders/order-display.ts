import type { PreviewOrder } from '@/types/order'
// 统一普通订单和平台订单的状态名称。
export function orderStatus(order: PreviewOrder) {
  if (order.status === 'unpaid') return '已下单 · 未付款'
  if (order.status === 'cancelled') return order.backendStatus === 'CLOSED' ? '已关闭' : '已取消'
  if (order.status === 'completed') return '已完成'
  if (order.status === 'delivering') return '配送中'
  if (order.type === 'custom')
    return order.status === 'preparing' || order.status === 'ready' ? '已派单' : '待派单'
  if (order.status === 'ready') return order.method === 'pickup' ? '待自取' : '待配送'
  return order.status === 'preparing' ? '备货中' : '待接单'
}
// 用户详情标题，按状态逐项判断便于修改。
export function orderTitle(order: PreviewOrder) {
  if (order.status === 'unpaid') return '订单已创建'
  if (order.status === 'cancelled')
    return order.backendStatus === 'CLOSED' ? '订单已关闭' : '订单已取消'
  if (order.status === 'completed') return '鲜花订单已完成'
  if (order.status === 'delivering') return '鲜花正在配送'
  if (order.type === 'custom')
    return orderStatus(order) === '待派单' ? '等待平台派单' : '平台已安排制作配送'
  if (order.status === 'ready')
    return order.method === 'pickup' ? '鲜花已备好，等你来取' : '鲜花已备好，等待配送'
  return order.status === 'preparing' ? '花店正在准备鲜花' : '等待花店接单'
}
// 订单列表与详情共用履约提示。
export function orderHint(order: PreviewOrder) {
  if (order.status === 'unpaid') return '订单尚未付款'
  if (order.status === 'cancelled')
    return order.type === 'custom' ? '订单已结束' : '订单已结束，预留库存已释放'
  if (order.status === 'completed') return '这份心意已送达，感谢你让鲜花走进日常'
  if (order.status === 'delivering') return '请保持电话畅通，耐心等待鲜花送达'
  if (order.type === 'custom') return '平台将安排合作方制作配送'
  if (order.status === 'ready')
    return order.method === 'pickup'
      ? '请在营业时间内凭取货码到店领取'
      : '花店即将安排配送，请保持电话畅通'
  return order.status === 'preparing'
    ? '每一束心意都在认真准备，请耐心等待'
    : '门店已收到订单，将为你准备鲜花'
}
export function orderPaymentLabel(order: PreviewOrder) {
  if (order.paymentStatus === 'PAID') return '已付款'
  if (order.paymentStatus === 'NOT_REQUIRED')
    return order.total > 0 ? '未付款' : '0元订单，无需付款'
  if (order.paymentStatus === 'CLOSED') return '未付款 · 已关闭'
  return '未付款'
}
// 用户和店长共享完整履约步骤。
export function orderStages(order?: PreviewOrder | null) {
  if (order?.status === 'unpaid') return ['已下单', '未付款']
  if (order?.status === 'cancelled') return [order.backendStatus === 'CLOSED' ? '已关闭' : '已取消']
  if (order?.type === 'custom') return ['待派单', '已派单', '配送中', '已完成']
  return order?.method === 'delivery'
    ? ['待接单', '备货中', '待配送', '配送中', '已完成']
    : ['待接单', '备货中', '待自取', '已完成']
}
// 根据状态取得当前进度，避免页面各自推算。
export function orderStageIndex(order?: PreviewOrder | null) {
  if (!order) return 0
  return Math.max(0, orderStages(order).indexOf(orderStatus(order)))
}
