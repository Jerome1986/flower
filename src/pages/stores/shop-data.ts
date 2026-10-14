import { getStoresApi, getStoreApi, getProductsApi, getProductApi } from '@/api/shop'
import { resolveApiImage } from '@/utils/http'
import type { FlowerStore } from '@/types/store'
import type { Fulfillment } from '@/types/product'
import type { StoreResponse, ProductResponse, ShopProduct } from '@/types/shop'

function mapStore(store: StoreResponse): FlowerStore {
  return {
    id: String(store.id),
    name: store.name,
    address: store.address,
    phone: store.phone,
    hours: store.businessHours,
    open: store.isOpen,
    deliveryArea: store.deliveryArea || '暂未配置配送区域',
    deliveryFee: store.deliveryFee / 100,
    stock: {},
  }
}
function mapProduct(product: ProductResponse): ShopProduct {
  const specs = product.specs.map((spec) => ({
    ...spec,
    id: String(spec.id),
    price: spec.price / 100,
  }))
  const first = specs[0]
  const methods: Fulfillment[] = []
  if (product.pickupEnabled) methods.push('pickup')
  if (product.deliveryEnabled) methods.push('delivery')
  return {
    id: String(product.id),
    storeId: String(product.storeId),
    storeProductId: product.storeProductId,
    name: product.name,
    image: resolveApiImage(product.coverImage),
    description: product.description,
    categoryId: String(product.category?.id ?? 'other'),
    categoryName: product.category?.name ?? '其他鲜花',
    images: product.images.map(resolveApiImage).filter(Boolean),
    specs,
    specification: first?.name ?? '',
    unit: first?.unit ?? '',
    price: first?.price ?? 0,
    methods,
  }
}
export async function getStores() {
  const { data } = await getStoresApi()
  return data.map(mapStore)
}
export async function getStore(id: string) {
  const { data } = await getStoreApi(id)
  return mapStore(data)
}
export async function getProducts(storeId: string) {
  const { data } = await getProductsApi(storeId)
  return data.map(mapProduct)
}
export async function getProduct(storeId: string, id: string) {
  const { data } = await getProductApi(storeId, id)
  return mapProduct(data)
}
export async function getSelectedStore() {
  const stores = await getStores()
  const selectedId = String(uni.getStorageSync('flower-selected-store') || '')
  const store =
    stores.find((item) => item.id === selectedId) ?? stores.find((item) => item.open) ?? stores[0]
  if (store) uni.setStorageSync('flower-selected-store', store.id)
  else uni.removeStorageSync('flower-selected-store')
  return store
}
