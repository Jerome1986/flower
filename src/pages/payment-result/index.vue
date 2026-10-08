<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { PreviewOrder } from '../checkout/preview-order'
import { useUserStore } from '@/stores/modules/user'
import { findOrder, orderStatus } from '@/services/preview-orders'

// 当前展示的前端模拟成功订单。
const order = ref<PreviewOrder | null>(null)
// 支付结果只展示当前用户自己的订单。
const userStore = useUserStore()

// 从确认订单页读取模拟订单，不请求真实支付。
onShow(() => {
  order.value = findOrder()
  if (
    userStore.profile?.role !== 'user' ||
    (order.value && (order.value.userId || 'test-user') !== userStore.profile.id)
  )
    order.value = null
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
      <view class="success-icon"><UniIcons type="checkmarkempty" size="38" color="#32845b" /></view>
      <text class="success-title">{{ order.total === 0 ? '领取成功' : '支付成功' }}</text>
      <text class="success-copy">
        {{
          order.type === 'custom'
            ? '平台已收到心意，将为你安排制作与配送'
            : '心意已送达花店，鲜花正在等待与你相遇'
        }}
      </text>
      <text class="amount">
        <text class="currency">¥</text>
        {{ order.total.toFixed(2) }}
      </text>
      <text class="amount-label">{{ order.total === 0 ? '本单应付金额' : '本单支付金额' }}</text>
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
          {{
            order.type === 'custom'
              ? '平台将安排合作方制作配送，请保持电话畅通。'
              : order.method === 'pickup'
              ? '花店备货完成后，订单详情会显示取货码，请在营业时间内到店自取。'
              : '花店接单备货后安排配送，请保持电话畅通，耐心等待鲜花送达。'
          }}
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
    <text class="preview-note">模拟订单已提交，默认支付成功，未发生真实扣款</text>
  </view>
  <view v-else class="empty-state">
    <text>暂无订单信息</text>
    <button @click="goShopping">去选花</button>
  </view>
</template>

<style lang="scss" scoped>
@use './result.scss';
</style>
