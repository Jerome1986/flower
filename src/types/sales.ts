import type { SalesPeriod } from './report'
/** 销售查询参数。 */
export interface SalesQuery {
  /** 门店编号 */
  storeId: number
  /** 统计周期 */
  period: SalesPeriod
}
/** GET /admin/sales 已实现协议：金额为整数分，区间为北京时间对应的 UTC 半开区间。 */
export interface SalesResponse {
  /** 门店信息 */
  store: {
    /** 记录编号 */
    id: number
    /** 名称 */
    name: string
  }
  /** 统计周期 */
  period: SalesPeriod
  /** 统计使用的时区 */
  timezone: 'Asia/Shanghai'
  /** 统计开始时间 */
  start: string
  /** 统计结束时间 */
  end: string
  /** 金额（分） */
  amount: number
  /** 配送费金额（分） */
  deliveryAmount: number
  /** 实收金额（分） */
  receivedAmount: number
  /** 销售订单数 */
  salesCount: number
  /** 数量 */
  count: number
  /** 待处理数量 */
  pending: number
  /** 已完成数量 */
  completed: number
  /** 平均金额（分） */
  average: number
  /** 赠花份数 */
  giftQuantity: number
  /** 赠花支数，无法确定时为空 */
  giftStems: number | null
  /** 无法确定赠花支数的订单数 */
  giftUnknownStemsCount: number
  /** 赠花金额（分） */
  giftAmount: number
  /** 赠花异常订单数 */
  giftExceptionCount: number
  /** 各状态数量列表 */
  states: {
    /** 当前状态 */
    status: string
    /** 数量 */
    count: number
  }[]
}
/** 页面模型：金额转换为元；未知赠花支数保留 null。 */
export interface SalesSummary extends Omit<SalesResponse, 'states'> {
  /** 各状态数量列表 */
  states: {
    /** 展示文案 */
    label: string
    /** 数量 */
    count: number
  }[]
}
