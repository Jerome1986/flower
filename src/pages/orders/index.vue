<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import type { PreviewOrder } from '../checkout/preview-order'
import { useUserStore } from '@/stores/modules/user'
import { readOrders, orderStatus, orderHint } from '@/services/preview-orders'

// 当前账户，用户订单只展示该用户的订单。
const userStore = useUserStore()

// 当前订单状态筛选。
const activeTab = ref('all')
// 订单状态分类，沿用我的页面入口。
const tabs = [
  { id: 'all', name: '全部' },
  { id: 'unpaid', name: '待付款' },
  { id: 'processing', name: '待接单 / 制作' },
  { id: 'fulfillment', name: '待自取 / 配送' },
  { id: 'completed', name: '已完成' },
]
// 本地提交的模拟订单列表。
const orders = ref<PreviewOrder[]>([])
// 按最新履约状态筛选用户订单。
const visibleOrders = computed(() =>
  orders.value.filter(
    (order) =>
      activeTab.value === 'all' ||
      (activeTab.value === 'processing' &&
        (!order.status || ['pending', 'preparing'].includes(order.status))) ||
      (activeTab.value === 'fulfillment' && ['ready', 'delivering'].includes(order.status || '')) ||
      (activeTab.value === 'completed' && order.status === 'completed'),
  ),
)
// 将模拟履约状态转换为用户可读文案。
function statusLabel(order: PreviewOrder) {
  return orderStatus(order)
}
// 订单卡片的提示随履约状态更新。
function fulfillmentHint(order: PreviewOrder) {
  return orderHint(order)
}
// 当前分类对应的空状态提示。
const emptyText = computed(() =>
  activeTab.value === 'all'
    ? '还没有鲜花订单'
    : `暂无${tabs.find((tab) => tab.id === activeTab.value)?.name}订单`,
)

// 接收我的页面传入的状态分类。
onLoad((options) => {
  if (tabs.some((tab) => tab.id === options?.status)) activeTab.value = options!.status!
})
// 刷新模拟订单并兼容此前仅保存的单笔订单。
onShow(() => {
  if (userStore.profile?.role === 'manager') {
    uni.redirectTo({ url: '/pages/store-orders/index' })
    return
  }
  // 本地订单历史数据。
  orders.value = readOrders()
  orders.value =
    userStore.profile?.role === 'user'
      ? orders.value.filter((order) => (order.userId || 'test-user') === userStore.profile?.id)
      : []
})
// 切换订单状态分类。
function changeTab(id: string) {
  activeTab.value = id
}
// 打开指定订单的详情页。
function viewOrder(orderNo: string) {
  uni.navigateTo({ url: `/pages/order-detail/index?orderNo=${orderNo}` })
}
// 返回下单页挑选鲜花。
function goShopping() {
  uni.switchTab({ url: '/pages/order/index' })
}
</script>

<template>
  <view class="orders-page">
    <view class="page-intro">
      <text class="eyebrow">一花一份心意</text>
      <text class="page-title">我的鲜花订单</text>
      <text class="subtitle">每一份美好，都在这里留下记录</text>
    </view>
    <scroll-view class="status-tabs" scroll-x>
      <view class="tabs-row">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="{ active: activeTab === tab.id }"
          @click="changeTab(tab.id)"
        >
          {{ tab.name }}
        </button>
      </view>
    </scroll-view>
    <view v-if="visibleOrders.length" class="order-list">
      <view
        v-for="order in visibleOrders"
        :key="order.orderNo"
        class="order-card"
        @click="viewOrder(order.orderNo)"
      >
        <view class="card-heading">
          <text class="store-name">
            {{ order.storeName }}
            <text class="iconfont icon-youjiantou1" />
          </text>
          <text class="order-status">{{ statusLabel(order) }}</text>
        </view>
        <view class="order-tags">
          <text>{{ order.type === 'custom' ? '平台定制' : '门店鲜花' }}</text>
          <text>{{ order.method === 'pickup' ? '门店自取' : '鲜花到家' }}</text>
        </view>
        <view class="product-row">
          <image :src="order.image" mode="aspectFill" />
          <view class="product-copy">
            <text class="product-name">{{ order.productName }}</text>
            <text class="muted">{{ order.specification }} / {{ order.unit }}</text>
            <text class="muted">数量 {{ order.quantity }} {{ order.unit }}</text>
          </view>
        </view>
        <view class="order-summary">
          <text class="order-date">{{ order.createdAt || '模拟订单' }}</text>
          <text class="total">
            实付
            <text class="price">¥{{ order.total.toFixed(2) }}</text>
          </text>
        </view>
        <view class="card-footer">
          <text class="footer-hint">{{ fulfillmentHint(order) }}</text>
          <button class="detail-button" @click.stop="viewOrder(order.orderNo)">查看订单</button>
        </view>
      </view>
      <text class="list-end">已经看到全部订单啦</text>
    </view>
    <view v-else class="empty-state">
      <view class="empty-icon"><text class="iconfont icon-hua" /></view>
      <text class="empty-title">{{ emptyText }}</text>
      <text class="muted">挑一份喜欢的花，让日常多一点美好</text>
      <button class="shopping-button" @click="goShopping">去选花</button>
    </view>
    <text class="demo-note">当前展示前端模拟订单</text>
  </view>
</template>

<style lang="scss" scoped>
@use './orders.scss';
</style>
