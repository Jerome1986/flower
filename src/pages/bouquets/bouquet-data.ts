import { getBouquetApi, getBouquetsApi } from '@/api/bouquets'
import type { Bouquet, BouquetResponse } from '@/types/bouquet'
import { resolveApiImage } from '@/utils/http'
const mapBouquet = (item: BouquetResponse): Bouquet => {
  const specs = item.specs.map((spec) => ({
    ...spec,
    id: String(spec.id),
    price: spec.price / 100,
  }))
  const first = specs.reduce<(typeof specs)[number] | undefined>(
    (best, spec) => (!best || spec.price < best.price ? spec : best),
    undefined,
  )
  return {
    ...item,
    id: String(item.id),
    image: resolveApiImage(item.coverImage),
    images: item.images.map(resolveApiImage).filter(Boolean),
    price: first?.price ?? 0,
    specification: first?.name ?? '',
    unit: first?.unit ?? '',
    deliveryFee: item.deliveryFee / 100,
    methods: ['delivery'],
    specs,
  }
}
export const getBouquets = async () => {
  const { data } = await getBouquetsApi()
  return data.map(mapBouquet)
}
export const getBouquet = async (id: string) => {
  const { data } = await getBouquetApi(id)
  return mapBouquet(data)
}
