import type { FlowerProduct } from './product'

// 后端协议金额均为整数分，ID 为数字。
export interface BouquetResponse {
  id: number
  name: string
  coverImage: string
  images: string[]
  description: string
  deliveryFee: number
  businessHours: string
  servicePhone: string
  maxQuantity: number
  specs: { id: number; name: string; unit: string; price: number }[]
}
export interface Bouquet extends FlowerProduct {
  images: string[]
  deliveryFee: number
  businessHours: string
  servicePhone: string
  maxQuantity: number
  specs: { id: string; name: string; unit: string; price: number }[]
}
export interface BouquetSelection {
  bouquetId: number
  specId: number
  quantity: number
  address: string
}
export interface BouquetSubmission extends BouquetSelection {
  requestKey: string
  contactName: string
  contactPhone: string
  remark: string
  expectedAmount: number
}
