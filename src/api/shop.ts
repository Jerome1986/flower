import { request } from '@/utils/http'
import type { StoreResponse, ProductResponse } from '@/types/shop'

// 获取门店列表。
export const getStoresApi = () => {
  return request<StoreResponse[]>({
    method: 'GET',
    url: '/shop/stores',
  })
}

// 获取门店详情。
export const getStoreApi = (id: string) => {
  return request<StoreResponse>({
    method: 'GET',
    url: `/shop/stores/${encodeURIComponent(id)}`,
  })
}

// 获取门店商品列表。
export const getProductsApi = (storeId: string) => {
  return request<ProductResponse[]>({
    method: 'GET',
    url: `/shop/stores/${encodeURIComponent(storeId)}/products`,
  })
}

// 获取门店商品详情。
export const getProductApi = (storeId: string, id: string) => {
  return request<ProductResponse>({
    method: 'GET',
    url: `/shop/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(id)}`,
  })
}
