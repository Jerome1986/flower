import type { PreviewOrder } from '../pages/checkout/preview-order'

// 统一读取模拟订单，兼容旧版最近订单。
export function readOrders(): PreviewOrder[] {
  // 本地订单历史。
  const history: PreviewOrder[] = uni.getStorageSync('flower-preview-orders') || []
  // 最近订单快照。
  const latest: PreviewOrder | null = uni.getStorageSync('flower-preview-order') || null
  return latest && !history.some((order) => order.orderNo === latest.orderNo)
    ? [latest, ...history]
    : history
}
// 按编号读取订单，未传编号时读取最近订单。
export function findOrder(orderNo?: string): PreviewOrder | null {
  if (!orderNo) return uni.getStorageSync('flower-preview-order') || null
  return readOrders().find((order) => order.orderNo === orderNo) || null
}
// 保存单笔订单，同时同步最近订单快照。
export function saveOrder(order: PreviewOrder) {
  // 保留其他订单，已有订单原位更新。
  const orders = readOrders()
  uni.setStorageSync(
    'flower-preview-orders',
    orders.some((item) => item.orderNo === order.orderNo)
      ? orders.map((item) => (item.orderNo === order.orderNo ? order : item))
      : [order, ...orders],
  )
  if (findOrder()?.orderNo === order.orderNo) uni.setStorageSync('flower-preview-order', order)
}
// 新订单进入历史和支付结果快照。
export function createOrder(order: PreviewOrder) {
  saveOrder(order)
  uni.setStorageSync('flower-preview-order', order)
}
// 统一普通订单和平台订单的状态名称。
export function orderStatus(order: PreviewOrder) {
  if (order.status === 'completed') return '已完成'
  if (order.status === 'delivering') return '配送中'
  if (order.type === 'custom')
    return order.status === 'preparing' || order.status === 'ready' ? '已派单' : '待派单'
  if (order.status === 'ready') return order.method === 'pickup' ? '待自取' : '待配送'
  return order.status === 'preparing' ? '备货中' : '待接单'
}
// 用户详情标题，按状态逐项判断便于修改。
export function orderTitle(order: PreviewOrder) {
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
  if (order.status === 'completed') return '这份心意已送达，感谢你让鲜花走进日常'
  if (order.status === 'delivering') return '请保持电话畅通，耐心等待鲜花送达'
  if (order.type === 'custom') return '平台将安排合作方制作配送'
  if (order.status === 'ready')
    return order.method === 'pickup'
      ? '请在营业时间内凭取货码到店领取'
      : '花店即将安排配送，请保持电话畅通'
  return order.status === 'preparing'
    ? '每一束心意都在认真准备，请耐心等待'
    : '支付已成功，花店接单后将为你准备鲜花'
}
// 用户和店长共享完整履约步骤。
export function orderStages(order?: PreviewOrder | null) {
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
// 当前订单下一步的操作文案。
export function orderAction(order: PreviewOrder) {
  if (order.type === 'custom' || order.status === 'completed') return ''
  if (order.status === 'delivering') return '配送完成'
  if (order.status === 'ready') return order.method === 'pickup' ? '自取核销' : '开始配送'
  return order.status === 'preparing' ? '备货完成' : '接单'
}
// 完成一次店长操作，读取最新状态并防止重复核销。
export function advanceOrder(
  orderNo: string,
  redemptionStoreId: string,
  onSaved: (order: PreviewOrder) => void,
) {
  // 当前存储中的订单状态。
  const current = findOrder(orderNo)
  if (!current || !orderAction(current)) return
  // 自取完成需要人工输入取货码。
  const pickup = current.status === 'ready' && current.method === 'pickup'
  uni.showModal({
    title: orderAction(current),
    content: pickup ? '' : `确认执行${orderAction(current)}？`,
    editable: pickup,
    placeholderText: pickup ? '请输入用户出示的取货码' : '',
    confirmColor: '#32845b',
    success: (result) => {
      if (!result.confirm) return
      // 弹窗期间其他页面可能修改订单，旧操作不重复执行。
      const latest = findOrder(orderNo)
      if (!latest || latest.status !== current.status)
        return uni.showToast({ title: '订单状态已变化，请刷新', icon: 'none' })
      if (pickup && (!current.pickupCode || result.content?.trim() !== current.pickupCode))
        return uni.showToast({ title: '取货码不正确', icon: 'none' })
      // 下一步履约状态。
      const status: PreviewOrder['status'] =
        !current.status || current.status === 'pending'
          ? 'preparing'
          : current.status === 'preparing'
          ? 'ready'
          : current.status === 'ready' && !pickup
          ? 'delivering'
          : 'completed'
      // 更新后的订单，首次完成时保存实际交付归属。
      const updated: PreviewOrder = { ...current, status }
      if (status === 'ready' && current.method === 'pickup')
        updated.pickupCode = String(Math.floor(100000 + Math.random() * 900000))
      if (status === 'completed') {
        updated.fulfilledAt = current.fulfilledAt || new Date().toISOString()
        updated.redemptionStoreId =
          current.redemptionStoreId || redemptionStoreId || current.storeId
      }
      saveOrder(updated)
      onSaved(updated)
      uni.showToast({ title: '订单状态已更新', icon: 'success' })
    },
  })
}
