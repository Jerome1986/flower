import type { FlowerProduct } from '@/types/product'

/** 门店响应。 */
export interface StoreResponse {
  /** 记录编号 */
  id: number
  /** 名称 */
  name: string
  /** 地址 */
  address: string
  /** 联系电话 */
  phone: string
  /** 营业时间 */
  businessHours: string
  /** 是否营业 */
  isOpen: boolean
  /** 配送范围说明 */
  deliveryArea: string | null
  /** 配送费（分） */
  deliveryFee: number
}
/** 商品响应。 */
export interface ProductResponse {
  /** 记录编号 */
  id: number
  /** 门店编号 */
  storeId: number
  /** 门店上架记录编号 */
  storeProductId: number
  /** 名称 */
  name: string
  /** 封面图地址 */
  coverImage: string
  /** 图片地址列表 */
  images: string[]
  /** 描述说明 */
  description: string
  /** 分类信息 */
  category: {
    /** 记录编号 */
    id: number
    /** 名称 */
    name: string
  } | null
  /** 是否支持自取 */
  pickupEnabled: boolean
  /** 是否支持配送 */
  deliveryEnabled: boolean
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
    /** 当前可用库存数量 */
    available: number
  }[]
}
/** Shop商品。 */
export interface ShopProduct extends FlowerProduct {
  /** 门店编号 */
  storeId: string
  /** 门店上架记录编号 */
  storeProductId: number
  /** 分类编号 */
  categoryId: string
  /** 分类名称 */
  categoryName: string
  /** 图片地址列表 */
  images: string[]
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
    /** 当前可用库存数量 */
    available: number
  }[]
}
