<script setup lang="ts">
import type { PreviewOrder } from '@/types/order'
import { computed, ref, watch } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { getCurrentUserApi as getCurrentUser } from '@/api/user'
import { toProfile } from '@/pages/test-login/user-profile'
import { getManageOrder, manageAction, performAction, orderActionLabels } from '@/pages/store-orders/order-actions'
import { orderStages, orderStageIndex, orderStatus } from '@/pages/orders/order-display'
const userStore = useUserStore()
const orderNo = ref('')
const order = ref<PreviewOrder | null>(null)
const loading = ref(false)
const failed = ref(false)
const busy = ref(false)
let requestVersion = 0
onUnload(() => {
  requestVersion++
})
watch(
  () => userStore.token,
  () => {
    requestVersion++
    order.value = null
    loading.value = false
    busy.value = false
  },
  { flush: 'sync' },
)
const isManager = computed(() => Boolean(userStore.token) && userStore.profile?.role === 'manager')
const stages = computed(() => orderStages(order.value))
const stageIndex = computed(() => orderStageIndex(order.value))
const statusTitle = computed(() => (order.value ? orderStatus(order.value) : ''))
const actionLabel = computed(() => (order.value ? manageAction(order.value)?.label || '' : ''))
const productAmount = computed(() => order.value?.productAmount || 0)
onLoad((options) => {
  orderNo.value = options?.orderNo || ''
})
onShow(() => {
  void loadOrder()
})
async function loadOrder() {
  const version = ++requestVersion
  const token = userStore.token
  order.value = null
  if (!token || !orderNo.value) return
  loading.value = true
  failed.value = false
  try {
    const { data } = await getCurrentUser()
    if (version !== requestVersion || token !== userStore.token) return
    userStore.setProfile(toProfile(data))
    if (isManager.value) {
      const result = await getManageOrder(orderNo.value)
      if (version === requestVersion && token === userStore.token && result.type === 'ordinary')
        order.value = result
    }
  } catch {
    if (version === requestVersion) failed.value = true
  } finally {
    if (version === requestVersion) loading.value = false
  }
}
async function advanceOrder(cancel = false) {
  if (busy.value || !order.value) return
  const token = userStore.token
  busy.value = true
  try {
    await performAction(order.value, cancel)
    if (token === userStore.token) await loadOrder()
  } finally {
    if (token === userStore.token) busy.value = false
  }
}
function contactCustomer() {
  if (order.value) uni.makePhoneCall({ phoneNumber: order.value.phone })
}
function copyOrderNo() {
  if (order.value) uni.setClipboardData({ data: order.value.orderNo })
}
function goOrders() {
  uni.redirectTo({ url: '/pages/store-orders/index' })
}
</script>

<template>
  <view v-if="isManager && order" class="detail-page">
    <view class="status-section">
      <text class="eyebrow">店长工作台 · 普通订单</text>
      <text class="status-title">{{ statusTitle }}</text>
      <text class="status-copy">
        {{ order.storeName }} · {{ order.method === 'pickup' ? '门店自取' : '门店配送' }}
      </text>
      <view class="progress">
        <view
          v-for="(stage, index) in stages"
          :key="stage"
          class="progress-step"
          :class="{ active: index <= stageIndex, current: index === stageIndex }"
        >
          <view class="progress-dot" />
          <text>{{ stage }}</text>
        </view>
      </view>
    </view>
    <view class="panel">
      <view class="panel-heading">
        <text class="section-title">客户与履约信息</text>
        <text class="tag">{{ order.method === 'pickup' ? '自取' : '配送' }}</text>
      </view>
      <text class="store-name">{{ order.contactName }} · {{ order.phone }}</text>
      <text v-if="order.method === 'delivery'" class="muted">收货地址：{{ order.address }}</text>
      <text class="muted">履约门店：{{ order.storeName }}</text>
      <text class="muted">{{ order.storeAddress }}</text>
      <view class="contact-info">
        <text>客户备注</text>
        <text class="muted">{{ order.remark || '无备注' }}</text>
      </view>
    </view>
    <view v-if="order.method === 'pickup'" class="pickup-note">
      <text class="iconfont icon-shouye1" />
      <view>
        <text class="note-title">
          {{
            order.status === 'completed'
              ? '已核销完成'
              : order.status === 'ready'
              ? '等待客户到店核销'
              : '备货完成后生成取货码'
          }}
        </text>
        <text class="muted">
          {{
            order.status === 'completed'
              ? '此订单已完成，请勿重复交付'
              : '核对客户出示的取货码后再交付鲜花'
          }}
        </text>
      </view>
    </view>
    <view class="panel">
      <text class="section-title">商品与金额</text>
      <view class="product-row">
        <image :src="order.image" mode="aspectFill" />
        <view class="product-copy">
          <text class="product-name">{{ order.productName }}</text>
          <text class="muted">{{ order.specification }} / {{ order.unit }}</text>
          <text class="muted">数量 {{ order.quantity }} {{ order.unit }}</text>
        </view>
      </view>
      <view class="amount-row">
        <text>商品金额</text>
        <text>¥{{ productAmount.toFixed(2) }}</text>
      </view>
      <view class="amount-row">
        <text>配送费</text>
        <text>¥{{ (order.deliveryFee || 0).toFixed(2) }}</text>
      </view>
      <view class="amount-row">
        <text>优惠券抵扣</text>
        <text class="discount">−¥{{ (order.discount || 0).toFixed(2) }}</text>
      </view>
      <view class="amount-row total-row">
        <text>订单金额</text>
        <text class="price">¥{{ order.total.toFixed(2) }}</text>
      </view>
    </view>
    <view class="panel">
      <text class="section-title">订单信息</text>
      <view class="info-row">
        <text>订单编号</text>
        <view class="order-number">
          <text>{{ order.orderNo }}</text>
          <button @click="copyOrderNo">复制</button>
        </view>
      </view>
      <view class="info-row">
        <text>下单时间</text>
        <text class="info-value">{{ order.createdAt || '模拟订单' }}</text>
      </view>
      <view class="info-row">
        <text>支付状态</text>
        <text class="info-value">{{
          order.paymentStatus === 'NOT_REQUIRED' && order.total > 0
            ? '支付待接入'
            : order.paymentStatus
        }}</text>
      </view>
    </view>
    <view class="panel"
      ><text class="section-title">操作记录</text
      ><view v-for="(log, index) in order.logs" :key="index" class="info-row"
        ><text>{{ orderActionLabels[log.action] || log.action }}</text
        ><text class="muted">{{ log.createdAt }}</text></view
      ></view
    >
    <text class="demo-note">仅允许操作负责门店的订单，状态同步到用户端</text>
    <view class="action-bar">
      <button class="contact-button" @click="contactCustomer">联系客户</button>
      <button
        v-if="actionLabel"
        :disabled="busy"
        class="shopping-button"
        @click="advanceOrder(false)"
      >
        {{ actionLabel }}
      </button>
      <button v-else class="contact-button" @click="goOrders">返回订单列表</button>
    </view>
  </view>
  <view v-else class="empty-state">
    <text>{{
      loading
        ? '正在加载…'
        : failed
        ? '加载失败或无权查看订单'
        : isManager
        ? '暂无可查看的普通订单'
        : '请先使用店长身份登录'
    }}</text>
    <button v-if="failed" @click="loadOrder">重新加载</button>
    <button @click="goOrders">返回订单管理</button>
  </view>
</template>

<style lang="scss" scoped>
@use '../order-detail/detail.scss';
</style>
