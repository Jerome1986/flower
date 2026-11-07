<script setup lang="ts">
import OrderProducts from '@/components/order-products.vue'
import { useResource } from '@/composables/use-resource'
import { getOrders } from '@/pages/orders/order-data'
import { orderHint, orderStatus } from '@/pages/orders/order-display'
import { useUserStore } from '@/stores/modules/user'
import type { PreviewOrder } from '@/types/order'
import { openAuthPage } from '@/utils/login-return'
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
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
  { id: 'cancelled', name: '取消 / 退款' },
]
// 数据以当前账户的服务端响应为准。
const resource = useResource(() => getOrders())
const orders = computed(() => resource.data.value || [])
const loading = resource.loading
const failed = computed(() => Boolean(resource.message.value))
// 按最新履约状态筛选用户订单。
const visibleOrders = computed(() =>
  orders.value.filter(
    (order) =>
      activeTab.value === 'all' ||
      (activeTab.value === 'unpaid' && order.status === 'unpaid') ||
      (activeTab.value === 'cancelled' &&
        ['cancelling', 'cancelled'].includes(order.status || '')) ||
      (activeTab.value === 'processing' &&
        (!order.status || ['pending', 'preparing'].includes(order.status))) ||
      (activeTab.value === 'fulfillment' && ['ready', 'delivering'].includes(order.status || '')) ||
      (activeTab.value === 'completed' && order.status === 'completed'),
  ),
)
// 当前分类对应的空状态提示。
const emptyText = computed(() =>
  activeTab.value === 'all'
    ? '还没有鲜花订单'
    : `暂无${tabs.find((tab) => tab.id === activeTab.value)?.name}订单`,
)
const loadOrders = async () => {
  await resource.load()
}
// 将模拟履约状态转换为用户可读文案。
const statusLabel = (order: PreviewOrder) => {
  return orderStatus(order)
}
// 订单卡片的提示随履约状态更新。
const fulfillmentHint = (order: PreviewOrder) => {
  return orderHint(order)
}
// 切换订单状态分类。
const changeTab = (id: string) => {
  if (tabs.some((tab) => tab.id === id)) activeTab.value = id
}
const login = () => {
  openAuthPage('/pages/orders/index?status=' + activeTab.value)
}
// 打开指定订单的详情页。
const viewOrder = (orderNo: string) => {
  uni.navigateTo({ url: `/pages/order-detail/index?orderNo=${encodeURIComponent(orderNo)}` })
}
// 返回下单页挑选鲜花。
const goShopping = () => {
  uni.switchTab({ url: '/pages/order/index' })
}
// 接收我的页面传入的状态分类。
onLoad((options) => {
  if (tabs.some((tab) => tab.id === options?.status)) activeTab.value = options!.status!
})
// 刷新模拟订单并兼容此前仅保存的单笔订单。
onShow(() => {
  void loadOrders()
})
onPullDownRefresh(async () => {
  try {
    await loadOrders()
  } finally {
    uni.stopPullDownRefresh()
  }
})
</script>

<template>
  <view class="orders-page">
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
    <view v-if="loading || failed" class="empty-state">
      <text>{{ loading ? '正在加载订单…' : resource.message.value }}</text>
      <button v-if="!userStore.token" @click="login">登录查看订单</button>
      <button v-else-if="failed" @click="loadOrders">重新加载</button>
    </view>
    <view v-else-if="visibleOrders.length" class="order-list">
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
        <OrderProducts :order="order" />
        <view class="order-summary">
          <text class="order-date">{{ order.createdAt || '—' }}</text>
          <text class="total">
            订单金额
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
    <text class="demo-note">尚未接单或派单的免支付订单可在详情中取消</text>
  </view>
</template>

<style lang="scss" scoped>
@use './orders.scss' as page;
</style>
