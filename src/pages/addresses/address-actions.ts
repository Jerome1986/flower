import {
  listAddressesApi,
  createAddressApi,
  updateAddressApi,
  deleteAddressApi,
  setDefaultAddressApi,
} from '@/api/addresses'
import type { Address, AddressInput, AddressResponse } from '@/types/address'
import { positiveId } from '@/utils/order-input'
function mapAddress(item: AddressResponse): Address {
  return {
    ...item,
    id: String(item.id),
    region: [item.province, item.city, item.district].filter(Boolean).join(' '),
  }
}
function validateId(id: string) {
  if (!positiveId(id) || Number(id) > 2147483647) throw new Error('地址标识无效，请刷新地址列表')
}
export async function getAddresses() {
  const { data } = await listAddressesApi()
  return data.map(mapAddress)
}
export async function saveAddress(id: string, input: AddressInput) {
  if (id) validateId(id)
  const { data } = await (id ? updateAddressApi(id, input) : createAddressApi(input))
  return mapAddress(data)
}
export async function deleteAddress(id: string) {
  validateId(id)
  await deleteAddressApi(id)
}
export async function setDefaultAddress(id: string) {
  validateId(id)
  await setDefaultAddressApi(id)
}
