import { getSalesApi } from '@/api/sales'
import type { SalesQuery, SalesSummary } from '@/types/sales'
const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: '待付款',
  PENDING_ACCEPTANCE: '待接单',
  ACCEPTED: '备货中',
  READY: '待自取或配送',
  PENDING_DISPATCH: '待派单',
  DISPATCHED: '已派单',
  DELIVERING: '配送中',
  COMPLETED: '已完成',
  CANCELLING: '取消中',
  CANCELLED: '已取消',
  CLOSED: '已关闭',
}
export async function getSales(query: SalesQuery): Promise<SalesSummary> {
  if (
    !Number.isSafeInteger(query.storeId) ||
    query.storeId < 1 ||
    query.storeId > 2147483647 ||
    !['today', 'week', 'month'].includes(query.period)
  ) {
    throw new Error('统计筛选无效，请重新选择门店和时间')
  }
  const { data } = await getSalesApi(query)
  return {
    ...data,
    amount: data.amount / 100,
    deliveryAmount: data.deliveryAmount / 100,
    receivedAmount: data.receivedAmount / 100,
    average: data.average / 100,
    giftAmount: data.giftAmount / 100,
    states: data.states.map((state) => ({
      label: statusLabels[state.status] || '其他状态',
      count: state.count,
    })),
  }
}
