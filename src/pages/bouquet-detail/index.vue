<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { homeContent, mockBouquets } from '../index/mock-data'

// 当前查看的成品花束标识。
const bouquetId = ref(mockBouquets[0].id)
// 当前选择的购买束数。
const quantity = ref(1)
// 当前展示的模拟成品花束。
const bouquet = computed(() => mockBouquets.find((item) => item.id === bouquetId.value))
// 商品合计金额，不包含配送费。
const subtotal = computed(() => (bouquet.value?.price || 0) * quantity.value)
// 花束详情图预览，后续替换为后台上传的长图。
const detailImages = computed(() => (bouquet.value ? [bouquet.value.image] : []))

// 接收专区传入的花束标识。
onLoad((options) => {
  if (options?.id) bouquetId.value = options.id
})
// 减少购买束数，至少保留一束。
function decreaseQuantity() {
  quantity.value = Math.max(1, quantity.value - 1)
}
// 增加购买束数，99为前端数量控件上限。
function increaseQuantity() {
  quantity.value = Math.min(99, quantity.value + 1)
}
// 携带花束与数量进入平台定制确认订单流程。
function buyNow() {
  uni.navigateTo({
    url: `/pages/checkout/index?type=custom&id=${bouquetId.value}&quantity=${quantity.value}&method=delivery`,
  })
}
// 返回专区选择其他成品花束。
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
            {{ bouquet.price.toFixed(2) }}
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
          <view class="specification selected">
            <text>{{ bouquet.specification }}</text>
            <text class="spec-unit">每{{ bouquet.unit }}</text>
          </view>
        </view>
        <view class="quantity-row">
          <view>
            <text class="field-label">购买数量</text>
            <text class="hint">固定成品款式，按束购买</text>
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
              :disabled="quantity >= 99"
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
          <text class="field-label">配送区域</text>
          <text>{{ homeContent.customDeliveryArea }}</text>
        </view>
        <view class="delivery-info">
          <text class="field-label">配送费用</text>
          <text>¥{{ homeContent.customDeliveryFee.toFixed(2) }}</text>
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
        <text class="tips">
          配送地址须在平台服务区域内，优惠券适用范围以确认订单页为准，不抵配送费。
        </text>
      </view>
      <text class="demo-note">图片、价格及配送信息均为演示素材</text>
    </view>
    <view class="purchase-bar">
      <view>
        <text class="total-label">商品合计 · 不含配送费</text>
        <text class="price">
          <text class="currency">¥</text>
          {{ subtotal.toFixed(2) }}
        </text>
      </view>
      <button class="buy-button" @click="buyNow">立即购买</button>
    </view>
  </view>
  <view v-else class="empty-state">
    <text>暂未找到这款花束</text>
    <button @click="goBouquets">查看其他花束</button>
  </view>
</template>

<style lang="scss" scoped>
@use './bouquet-detail.scss';
</style>
