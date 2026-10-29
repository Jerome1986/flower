export interface OrderSelection {
  storeId: number
  productId: number
  specId: number
  quantity: number
  method: 'pickup' | 'delivery'
}
export interface OrderQuote {
  productAmount: number
  discountAmount: number
  deliveryFee: number
  payableAmount: number
}
export interface OrderSubmission extends OrderSelection {
  requestKey: string
  contactName: string
  contactPhone: string
  address?: string
  remark?: string
  expectedAmount: number
}
export interface OrderResponse {
  version: number
  logs: { action: string; createdAt: string; remark?: string | null }[]
  orderNo: string
  userId: number
  storeId: number | null
  type: 'ORDINARY' | 'CUSTOM'
  method: 'PICKUP' | 'DELIVERY'
  status: string
  paymentStatus: string
  createdAt: string
  pickupCode: string | null
  contactName: string
  contactPhone: string
  remark: string | null
  payableAmount: number
  productAmount: number
  discountAmount: number
  deliveryFee: number
  storeSnapshot: { name?: string; address?: string; phone?: string; hours?: string } | null
  serviceSnapshot?: { servicePhone?: string | null; businessHours?: string | null } | null
  addressSnapshot: { detail?: string } | null
  item: {
    specId: number
    productName: string
    coverImage: string
    specName: string
    unit: string
    quantity: number
  } | null
}
