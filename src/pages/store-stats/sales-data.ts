import type { PreviewOrder } from '../checkout/preview-order'
export { readOrders as readSalesOrders } from '../../services/preview-orders'

// 销售统计支持的时间范围。
export type SalesPeriod = 'today' | 'week' | 'month'
// 兼容本地中文日期和新增核销时间的标准格式。
function orderTime(value: string) {
  return new Date(
    value.includes('T')
      ? value
      : value.replace(/年|月/g, '/').replace(/日/g, '').replace(/-/g, '/'),
  ).getTime()
}
// 按本店和自然日筛选，销售额不包含配送费。
export function summarizeSales(
  orders: PreviewOrder[],
  storeId: string,
  period: SalesPeriod,
  now = new Date(),
) {
  // 当前日期零点。
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // 所选范围起始时间。
  const start =
    period === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(today.getTime() - (period === 'week' ? 6 : 0) * 86400000)
  // 本店在所选时间内的普通订单。
  const matching = orders.filter((order) => {
    // 兼容现有中文日期和标准日期格式。
    const time = orderTime(order.createdAt)
    return (
      order.type !== 'custom' &&
      order.storeId === storeId &&
      time >= start.getTime() &&
      time <= now.getTime()
    )
  })
  // 已支付商品实付金额，排除配送费。
  const amount = matching.reduce(
    (sum, order) => sum + Math.max(0, order.total - order.deliveryFee),
    0,
  )
  // 已履约完成的订单数量。
  const completed = matching.filter((order) => order.status === 'completed').length
  // 赠送按实际核销门店与完成时间统计，不从零元订单推断券类型。
  const gifts = orders.filter((order) => {
    // 实际完成兑换的时间，旧订单回退到下单日期。
    const time = orderTime(order.fulfilledAt || order.createdAt)
    return (
      order.type !== 'custom' &&
      order.couponType === 'exchange' &&
      order.status === 'completed' &&
      (order.redemptionStoreId || order.storeId) === storeId &&
      time >= start.getTime() &&
      time <= now.getTime()
    )
  })
  // 已核销赠送份数，当前每张兑换券赠送一份。
  const giftQuantity = gifts.reduce((sum, order) => sum + (order.giftQuantity || 1), 0)
  // 赠送价值按兑换时商品抵扣金额计算。
  const giftAmount = gifts.reduce((sum, order) => sum + (order.giftAmount ?? order.discount), 0)
  // 赠送支数由兑换份数乘以每份支数，额外付费数量不计入。
  const giftStems = gifts.reduce(
    (sum, order) =>
      sum +
      (order.giftQuantity || 1) *
        (order.stemsPerUnit ?? (Number(order.specification?.match(/(\d+)\s*支/)?.[1]) || 0)),
    0,
  )
  return {
    amount,
    giftQuantity,
    giftStems,
    giftAmount,
    count: matching.length,
    completed,
    pending: matching.length - completed,
    average: matching.length ? amount / matching.length : 0,
    states: [
      {
        label: '待接单',
        count: matching.filter((order) => !order.status || order.status === 'pending').length,
      },
      { label: '备货中', count: matching.filter((order) => order.status === 'preparing').length },
      {
        label: '待自取 / 配送',
        count: matching.filter((order) => order.status === 'ready').length,
      },
      { label: '配送中', count: matching.filter((order) => order.status === 'delivering').length },
      { label: '已完成', count: completed },
    ],
  }
}
