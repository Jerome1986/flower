export type Fulfillment = 'pickup' | 'delivery'

export interface FlowerProduct {
  id: string
  name: string
  image: string
  description: string
  specification: string
  unit: string
  price: number
  methods: Fulfillment[]
}
