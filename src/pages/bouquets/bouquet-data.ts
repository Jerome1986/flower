import { getBouquetsApi, getBouquetApi } from '@/api/bouquets'
import { resolveApiImage } from '@/utils/http'
import type { Bouquet, BouquetResponse } from '@/types/bouquet'

function mapBouquet(item: BouquetResponse): Bouquet {
  const specs = item.specs.map((spec) => ({
    ...spec,
    id: String(spec.id),
    price: spec.price / 100,
  }))
  return {
    ...item,
    id: String(item.id),
    image: resolveApiImage(item.coverImage),
    images: item.images.map(resolveApiImage).filter(Boolean),
    price: specs.length ? Math.min(...specs.map((spec) => spec.price)) : 0,
    specification: specs[0]?.name ?? '',
    unit: specs[0]?.unit ?? '',
    deliveryFee: item.deliveryFee / 100,
    methods: ['delivery'],
    specs,
  }
}
export async function getBouquets() {
  const { data } = await getBouquetsApi()
  return data.map(mapBouquet)
}
export async function getBouquet(id: string) {
  const { data } = await getBouquetApi(id)
  return mapBouquet(data)
}
