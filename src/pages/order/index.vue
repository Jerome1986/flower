<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { mockFlowers, mockStores } from '../index/mock-data'
import { readStock } from '@/services/preview-stock'

// 列表分类复用首页普通鲜花。
const categories = [
  { id: 'all', name: '全部鲜花' },
  ...mockFlowers.map((product) => ({ id: product.id, name: product.name })),
]
// 普通鲜花展示数据，后续接入当前门店的上架商品。
const products = mockFlowers.map((product) => ({ ...product, categoryId: product.id }))

// 当前匹配门店，结构预览暂使用模拟中心店。
const currentStore = ref(mockStores[0])
// 是否展开当前门店的详细信息。
const showStore = ref(false)

// 当前收花方式。
const method = ref('pickup')
// 当前商品分类。
const categoryId = ref('all')
// 是否显示收花方式提示。
const showNotice = ref(true)
// 已确认订单扣减后的各门店库存。
const stocks = ref<Record<string, Record<string, number>>>({})
// 当前分类的商品。
const currentProducts = computed(() =>
  products
    .filter(
      (product) =>
        (categoryId.value === 'all' || product.categoryId === categoryId.value) &&
        product.methods.includes(method.value as 'pickup' | 'delivery'),
    )
    .map((product) => ({
      ...product,
      soldOut:
        !currentStore.value.open || (stocks.value[currentStore.value.id]?.[product.id] || 0) === 0,
    })),
)
// 当前分类名称。
const categoryName = computed(
  () => categories.find((category) => category.id === categoryId.value)?.name,
)

// 接收首页自取或配送入口的展示方式。
onShow(() => {
  stocks.value = readStock()
  // 首页预设的收花方式。
  const entryMethod = uni.getStorageSync('flower-entry-method')
  if (entryMethod === 'pickup' || entryMethod === 'delivery') method.value = entryMethod
  uni.removeStorageSync('flower-entry-method')
  // 门店列表返回的模拟选择结果。
  const selectedId = uni.getStorageSync('flower-selected-store')
  // 根据标识取得对应门店信息。
  const selectedStore = mockStores.find((store) => store.id === selectedId)
  if (selectedStore) currentStore.value = selectedStore
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
    url: `/pages/stores/index?storeId=${currentStore.value.id}&method=${method.value}`,
  })
}
// 展开或收起门店地址、营业时间和电话。
function toggleStore() {
  showStore.value = !showStore.value
}
// 点击整个商品卡片查看详情。
function viewProduct(id: string) {
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
    <view class="store-card">
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
    <view class="catalog">
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
              {{ product.methods.includes('delivery') ? '自取 / 配送' : '仅自取' }}
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
          <text>已经看到全部花啦</text>
          <text>图片、门店与价格均为演示素材</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@use './order.scss';
</style>
