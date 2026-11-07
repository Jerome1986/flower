import type { CartOrderSubmission } from './order-api'
import type { Fulfillment } from './product'

/** 购物车明细。 */
export interface CartItem {
  /** 记录编号 */
  id: string
  /** 门店编号 */
  storeId: string
  /** 商品编号 */
  productId: string
  /** 商品规格编号 */
  specId: string
  /** 门店名称 */
  storeName: string
  /** 商品名称 */
  productName: string
  /** 图片地址 */
  image: string
  /** 规格名称 */
  specName: string
  /** 计量单位 */
  unit: string
  /** 商品单价（分） */
  unitPrice: number
  /** 商品份数 */
  quantity: number
  /** 是否选中 */
  selected: boolean
  /** 收花方式 */
  method: Fulfillment
  /** 联系人姓名 */
  contactName: string
  /** 联系人手机号 */
  contactPhone: string
  /** 地址 */
  address: string
  /** 备注 */
  remark: string
  /** 用户优惠券编号 */
  couponId: string
}

/** 购物车草稿。 */
export type CartDraft = Omit<CartItem, 'id' | 'selected'>

/** 购物车确认快照。 */
export interface CartConfirmation {
  /** 记录编号 */
  id: string
  /** 购物车所属用户标识 */
  owner: string
  /** 商品或数据明细列表 */
  items: CartItem[]
  /** 结果待确认时保留的提交快照 */
  submission?: CartOrderSubmission
  /** 业务订单编号 */
  orderNo?: string
}
