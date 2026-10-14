import type { FlowerProduct } from '@/types/product'

export interface StoreResponse {
  id: number
  name: string
  address: string
  phone: string
  businessHours: string
  isOpen: boolean
  deliveryArea: string | null
  deliveryFee: number
}
export interface ProductResponse {
  id: number
  storeId: number
  storeProductId: number
  name: string
  coverImage: string
  images: string[]
  description: string
  category: { id: number; name: string } | null
  pickupEnabled: boolean
  deliveryEnabled: boolean
  specs: { id: number; name: string; unit: string; price: number; available: number }[]
}
export interface ShopProduct extends FlowerProduct {
  storeId: string
  storeProductId: number
  categoryId: string
  categoryName: string
  images: string[]
  specs: { id: string; name: string; unit: string; price: number; available: number }[]
}
