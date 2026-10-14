<script setup lang="ts">
import type { PreviewOrder } from '@/types/order'
import { computed, ref, watch } from 'vue'
import { onShow, onReachBottom, onUnload } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { getCurrentUserApi as getCurrentUser } from '@/api/user'
import { toProfile } from '@/pages/test-login/user-profile'
import { getManagedStoresApi as getManagedStores } from '@/api/manage-orders'
import { getManageOrders, manageAction, performAction } from '@/pages/store-orders/order-actions'
import { orderStatus } from '@/pages/orders/order-display'
const userStore = useUserStore()
const isManager = computed(() => Boolean(userStore.token) && userStore.profile?.role === 'manager')
const stores = ref<{ id: number; name: string }[]>([])
const selectedStoreId = ref<number>()
const store = computed(() => stores.value.find((item) => item.id === selectedStoreId.value))
const orders = ref<PreviewOrder[]>([])
const activeTab = ref('all')
const tabs = [
  { id: 'all', name: '全部' },
  { id: 'unpaid', name: '待确认测试单' },
  { id: 'pending', name: '待接单' },
  { id: 'preparing', name: '备货中' },
  { id: 'ready', name: '已备货' },
  { id: 'delivering', name: '配送中' },
  { id: 'completed', name: '已完成' },
  { id: 'cancelled', name: '已取消 / 关闭' },
]
const loading = ref(false)
const failed = ref(false)
const busy = ref(false)
const page = ref(1)
const total = ref(0)
let requestVersion = 0
onUnload(() => {
  requestVersion++
  initVersion++
})
let initVersion = 0
watch(
  () => userStore.token,
  () => {
    requestVersion++
    initVersion++
    orders.value = []
    stores.value = []
    selectedStoreId.value = undefined
    total.value = 0
    loading.value = false
    busy.value = false
  },
  { flush: 'sync' },
)
const visibleOrders = computed(() =>
  orders.value.filter((order) => activeTab.value === 'all' || order.status === activeTab.value),
)
const pendingCount = computed(
  () =>
    orders.value.filter((order) => !['completed', 'cancelled'].includes(order.status || '')).length,
)
async function loadOrders(more = false) {
  if ((more && loading.value) || !isManager.value || selectedStoreId.value === undefined) return
  const version = ++requestVersion
  const token = userStore.token
  loading.value = true
  failed.value = false
  const nextPage = more ? page.value + 1 : 1
  try {
    const data = await getManageOrders({
      page: nextPage,
      pageSize: 20,
      storeId: selectedStoreId.value,
      statusGroup: activeTab.value,
    })
    if (version !== requestVersion || token !== userStore.token) return
    const ordinary = data.list.filter((order) => order.type === 'ordinary')
    orders.value = more ? [...orders.value, ...ordinary] : ordinary
    page.value = nextPage
    total.value = data.total
  } catch {
    if (version === requestVersion) {
      failed.value = true
      if (!more) orders.value = []
    }
  } finally {
    if (version === requestVersion) loading.value = false
  }
}
async function init() {
  const version = ++initVersion
  requestVersion++
  const token = userStore.token
  orders.value = []
  stores.value = []
  failed.value = false
  if (!token) return
  try {
    const { data } = await getCurrentUser()
    if (version !== initVersion || token !== userStore.token) return
    userStore.setProfile(toProfile(data))
    if (!isManager.value) {
      orders.value = []
      return
    }
    const managed = (await getManagedStores()).data
    if (version !== initVersion || token !== userStore.token) return
    stores.value = managed
    if (!stores.value.some((item) => item.id === selectedStoreId.value))
      selectedStoreId.value = stores.value[0]?.id
    if (stores.value.length) await loadOrders()
  } catch {
    if (version === initVersion && token === userStore.token) failed.value = true
  }
}
onShow(() => {
  void init()
})
onReachBottom(() => {
  if (orders.value.length < total.value) void loadOrders(true)
})
watch(activeTab, () => {
  orders.value = []
  void loadOrders()
})
function chooseStore(event: { detail: { value: string | number } }) {
  selectedStoreId.value = stores.value[Number(event.detail.value)]?.id
  orders.value = []
  void loadOrders()
}
function statusLabel(order: PreviewOrder) {
  return orderStatus(order)
}
function actionLabel(order: PreviewOrder) {
  return manageAction(order)?.label || ''
}
async function advanceOrder(order: PreviewOrder, cancel = false) {
  if (busy.value) return
  const token = userStore.token
  busy.value = true
  try {
    await performAction(order, cancel)
    if (token === userStore.token) await loadOrders()
  } finally {
    if (token === userStore.token) busy.value = false
  }
}
function contactCustomer(phone: string) {
  uni.makePhoneCall({ phoneNumber: phone })
}
function viewOrder(no: string) {
  uni.navigateTo({ url: '/pages/store-order-detail/index?orderNo=' + no })
}
function goMy() {
  uni.switchTab({ url: '/pages/my/index' })
}
</script>

<template>
  <view v-if="isManager" class="manager-page">
    <text class="eyebrow">店长工作台</text>
    <text class="page-title">门店订单管理</text>
    <view class="store-summary">
      <picker v-if="stores.length > 1" :range="stores" range-key="name" @change="chooseStore"
        ><text>{{ store?.name }} · 切换门店</text></picker
      >
      <text v-else>{{ store?.name }}</text>
      <text class="hint">已加载订单中 {{ pendingCount }} 笔待处理</text>
      <text class="hint">仅显示负责门店的普通订单</text>
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
          <text class="hint">订单金额 ¥{{ order.total.toFixed(2) }}</text>
        </view>
      </view>
      <text class="contact-info">{{ order.contactName }} · {{ order.phone }}</text>
      <text v-if="order.method === 'delivery'" class="hint">{{ order.address }}</text>
      <text class="hint">备注：{{ order.remark || '无' }}</text>
      <text class="hint">订单编号：{{ order.orderNo }}</text>
      <text class="hint">{{ order.createdAt || '模拟订单' }}</text>
      <view class="actions">
        <button class="contact-button" @click.stop="viewOrder(order.orderNo)">查看详情</button>
        <button class="contact-button" @click.stop="contactCustomer(order.phone)">联系客户</button>
        <button
          v-if="actionLabel(order)"
          :disabled="busy"
          class="action-button"
          @click.stop="advanceOrder(order)"
        >
          {{ actionLabel(order) }}
        </button>
        <text v-if="!actionLabel(order)" class="hint">{{ statusLabel(order) }}</text>
      </view>
    </view>
    <view v-if="!visibleOrders.length" class="empty-state">
      <text class="iconfont icon-hua" />
      <text>暂无此状态的普通订单</text>
      <text class="hint">{{
        loading ? '正在加载…' : failed ? '加载失败，请重试' : '用户下单后将在这里显示'
      }}</text>
    </view>
    <button @click="loadOrders()">刷新订单</button>
    <button v-if="orders.length < total" @click="loadOrders(true)">加载更多</button>
    <text class="demo-note">操作实时保存到服务器，订单状态会同步到用户端</text>
  </view>
  <view v-else class="empty-state">
    <text>请先使用店长身份登录</text>
    <button @click="goMy">返回我的</button>
  </view>
</template>

<style lang="scss" scoped>
@use './store-orders.scss';
</style>
