<script setup lang="ts">
import { useResource } from '@/composables/use-resource'
import type { PreviewOrder } from '@/types/order'
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'

import { useUserStore } from '@/stores/modules/user'
import { orderStatus, orderHint, orderTitle, orderPaymentLabel } from '@/pages/orders/order-display'
import { getOrder } from '@/pages/orders/order-data'

// 数据以当前账户的服务端响应为准。
// 支付结果只展示当前用户自己的订单。
const userStore = useUserStore()
const orderNo = ref('')
onLoad((options) => {
  orderNo.value = options?.orderNo || ''
})
const resource = useResource(() => {
  if (!orderNo.value) throw new Error('订单编号缺失')
  return getOrder(orderNo.value)
})
const order = computed(() => resource.data.value || null)
const loading = resource.loading
const failed = computed(() => Boolean(resource.message.value))
async function loadOrder() {
  await resource.load()
}

// 从确认订单页读取模拟订单，不请求真实支付。
onShow(() => {
  void loadOrder()
})
// 返回下单页继续挑选鲜花。
function goShopping() {
  uni.switchTab({ url: '/pages/order/index' })
}
// 返回首页查看其他鲜花和活动。
function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
// 打开当前模拟订单的详情。
function viewOrder() {
  if (order.value)
    uni.navigateTo({ url: `/pages/order-detail/index?orderNo=${order.value.orderNo}` })
}
</script>

<template>
  <view v-if="order" class="result-page">
    <view class="success-section">
      <view class="success-icon"><UniIcons type="checkmarkempty" size="38" color="#eed261" /></view>
      <text class="success-title">{{
        order.status === 'unpaid' ? '下单成功' : orderTitle(order)
      }}</text>
      <text class="success-copy">
        {{ '订单已保存，可在我的订单中查看' }}
      </text>
      <text class="amount">
        <text class="currency">¥</text>
        {{ order.total.toFixed(2) }}
      </text>
      <text class="amount-label">订单金额 · {{ orderPaymentLabel(order) }}</text>
    </view>
    <view class="panel">
      <view class="panel-heading">
        <text class="section-title">这份鲜花已下单</text>
        <text class="status-tag">{{ orderStatus(order) }}</text>
      </view>
      <view class="product-row">
        <image :src="order.image" mode="aspectFill" />
        <view class="product-copy">
          <text class="product-name">{{ order.productName }}</text>
          <text class="muted">{{ order.specification }} / {{ order.unit }}</text>
          <text class="muted">数量 {{ order.quantity }} {{ order.unit }}</text>
        </view>
      </view>
      <view class="info-row">
        <text>订单编号</text>
        <text class="info-value">{{ order.orderNo }}</text>
      </view>
      <view class="info-row">
        <text>收花方式</text>
        <text class="info-value">{{ order.method === 'pickup' ? '门店自取' : '鲜花到家' }}</text>
      </view>
    </view>
    <view class="panel">
      <text class="section-title">{{ order.method === 'pickup' ? '到店收花' : '配送信息' }}</text>
      <text class="store-name">{{ order.storeName }}</text>
      <text class="muted">
        {{ order.method === 'pickup' ? order.storeAddress : order.address }}
      </text>
      <text class="muted">{{ order.contactName }} · {{ order.phone }}</text>
      <text v-if="order.method === 'pickup'" class="muted">营业时间 {{ order.hours }}</text>
      <view class="fulfillment-note">
        <text class="iconfont icon-hua" />
        <text>
          {{ orderHint(order) }}
        </text>
      </view>
    </view>
    <view class="actions">
      <button class="primary-button" @click="viewOrder">查看订单</button>
      <button class="secondary-button" @click="goShopping">继续选花</button>
      <button class="home-button" @click="goHome">
        返回首页
        <text class="iconfont icon-youjiantou1" />
      </button>
    </view>
  </view>
  <view v-else class="empty-state">
    <text>{{
      loading ? '正在读取订单…' : failed ? '读取失败，可重试或前往我的订单查看' : '暂无订单信息'
    }}</text>
    <button v-if="failed" @click="loadOrder">重新加载</button>
    <button @click="goShopping">去选花</button>
  </view>
</template>

<style lang="scss" scoped>
@use './result.scss';
</style>
