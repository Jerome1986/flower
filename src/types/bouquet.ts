import type { FlowerProduct } from './product'

/** 后端协议金额均为整数分，ID 为数字。 */
export interface BouquetResponse {
  /** 记录编号 */
  id: number
  /** 名称 */
  name: string
  /** 封面图地址 */
  coverImage: string
  /** 图片地址列表 */
  images: string[]
  /** 描述说明 */
  description: string
  /** 配送费（分） */
  deliveryFee: number
  /** 营业时间 */
  businessHours: string
  /** 客服电话 */
  servicePhone: string
  /** 单笔购买数量上限 */
  maxQuantity: number
  /** 商品规格列表 */
  specs: {
    /** 记录编号 */
    id: number
    /** 名称 */
    name: string
    /** 计量单位 */
    unit: string
    /** 价格（分） */
    price: number
  }[]
}
/** 花束。 */
export interface Bouquet extends FlowerProduct {
  /** 图片地址列表 */
  images: string[]
  /** 配送费（元） */
  deliveryFee: number
  /** 营业时间 */
  businessHours: string
  /** 客服电话 */
  servicePhone: string
  /** 单笔购买数量上限 */
  maxQuantity: number
  /** 商品规格列表 */
  specs: {
    /** 记录编号 */
    id: string
    /** 名称 */
    name: string
    /** 计量单位 */
    unit: string
    /** 价格（元） */
    price: number
  }[]
}
/** 花束选购参数。 */
export interface BouquetSelection {
  /** 选择的用户优惠券编号，不传表示不用券。 */
  couponId?: number
  /** 定制花束编号 */
  bouquetId: number
  /** 商品规格编号 */
  specId: number
  /** 商品份数 */
  quantity: number
  /** 地址 */
  address: string
}
/** 花束提交参数。 */
export interface BouquetSubmission extends BouquetSelection {
  /** 客户端提交幂等键 */
  requestKey: string
  /** 联系人姓名 */
  contactName: string
  /** 联系人手机号 */
  contactPhone: string
  /** 备注 */
  remark: string
  /** 客户端确认的应付金额（分） */
  expectedAmount: number
}
