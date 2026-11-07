<script setup lang="ts">
import OrderProducts from '@/components/order-products.vue'
import { useResource } from '@/composables/use-resource'
import { getOrder } from '@/pages/orders/order-data'
import { orderHint, orderPaymentLabel, orderStatus, orderTitle } from '@/pages/orders/order-display'
import { useUserStore } from '@/stores/modules/user'
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
// 数据以当前账户的服务端响应为准。
// 支付结果只展示当前用户自己的订单。
const userStore = useUserStore()
const orderNo = ref('')
const loadOrder = async () => {
  await resource.load()
  if (order.value?.paymentStatus !== 'PENDING') stopPolling()
}
// 返回下单页继续挑选鲜花。
const goShopping = () => {
  if (order.value?.type === 'custom') return uni.redirectTo({ url: '/pages/bouquets/index' })
  uni.switchTab({ url: '/pages/order/index' })
}
// 返回首页查看其他鲜花和活动。
const goHome = () => {
  uni.switchTab({ url: '/pages/index/index' })
}
// 打开当前订单的详情。
const viewOrder = () => {
  if (order.value)
    uni.navigateTo({ url: `/pages/order-detail/index?orderNo=${order.value.orderNo}` })
}
const stopPolling = () => {
  pollingVersion++
  if (timer) clearInterval(timer)
  timer = undefined
}
onLoad((options) => {
  orderNo.value = options?.orderNo || ''
})
const resource = useResource(() => {
  if (!orderNo.value) throw new Error('订单编号缺失')
  return getOrder(orderNo.value)
}, true)
const order = computed(() => resource.data.value || null)
const loading = resource.loading
const failed = computed(() => Boolean(resource.message.value))
let timer: ReturnType<typeof setInterval> | undefined
let attempts = 0
let pollingVersion = 0
// 从服务端读取订单状态，不将客户端支付成功回调直接视为服务端已收款。
onShow(() => {
  stopPolling()
  const version = pollingVersion
  attempts = 0
  const token = userStore.token
  void loadOrder().then(() => {
    if (
      version !== pollingVersion ||
      token !== userStore.token ||
      order.value?.paymentStatus !== 'PENDING'
    )
      return
    timer = setInterval(() => {
      if (resource.loading.value) return
      if (++attempts >= 6 || token !== userStore.token) return stopPolling()
      void loadOrder()
    }, 2500)
  })
})
onUnload(stopPolling)
onHide(stopPolling)
</script>

<template>
  <view v-if="order" class="result-page">
    <view class="panel order-panel">
      <view class="success-section">
        <view class="panel-heading">
          <text class="success-title">{{ orderTitle(order) }}</text>
          <text class="status-tag">{{ orderStatus(order) }}</text>
        </view>
        <text class="success-copy">{{
          order.paymentStatus === 'PENDING'
            ? '正在确认支付结果；稍后可刷新或查看订单继续支付'
            : '订单已保存，可在我的订单中查看'
        }}</text>
        <button v-if="order.paymentStatus === 'PENDING'" :disabled="loading" @click="loadOrder">
          刷新支付结果
        </button>
        <text class="amount">
          <text class="currency">¥</text>
          {{ order.total.toFixed(2) }}
        </text>
        <text class="amount-label">订单金额 · {{ orderPaymentLabel(order) }}</text>
      </view>
      <OrderProducts :order="order" />
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
@use './result.scss' as page;
</style>
