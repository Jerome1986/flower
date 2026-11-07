import {
  createAddressApi,
  deleteAddressApi,
  listAddressesApi,
  setDefaultAddressApi,
  updateAddressApi,
} from '@/api/addresses'
import type { Address, AddressInput, AddressResponse } from '@/types/address'
import { positiveId } from '@/utils/order-input'
// 将服务端数字标识转换为页面使用的字符串，并组合省市区展示文本。
const mapAddress = (item: AddressResponse): Address => {
  return {
    ...item,
    id: String(item.id),
    region: [item.province, item.city, item.district].filter(Boolean).join(' '),
  }
}
// 校验地址标识为后端整数范围内的正整数，阻止无效地址操作。
const validateId = (id: string) => {
  if (!positiveId(id) || Number(id) > 2147483647) throw new Error('地址标识无效，请刷新地址列表')
}
// 获取当前登录账户的地址列表，并统一转换为页面地址结构。
export const getAddresses = async () => {
  // 服务端返回的地址列表，账户归属由请求凭证确定。
  const { data } = await listAddressesApi()
  return data.map(mapAddress)
}
// 有标识时更新已有地址，无标识时新增，并返回转换后的地址。
export const saveAddress = async (id: string, input: AddressInput) => {
  if (id) validateId(id)
  // 服务端保存成功后返回的完整地址。
  const { data } = await (id ? updateAddressApi(id, input) : createAddressApi(input))
  return mapAddress(data)
}
// 校验标识后删除地址，归属权限由服务端校验。
export const deleteAddress = async (id: string) => {
  validateId(id)
  await deleteAddressApi(id)
}
// 校验标识后设置默认地址，由服务端维护默认地址的唯一性。
export const setDefaultAddress = async (id: string) => {
  validateId(id)
  await setDefaultAddressApi(id)
}
