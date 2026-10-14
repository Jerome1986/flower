export interface FlowerStore {
  id: string
  name: string
  address: string
  hours: string
  phone: string
  open: boolean
  deliveryArea: string
  deliveryFee: number
  stock: Record<string, number>
}
