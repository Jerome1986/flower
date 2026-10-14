/** 地址接口已确认：省市区独立字段，ID 为后端整数。 */
export interface AddressInput {
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault: boolean
  regionCode?: string
}
export interface AddressResponse extends Omit<AddressInput, 'regionCode'> {
  id: number
  regionCode: string | null
}
export interface Address extends Omit<AddressResponse, 'id'> {
  id: string
  /** 仅用于展示与结算地址快照，不传回地址接口。 */
  region: string
}
