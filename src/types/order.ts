/** 页面展示订单。 */
export interface PreviewOrder {
  /** 商品或数据明细列表 */
  items?: {
    /** 商品名称 */
    productName: string
    /** 图片地址 */
    image: string
    /** 规格展示名称 */
    specification: string
    /** 计量单位 */
    unit: string
    /** 商品份数 */
    quantity: number
    /** 备注 */
    remark: string
    /** 商品单价（元） */
    unitPrice?: number
  }[]
  /** 失效时间 */
  expiresAt?: string
  /** 业务类型 */
  type?: 'ordinary' | 'custom'
  /** 门店编号 */
  storeId?: string
  /** 用户编号 */
  userId?: string
  /** 当前状态 */
  status?:
    | 'pending'
    | 'preparing'
    | 'ready'
    | 'delivering'
    | 'completed'
    | 'unpaid'
    | 'cancelling'
    | 'cancelled'
  /** 服务端订单原始状态 */
  backendStatus?: string
  /** 支付状态 */
  paymentStatus?: string
  /** 并发控制版本号 */
  version?: number
  /** 操作日志列表 */
  logs?: {
    /** 操作动作 */
    action: string
    /** 创建时间 */
    createdAt: string
    /** 备注 */
    remark?: string | null
  }[]
  /** 自取核销码 */
  pickupCode?: string
  /** 下单时保存券类型，便于区分兑花与现金抵扣。 */
  couponType?: 'cash' | 'exchange'
  /** 优惠券快照保留名称及规则，后续改券不影响订单。 */
  couponId?: string
  /** 优惠券名称快照 */
  couponTitle?: string
  /** 每份花材支数，按规格保存用于赠花数量核对。 */
  stemsPerUnit?: number
  /** 兑换券赠送的商品金额。 */
  giftAmount?: number
  /** 兑换券赠送的份数。 */
  giftQuantity?: number
  /** 完成核销或配送的时间，用于赠送花礼归属统计。 */
  fulfilledAt?: string
  /** 实际完成核销的门店，赠送花礼按此归属。 */
  redemptionStoreId?: string
  /** 业务订单编号 */
  orderNo: string
  /** 商品名称 */
  productName: string
  /** 商品标识用于模拟门店库存，旧快照可为空。 */
  productId?: string
  /** 图片地址 */
  image: string
  /** 规格展示名称 */
  specification: string
  /** 计量单位 */
  unit: string
  /** 商品份数 */
  quantity: number
  /** 门店名称 */
  storeName: string
  /** 门店地址 */
  storeAddress: string
  /** 营业时间 */
  hours: string
  /** 门店联系电话 */
  storePhone: string
  /** 收花方式 */
  method: 'pickup' | 'delivery'
  /** 联系人姓名 */
  contactName: string
  /** 联系电话 */
  phone: string
  /** 地址 */
  address: string
  /** 备注 */
  remark: string
  /** 订单合计金额（元） */
  total: number
  /** 商品原价金额（元） */
  productAmount: number
  /** 配送费（元） */
  deliveryFee: number
  /** 优惠金额（元） */
  discount: number
  /** 创建时间 */
  createdAt: string
}
