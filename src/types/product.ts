/** 收花方式。 */
export type Fulfillment = 'pickup' | 'delivery'

/** 鲜花商品。 */
export interface FlowerProduct {
  /** 记录编号 */
  id: string
  /** 名称 */
  name: string
  /** 图片地址 */
  image: string
  /** 描述说明 */
  description: string
  /** 规格展示名称 */
  specification: string
  /** 计量单位 */
  unit: string
  /** 价格（元） */
  price: number
  /** 支持的收花方式列表 */
  methods: Fulfillment[]
}
