<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getSelectedStore, getProducts } from '@/pages/stores/shop-data'
import type { ShopProduct } from '@/types/shop'
import type { FlowerStore } from '@/types/store'

// 从当前门店上架商品中生成分类。
const categories = computed(() => [
  { id: 'all', name: '全部鲜花' },
  ...Array.from(new Map(products.value.map((product) => [product.categoryId, { id: product.categoryId, name: product.categoryName }])).values()),
])
// 当前门店接口返回的上架商品。
const products = ref<ShopProduct[]>([])
const loading = ref(false)
const failed = ref(false)
let loadVersion = 0
async function loadCatalog() {
  const version = ++loadVersion
  loading.value = true
  failed.value = false
  products.value = []
  currentStore.value = undefined
  try {
    const store = await getSelectedStore()
    const list = store ? await getProducts(store.id) : []
    if (version !== loadVersion) return
    currentStore.value = store
    products.value = list
    if (!categories.value.some((item) => item.id === categoryId.value)) categoryId.value = 'all'
  } catch { if (version === loadVersion) failed.value = true }
  finally { if (version === loadVersion) loading.value = false }
}

// 当前真实门店。
const currentStore = ref<FlowerStore>()
// 是否展开当前门店的详细信息。
const showStore = ref(false)

// 当前收花方式。
const method = ref('pickup')
// 当前商品分类。
const categoryId = ref('all')
// 是否显示收花方式提示。
const showNotice = ref(true)
// 当前分类的商品。
const currentProducts = computed(() =>
  products.value
    .filter(
      (product) =>
        (categoryId.value === 'all' || product.categoryId === categoryId.value) &&
        product.methods.includes(method.value as 'pickup' | 'delivery'),
    )
    .map((product) => ({
      ...product,
      soldOut:
        !currentStore.value?.open || !product.specs.some((spec) => spec.available > 0),
    })),
)
// 当前分类名称。
const categoryName = computed(
  () => categories.value.find((category) => category.id === categoryId.value)?.name,
)

// 接收首页自取或配送入口的展示方式。
onShow(() => {
  void loadCatalog()
  // 首页预设的收花方式。
  const entryMethod = uni.getStorageSync('flower-entry-method')
  if (entryMethod === 'pickup' || entryMethod === 'delivery') method.value = entryMethod
  uni.removeStorageSync('flower-entry-method')
})

// 切换自取或配送。
function changeMethod(value: string) {
  method.value = value
}
// 切换商品分类。
function changeCategory(value: string) {
  categoryId.value = value
}
// 打开门店列表并传入当前门店与收花方式。
function chooseStore() {
  uni.navigateTo({
    url: `/pages/stores/index?storeId=${currentStore.value?.id || ''}&method=${method.value}`,
  })
}
// 展开或收起门店地址、营业时间和电话。
function toggleStore() {
  showStore.value = !showStore.value
}
// 点击整个商品卡片查看详情。
function viewProduct(id: string) {
  if (!currentStore.value) return
  uni.navigateTo({
    url: `/pages/product/index?id=${id}&storeId=${currentStore.value.id}&method=${method.value}`,
  })
}
// 关闭收花方式提示。
function closeNotice() {
  showNotice.value = false
}
</script>

<template>
  <view class="order-page">
    <view v-if="currentStore" class="store-card">
      <view class="store-header">
        <button class="store-name" @click="chooseStore">
          {{ currentStore.name }}
          <text class="iconfont icon-youjiantou1" />
        </button>
        <view class="method-tabs">
          <button :class="{ active: method === 'pickup' }" @click="changeMethod('pickup')">
            自取
          </button>
          <button :class="{ active: method === 'delivery' }" @click="changeMethod('delivery')">
            配送
          </button>
        </view>
      </view>
      <view class="store-distance">
        <text class="iconfont icon-address" />
        {{ currentStore.open ? '营业中' : '休息中' }} ·
        {{ method === 'pickup' ? '到店带走一份美好' : '把心意送到你身边' }}
      </view>
      <view v-if="showNotice" class="notice">
        <text class="notice-copy">
          {{ method === 'pickup' ? '到店带走一份美好' : '把心意送到你身边' }}
        </text>
        <button class="notice-close" aria-label="关闭收花方式提示" @click="closeNotice">×</button>
      </view>
      <button class="store-details" @click="toggleStore">
        <text>门店详细信息</text>
        <text>{{ showStore ? '收起 ⌃' : '点击查看 ⌄' }}</text>
      </button>
      <view v-if="showStore" class="store-info">
        <text>{{ currentStore.address }}</text>
        <text>营业时间：{{ currentStore.hours }}</text>
        <text>联系电话：{{ currentStore.phone }}</text>
        <text v-if="method === 'delivery'">
          配送区域：{{ currentStore.deliveryArea }} · 配送费 ¥{{
            currentStore.deliveryFee.toFixed(2)
          }}
        </text>
      </view>
    </view>
    <view v-if="loading || failed || !currentStore" class="list-footer">
      <text>{{ loading ? '正在加载鲜花…' : failed ? '加载失败，请重试' : '暂无可选门店' }}</text>
      <button v-if="failed" @click="loadCatalog">重新加载</button>
    </view>
    <view v-else class="catalog">
      <scroll-view class="category-list" scroll-y>
        <button
          v-for="category in categories"
          :key="category.id"
          class="category-item"
          :class="{ selected: categoryId === category.id }"
          @click="changeCategory(category.id)"
        >
          {{ category.name }}
        </button>
      </scroll-view>
      <scroll-view :key="categoryId" class="product-list" scroll-y :scroll-top="0">
        <view class="product-heading">
          <text class="heading-title">{{ categoryName }}</text>
          <text class="muted">一花一份心意</text>
        </view>
        <view
          v-for="product in currentProducts"
          :key="product.id"
          class="product-card"
          @click="viewProduct(product.id)"
        >
          <image class="product-image" :src="product.image" mode="aspectFill" lazy-load />
          <view class="product-body">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-description">
              {{ product.specification }} / {{ product.unit }}
            </text>
            <text class="product-description">
              {{ product.methods.map(item => item === 'pickup' ? '自取' : '配送').join(' / ') }}
            </text>
            <view class="product-bottom">
              <view class="price">
                <text class="currency">¥</text>
                {{ product.price.toFixed(2) }}
              </view>
              <text v-if="product.soldOut" class="product-description">
                {{ currentStore.open ? '已售罄' : '门店休息中' }}
              </text>
              <button
                v-else
                class="add-button"
                :aria-label="'选购' + product.name"
                @click.stop="viewProduct(product.id)"
              >
                <text class="iconfont icon-jiahao" />
              </button>
            </view>
          </view>
        </view>
        <view class="list-footer">
          <text>{{ currentProducts.length ? '已经看到全部花啦' : '当前门店暂无符合条件的鲜花' }}</text>
          <text>商品和库存以门店当前配置为准</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@use './order.scss';
</style>
