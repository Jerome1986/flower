/** 地址接口已确认：省市区独立字段，ID 为后端整数。 */
export interface AddressInput {
  /** 名称 */
  name: string
  /** 联系电话 */
  phone: string
  /** 省份 */
  province: string
  /** 城市 */
  city: string
  /** 区县 */
  district: string
  /** 详细内容 */
  detail: string
  /** 是否为默认项 */
  isDefault: boolean
  /** 行政区划编码 */
  regionCode?: string
}
/** 地址响应。 */
export interface AddressResponse extends Omit<AddressInput, 'regionCode'> {
  /** 记录编号 */
  id: number
  /** 行政区划编码 */
  regionCode: string | null
}
/** 地址。 */
export interface Address extends Omit<AddressResponse, 'id'> {
  /** 记录编号 */
  id: string
  /** 仅用于展示与结算地址快照，不传回地址接口。 */
  region: string
}

/** 从地图文字地址匹配的本地行政区划；未匹配字段为空。 */
export interface AddressRegion {
  /** 省份 */
  province: string
  /** 城市 */
  city: string
  /** 区县 */
  district: string
  /** 行政区划编码 */
  regionCode: string
}
