<script setup lang="ts">
import { computed, ref } from 'vue'
import { openAuthPage } from '@/utils/login-return'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getBouquet } from '@/pages/bouquets/bouquet-data'
import { customCheckoutEnabled } from '@/pages/custom-checkout/bouquet-checkout'
import { useResource } from '@/composables/use-resource'
const bouquetId = ref('')
const quantity = ref(1)
const specId = ref('')
const resource = useResource(() => getBouquet(bouquetId.value), false)
const bouquet = resource.data
const loading = resource.loading
const message = resource.message
const pending = resource.pending
const selectedSpec = computed(() => bouquet.value?.specs.find((item) => item.id === specId.value))
const subtotal = computed(() => (selectedSpec.value?.price || 0) * quantity.value)
const detailImages = computed(() =>
  bouquet.value?.images.length ? bouquet.value.images : bouquet.value ? [bouquet.value.image] : [],
)
const canBuy = computed(
  () =>
    customCheckoutEnabled &&
    Boolean(
      selectedSpec.value &&
        quantity.value >= 1 &&
        quantity.value <= (bouquet.value?.maxQuantity || 1),
    ),
)
onLoad((options) => {
  bouquetId.value = options?.id || ''
})
async function load() {
  if (!bouquetId.value) {
    resource.message.value = '花束参数不完整'
    return
  }
  await resource.load()
  if (!bouquet.value?.specs.some((item) => item.id === specId.value))
    specId.value = bouquet.value?.specs[0]?.id || ''
}
onShow(load)
function decreaseQuantity() {
  quantity.value = Math.max(1, quantity.value - 1)
}
function increaseQuantity() {
  quantity.value = Math.min(bouquet.value?.maxQuantity || 1, quantity.value + 1)
}
function chooseSpec(id: string) {
  specId.value = id
  quantity.value = 1
}
function buyNow() {
  if (!canBuy.value) return
  openAuthPage(
      '/pages/custom-checkout/index?id=' +
      encodeURIComponent(bouquetId.value) +
      '&specId=' +
      encodeURIComponent(specId.value) +
      '&quantity=' +
      quantity.value,
  )
}
function goBouquets() {
  uni.redirectTo({ url: '/pages/bouquets/index' })
}
</script>

<template>
  <view v-if="bouquet" class="product-page">
    <view class="product-gallery">
      <image class="product-cover" :src="bouquet.image" mode="aspectFill" />
    </view>
    <view class="content">
      <view class="panel product-summary">
        <view class="title-row">
          <text class="product-title">{{ bouquet.name }}</text>
          <text class="price">
            <text class="currency">¥</text>
            {{ (selectedSpec?.price ?? bouquet.price).toFixed(2) }}
          </text>
        </view>
        <text class="subtitle">{{ bouquet.description }}</text>
        <view class="summary-tags">
          <text>精选成品花束</text>
          <text>平台配送</text>
        </view>
      </view>
      <view class="panel">
        <text class="section-title">选一份特别的心意</text>
        <view class="field">
          <text class="field-label">花束规格</text>
          <button
            v-for="spec in bouquet.specs"
            :key="spec.id"
            class="specification"
            :class="{ selected: spec.id === specId }"
            @click="chooseSpec(spec.id)"
          >
            <text>{{ spec.name }}</text
            ><text class="spec-unit">¥{{ spec.price.toFixed(2) }} / {{ spec.unit }}</text>
          </button>
        </view>
        <text v-if="!bouquet.specs.length" class="hint">暂无可购规格，请查看其他花束</text>
        <view class="quantity-row">
          <view>
            <text class="field-label">购买数量</text>
            <text class="hint">固定成品款式 · 每单最多 {{ bouquet.maxQuantity }} 束</text>
          </view>
          <view class="stepper">
            <button
              class="stepper-button"
              :disabled="quantity <= 1"
              aria-label="减少数量"
              @click="decreaseQuantity"
            >
              <view class="minus-icon" />
            </button>
            <text class="quantity-value">{{ quantity }}</text>
            <button
              class="stepper-button"
              :disabled="quantity >= (bouquet.maxQuantity || 1)"
              aria-label="增加数量"
              @click="increaseQuantity"
            >
              <text class="iconfont icon-jiahao" />
            </button>
          </view>
        </view>
        <view class="field">
          <text class="field-label">收花方式</text>
          <view class="delivery-option">
            <text class="iconfont icon-address" />
            <view>
              <text>鲜花到家</text>
              <text class="hint">仅支持配送，平台统一安排</text>
            </view>
          </view>
        </view>
      </view>
      <view class="panel">
        <text class="section-title">平台为你安排这份花礼</text>
        <text class="subtitle">无需选择门店，平台安排合作方制作与配送。</text>
        <view class="delivery-info">
          <text class="field-label">配送费用</text>
          <text>¥{{ bouquet.deliveryFee.toFixed(2) }}</text>
        </view>
        <text class="hint">填写收货地址后，在确认订单页核对配送信息。</text>
      </view>
      <view class="panel detail-panel">
        <text class="section-title">花束详情</text>
        <view class="detail-images">
          <image
            v-for="image in detailImages"
            :key="image"
            class="detail-image"
            :src="image"
            mode="widthFix"
            lazy-load
          />
        </view>
      </view>
      <view class="panel">
        <text class="section-title">送花小贴士</text>
        <text class="tips">本款为固定成品花束，暂不支持自由搭配花材或在线改款。</text>
        <text class="tips">鲜花为自然生长，花型与颜色可能略有差异，请以实际商品为准。</text>
        <text class="tips"> 当前花束订单暂不支持使用优惠券。 </text>
      </view>
      <text class="demo-note">{{ '配送费用以订单报价为准' }}</text>
    </view>
    <view class="purchase-bar">
      <view>
        <text class="total-label">商品合计 · 不含配送费</text>
        <text class="price">
          <text class="currency">¥</text>
          {{ subtotal.toFixed(2) }}
        </text>
      </view>
      <button class="buy-button" :disabled="!canBuy" @click="buyNow">
        {{ '立即购买' }}
      </button>
    </view>
  </view>
  <view v-else class="empty-state">
    <text>{{ loading ? '正在加载花束…' : message || '暂未找到这款花束' }}</text
    ><button v-if="!loading && message && !pending" @click="load">重试</button>
    <button @click="goBouquets">查看其他花束</button>
  </view>
</template>

<style lang="scss" scoped>
@use './bouquet-detail.scss';
</style>
