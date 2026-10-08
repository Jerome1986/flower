<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { mockStores } from '../index/mock-data'
import type { PreviewOrder } from '../checkout/preview-order'
import {
  readOrders,
  orderStatus,
  orderAction,
  advanceOrder as advancePreviewOrder,
} from '@/services/preview-orders'

// 当前测试账户，用于限制店长入口和本店数据。
const userStore = useUserStore()
// 店长绑定的门店。
const store = computed(() => mockStores.find((item) => item.id === userStore.profile?.storeId))
// 当前账户是否为店长，测试中不验证订单所属门店。
const isManager = computed(() => userStore.profile?.role === 'manager')
// 本地模拟订单数据。
const orders = ref<PreviewOrder[]>([])
// 当前筛选的订单状态。
const activeTab = ref('all')
// 门店订单管理的筛选分类。
const tabs = [
  { id: 'all', name: '全部' },
  { id: 'pending', name: '待接单' },
  { id: 'preparing', name: '备货中' },
  { id: 'ready', name: '已备货' },
  { id: 'delivering', name: '配送中' },
  { id: 'completed', name: '已完成' },
]
// 流程测试暂不验证门店归属，展示全部用户普通模拟订单。
const storeOrders = computed(() =>
  isManager.value ? orders.value.filter((order) => order.type !== 'custom') : [],
)
// 当前分类显示的订单。
const visibleOrders = computed(() =>
  storeOrders.value.filter(
    (order) => activeTab.value === 'all' || (order.status || 'pending') === activeTab.value,
  ),
)
// 流程测试中需要处理的普通订单数量。
const pendingCount = computed(
  () => storeOrders.value.filter((order) => order.status !== 'completed').length,
)

// 每次进入刷新本地模拟订单。
onShow(() => {
  orders.value = isManager.value ? readOrders() : []
})
// 获取当前订单的状态文案。
function statusLabel(order: PreviewOrder) {
  return orderStatus(order)
}
// 根据履约状态展示下一步操作。
function actionLabel(order: PreviewOrder) {
  return orderAction(order)
}
// 推进普通模拟订单状态，核销时校验取货码。
function advanceOrder(order: PreviewOrder) {
  if (!isManager.value || !storeOrders.value.some((item) => item.orderNo === order.orderNo)) return
  advancePreviewOrder(order.orderNo, userStore.profile?.storeId || '', () => {
    orders.value = readOrders()
  })
}
// 拨打订单中收货人的联系电话。
function contactCustomer(phone: string) {
  uni.makePhoneCall({ phoneNumber: phone })
}
// 打开店长专用订单详情，与用户详情页面分开。
function viewOrder(orderNo: string) {
  uni.navigateTo({ url: `/pages/store-order-detail/index?orderNo=${orderNo}` })
}

// 返回我的页面切换测试身份。
function goMy() {
  uni.switchTab({ url: '/pages/my/index' })
}
</script>

<template>
  <view v-if="isManager" class="manager-page">
    <text class="eyebrow">店长工作台</text>
    <text class="page-title">门店订单管理</text>
    <view class="store-summary">
      <text>{{ store?.name }}</text>
      <text class="hint">{{ pendingCount }} 笔待处理 · 全部普通模拟订单</text>
      <text class="hint">流程测试中，暂不验证订单所属门店</text>
    </view>
    <scroll-view class="tabs" scroll-x>
      <view class="tabs-row">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.name }}
        </button>
      </view>
    </scroll-view>
    <view
      v-for="order in visibleOrders"
      :key="order.orderNo"
      class="order-card"
      @click="viewOrder(order.orderNo)"
    >
      <view class="card-heading">
        <text class="section-title">{{ order.productName }}</text>
        <text class="status-label">{{ statusLabel(order) }}</text>
      </view>
      <view class="product-row">
        <image :src="order.image" mode="aspectFill" />
        <view>
          <text>{{ order.specification }} / {{ order.unit }} × {{ order.quantity }}</text>
          <text class="hint">{{ order.method === 'pickup' ? '门店自取' : '门店配送' }}</text>
          <text class="hint">实付 ¥{{ order.total.toFixed(2) }}</text>
        </view>
      </view>
      <text class="contact-info">{{ order.contactName }} · {{ order.phone }}</text>
      <text v-if="order.method === 'delivery'" class="hint">{{ order.address }}</text>
      <text class="hint">备注：{{ order.remark || '无' }}</text>
      <text v-if="order.pickupCode && order.status === 'ready'" class="pickup-code">
        模拟取货码：{{ order.pickupCode }}
      </text>
      <text class="hint">订单编号：{{ order.orderNo }}</text>
      <text class="hint">{{ order.createdAt || '模拟订单' }}</text>
      <view class="actions">
        <button class="contact-button" @click.stop="viewOrder(order.orderNo)">查看详情</button>
        <button class="contact-button" @click.stop="contactCustomer(order.phone)">联系客户</button>
        <button v-if="actionLabel(order)" class="action-button" @click.stop="advanceOrder(order)">
          {{ actionLabel(order) }}
        </button>
        <text v-else class="hint">订单已完成</text>
      </view>
    </view>
    <view v-if="!visibleOrders.length" class="empty-state">
      <text class="iconfont icon-hua" />
      <text>暂无此状态的普通订单</text>
      <text class="hint">可用用户身份提交普通鲜花模拟订单</text>
    </view>
    <text class="demo-note">状态操作仅用于本地前端预览</text>
  </view>
  <view v-else class="empty-state">
    <text>请先使用店长身份登录</text>
    <button @click="goMy">返回我的</button>
  </view>
</template>

<style lang="scss" scoped>
@use './store-orders.scss';
</style>
