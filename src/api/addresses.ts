import { request } from '@/utils/http'
import type { AddressInput, AddressResponse } from '@/types/address'

// 获取收货地址列表。
export const listAddressesApi = () => {
  return request<AddressResponse[]>({
    method: 'GET',
    url: '/user/addresses',
  })
}

// 新增收货地址。
export const createAddressApi = (data: AddressInput) => {
  return request<AddressResponse>({
    method: 'POST',
    url: '/user/addresses',
    data,
  })
}

// 更新收货地址。
export const updateAddressApi = (id: string, data: AddressInput) => {
  return request<AddressResponse>({
    method: 'PUT',
    url: `/user/addresses/${encodeURIComponent(id)}`,
    data,
  })
}

// 删除收货地址。
export const deleteAddressApi = (id: string) => {
  return request<{ id: number }>({
    method: 'DELETE',
    url: `/user/addresses/${encodeURIComponent(id)}`,
  })
}

// 设置默认收货地址。
export const setDefaultAddressApi = (id: string) => {
  return request<AddressResponse>({
    method: 'POST',
    url: `/user/addresses/${encodeURIComponent(id)}/default`,
  })
}
