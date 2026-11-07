<script setup lang="ts">
import { getManagedStoresApi as getManagedStores } from '@/api/manage-orders'
import { getCurrentUserApi as getCurrentUser } from '@/api/user'
import OrderProducts from '@/components/order-products.vue'
import { orderStatus } from '@/pages/orders/order-display'
import { getManageOrders, manageAction, performAction } from '@/pages/store-orders/order-actions'
import { useUserStore } from '@/stores/modules/user'
import type { PreviewOrder } from '@/types/order'
import { UserRole } from '@/types/user'
import { onReachBottom, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
const userStore = useUserStore()
const isManager = computed(
  () => Boolean(userStore.token) && userStore.profile?.role === UserRole.STORE_MANAGER,
)
const stores = ref<
  {
    id: number
    name: string
  }[]
>([])
const selectedStoreId = ref<number>()
const store = computed(() => stores.value.find((item) => item.id === selectedStoreId.value))
const orders = ref<PreviewOrder[]>([])
const activeTab = ref('all')
const tabs = [
  { id: 'all', name: '全部' },
  { id: 'unpaid', name: '待付款' },
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
const loadOrders = async (more = false) => {
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
const init = async () => {
  const version = ++initVersion
  requestVersion++
  const token = userStore.token
  orders.value = []
  stores.value = []
  page.value = 1
  total.value = 0
  loading.value = false
  failed.value = false
  if (!token) return
  try {
    const { data } = await getCurrentUser()
    if (version !== initVersion || token !== userStore.token) return
    userStore.setProfile(data)
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
const chooseStore = (event: {
  detail: {
    value: string | number
  }
}) => {
  const selected = stores.value[Number(event.detail.value)]
  if (!selected) return
  selectedStoreId.value = selected.id
  orders.value = []
  void loadOrders()
}
const statusLabel = (order: PreviewOrder) => {
  return orderStatus(order)
}
const actionLabel = (order: PreviewOrder) => {
  return manageAction(order)?.label || ''
}
const advanceOrder = async (order: PreviewOrder, cancel = false) => {
  if (
    busy.value ||
    loading.value ||
    !isManager.value ||
    order.storeId !== String(selectedStoreId.value)
  )
    return
  const token = userStore.token
  busy.value = true
  try {
    await performAction(order, cancel)
    if (token === userStore.token) await loadOrders()
  } finally {
    if (token === userStore.token) busy.value = false
  }
}
const contactCustomer = (phone: string) => {
  uni.makePhoneCall({ phoneNumber: phone })
}
const viewOrder = (no: string) => {
  uni.navigateTo({ url: '/pages/store-order-detail/index?orderNo=' + encodeURIComponent(no) })
}
const goMy = () => {
  uni.switchTab({ url: '/pages/my/index' })
}
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
</script>

<template>
  <view v-if="isManager" class="manager-page">
    <view class="page-intro">
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
      <OrderProducts :order="order" />
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
    <button @click="init">刷新订单</button>
    <button v-if="orders.length < total" @click="loadOrders(true)">加载更多</button>
    <text class="demo-note">操作实时保存到服务器，订单状态会同步到用户端</text>
  </view>
  <view v-else class="empty-state">
    <text>请先使用店长身份登录</text>
    <button @click="goMy">返回我的</button>
  </view>
</template>

<style lang="scss" scoped>
@use './store-orders.scss' as page;
</style>
