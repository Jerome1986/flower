/** 订单选购参数。 */
export interface OrderSelection {
  /** 门店编号 */
  storeId: number
  /** 商品编号 */
  productId: number
  /** 商品规格编号 */
  specId: number
  /** 商品份数 */
  quantity: number
  /** 收花方式 */
  method: 'pickup' | 'delivery'
}
/** 订单报价。 */
export interface OrderQuote {
  /** 商品或数据明细列表 */
  items?: OrderItemResponse[]
  /** 商品原价金额（分） */
  productAmount: number
  /** 优惠金额（分） */
  discountAmount: number
  /** 配送费（分） */
  deliveryFee: number
  /** 最终应付金额（分） */
  payableAmount: number
}
/** 购物车订单选购参数。 */
export interface CartOrderSelection {
  /** 门店编号 */
  storeId: number
  /** 收花方式 */
  method: 'pickup' | 'delivery'
  /** 商品或数据明细列表 */
  items: {
    /** 商品编号 */
    productId: number
    /** 商品规格编号 */
    specId: number
    /** 商品份数 */
    quantity: number
    /** 备注 */
    remark?: string
  }[]
  /** 用户优惠券编号 */
  couponId?: number
}
/** 购物车订单提交参数。 */
export interface CartOrderSubmission extends CartOrderSelection {
  /** 客户端提交幂等键 */
  requestKey: string
  /** 联系人姓名 */
  contactName: string
  /** 联系人手机号 */
  contactPhone: string
  /** 地址 */
  address?: string
  /** 客户端确认的应付金额（分） */
  expectedAmount: number
}
/** 订单明细响应。 */
export interface OrderItemResponse {
  /** 记录编号 */
  id?: number
  /** 商品编号 */
  productId?: number | null
  /** 商品规格编号 */
  specId: number
  /** 商品名称 */
  productName: string
  /** 封面图地址 */
  coverImage: string
  /** 规格名称 */
  specName: string
  /** 计量单位 */
  unit: string
  /** 商品份数 */
  quantity: number
  /** 备注 */
  remark?: string | null
  /** 商品单价（分） */
  unitPrice?: number
  /** 商品原价金额（分） */
  productAmount?: number
  /** 优惠金额（分） */
  discountAmount?: number
}
/** 订单提交参数。 */
export interface OrderSubmission extends OrderSelection {
  /** 客户端提交幂等键 */
  requestKey: string
  /** 联系人姓名 */
  contactName: string
  /** 联系人手机号 */
  contactPhone: string
  /** 地址 */
  address?: string
  /** 备注 */
  remark?: string
  /** 客户端确认的应付金额（分） */
  expectedAmount: number
}
/** 订单响应。 */
export interface OrderResponse {
  /** 商品或数据明细列表 */
  items?: OrderItemResponse[]
  /** 失效时间 */
  expiresAt?: string
  /** 并发控制版本号 */
  version: number
  /** 操作日志列表 */
  logs: {
    /** 操作动作 */
    action: string
    /** 创建时间 */
    createdAt: string
    /** 备注 */
    remark?: string | null
  }[]
  /** 业务订单编号 */
  orderNo: string
  /** 用户编号 */
  userId: number
  /** 门店编号 */
  storeId: number | null
  /** 业务类型 */
  type: 'ORDINARY' | 'CUSTOM'
  /** 收花方式 */
  method: 'PICKUP' | 'DELIVERY'
  /** 当前状态 */
  status: string
  /** 支付状态 */
  paymentStatus: string
  /** 创建时间 */
  createdAt: string
  /** 自取核销码 */
  pickupCode: string | null
  /** 联系人姓名 */
  contactName: string
  /** 联系人手机号 */
  contactPhone: string
  /** 备注 */
  remark: string | null
  /** 最终应付金额（分） */
  payableAmount: number
  /** 商品原价金额（分） */
  productAmount: number
  /** 优惠金额（分） */
  discountAmount: number
  /** 配送费（分） */
  deliveryFee: number
  /** 下单时的门店信息快照 */
  storeSnapshot: {
    /** 名称 */
    name?: string
    /** 地址 */
    address?: string
    /** 联系电话 */
    phone?: string
    /** 营业时间 */
    hours?: string
  } | null
  /** 下单时的服务配置快照 */
  serviceSnapshot?: {
    /** 客服电话 */
    servicePhone?: string | null
    /** 营业时间 */
    businessHours?: string | null
  } | null
  /** 下单时的地址快照 */
  addressSnapshot: {
    /** 详细内容 */
    detail?: string
  } | null
  /** 兼容旧协议的首条商品明细 */
  item: {
    /** 商品规格编号 */
    specId: number
    /** 商品名称 */
    productName: string
    /** 封面图地址 */
    coverImage: string
    /** 规格名称 */
    specName: string
    /** 计量单位 */
    unit: string
    /** 商品份数 */
    quantity: number
  } | null
}
