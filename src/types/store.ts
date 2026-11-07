/** 鲜花门店。 */
export interface FlowerStore {
  /** 记录编号 */
  id: string
  /** 名称 */
  name: string
  /** 地址 */
  address: string
  /** 营业时间 */
  hours: string
  /** 联系电话 */
  phone: string
  /** 是否营业 */
  open: boolean
  /** 配送范围说明 */
  deliveryArea: string
  /** 配送费（元） */
  deliveryFee: number
  /** 商品库存映射 */
  stock: Record<string, number>
}
