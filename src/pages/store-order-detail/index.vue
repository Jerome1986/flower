<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import type { PreviewOrder } from '../checkout/preview-order'
import {
  findOrder,
  orderStages,
  orderStageIndex,
  orderAction,
  advanceOrder as advancePreviewOrder,
} from '@/services/preview-orders'

// 当前测试账户，只有店长可处理普通订单。
const userStore = useUserStore()
// 当前详情的订单编号。
const orderNo = ref('')
// 当前普通模拟订单。
const order = ref<PreviewOrder | null>(null)
// 店长身份判断，流程测试不验证门店归属。
const isManager = computed(() => userStore.profile?.role === 'manager')
// 当前订单的进度步骤，配送区分已备货与配送中。
const stages = computed(() => orderStages(order.value))
// 当前高亮的履约步骤。
const stageIndex = computed(() => orderStageIndex(order.value))
// 当前状态的名称。
const statusTitle = computed(() => stages.value[stageIndex.value])
// 下一步操作按钮名称。
const actionLabel = computed(() => (order.value ? orderAction(order.value) : ''))
// 兼容旧订单的商品金额。
const productAmount = computed(() => order.value?.productAmount ?? order.value?.total ?? 0)

// 读取入口传入的订单编号。
onLoad((options) => {
  orderNo.value = options?.orderNo || ''
})
// 返回详情时刷新当前订单状态。
onShow(loadOrder)

// 加载指定普通订单，不展示平台定制单。
function loadOrder() {
  if (!isManager.value) {
    order.value = null
    return
  }
  // 本次请求查看的订单。
  const found = findOrder(orderNo.value)
  order.value = found?.type !== 'custom' ? found : null
}
// 推进模拟订单，自取完成需验证取货码。
function advanceOrder() {
  loadOrder()
  if (!order.value || !actionLabel.value) return
  advancePreviewOrder(order.value.orderNo, userStore.profile?.storeId || '', (updated) => {
    order.value = updated
  })
}
// 联系订单中的收货人。
function contactCustomer() {
  if (order.value) uni.makePhoneCall({ phoneNumber: order.value.phone })
}
// 复制当前订单编号。
function copyOrderNo() {
  if (order.value) uni.setClipboardData({ data: order.value.orderNo })
}
// 返回店长管理列表。
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
        <text v-if="order.status === 'ready'" class="pickup-code">{{ order.pickupCode }}</text>
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
        <text>实付金额</text>
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
        <text class="info-value">{{ order.total === 0 ? '0元确认成功' : '模拟支付成功' }}</text>
      </view>
    </view>
    <text class="demo-note">流程测试暂不验证门店归属，操作同步到用户订单</text>
    <view class="action-bar">
      <button class="contact-button" @click="contactCustomer">联系客户</button>
      <button v-if="actionLabel" class="shopping-button" @click="advanceOrder">
        {{ actionLabel }}
      </button>
      <button v-else class="contact-button" @click="goOrders">返回订单列表</button>
    </view>
  </view>
  <view v-else class="empty-state">
    <text>{{ isManager ? '暂无可查看的普通订单' : '请先使用店长身份登录' }}</text>
    <button @click="goOrders">返回订单管理</button>
  </view>
</template>

<style lang="scss" scoped>
@use '../order-detail/detail.scss';
</style>
