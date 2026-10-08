<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import type { PreviewOrder } from '../checkout/preview-order'
import { useUserStore } from '@/stores/modules/user'
import {
  findOrder,
  orderStages,
  orderStageIndex,
  orderTitle,
  orderHint,
} from '@/services/preview-orders'

// 当前用户账户，店长订单在门店管理页展示。
const userStore = useUserStore()
// 当前需要读取的订单编号。
const orderNo = ref('')

// 当前展示的模拟订单快照。
const order = ref<PreviewOrder | null>(null)
// 订单履约进度，模拟订单默认为待接单。
const stages = computed(() => orderStages(order.value))
// 当前履约步骤，与店长页面一致。
const stageIndex = computed(() => orderStageIndex(order.value))
// 当前订单的用户状态标题。
const statusTitle = computed(() => (order.value ? orderTitle(order.value) : ''))
// 不同履约阶段的用户提示。
const statusCopy = computed(() => (order.value ? orderHint(order.value) : ''))
// 兼容此前提交的模拟订单商品金额。
const productAmount = computed(() => order.value?.productAmount ?? order.value?.total ?? 0)
// 当前订单的模拟配送费。
const deliveryFee = computed(() => order.value?.deliveryFee ?? 0)
// 当前订单的模拟优惠金额。
const discount = computed(() => order.value?.discount ?? 0)

// 读取本地模拟订单，保持与支付结果页一致。
onLoad((options) => {
  orderNo.value = options?.orderNo || ''
})
// 返回页面时刷新最新状态和取货码。
onShow(() => {
  if (userStore.profile?.role === 'manager') {
    order.value = null
    uni.redirectTo({ url: '/pages/store-orders/index' })
    return
  }
  // 已提交的模拟订单历史。
  order.value = findOrder(orderNo.value)
  if (
    userStore.profile?.role !== 'user' ||
    (order.value && (order.value.userId || 'test-user') !== userStore.profile.id)
  )
    order.value = null
})
// 复制已备货订单的取货码。
function copyPickupCode() {
  if (order.value?.status === 'ready' && order.value.pickupCode)
    uni.setClipboardData({ data: order.value.pickupCode })
}
// 复制订单编号，方便向门店咨询。
function copyOrderNo() {
  if (order.value) uni.setClipboardData({ data: order.value.orderNo })
}
// 使用系统电话入口联系履约门店。
function contactStore() {
  if (order.value?.type === 'custom')
    return uni.showToast({ title: '平台客服电话待配置', icon: 'none' })
  if (order.value) uni.makePhoneCall({ phoneNumber: order.value.storePhone })
}
// 返回下单页继续选购鲜花。
function goShopping() {
  uni.switchTab({ url: '/pages/order/index' })
}
</script>

<template>
  <view v-if="order" class="detail-page">
    <view class="status-section">
      <text class="eyebrow">我的鲜花订单</text>
      <text class="status-title">{{ statusTitle }}</text>
      <text class="status-copy">{{ statusCopy }}</text>
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
    <view v-if="order.method === 'pickup'" class="pickup-note">
      <text class="iconfont icon-shouye1" />
      <view>
        <template v-if="order.status === 'ready' && order.pickupCode">
          <text class="note-title">到店出示取货码</text>
          <view class="pickup-code-row">
            <text class="pickup-code">{{ order.pickupCode }}</text>
            <button @click="copyPickupCode">复制</button>
          </view>
          <text class="muted">请向店员出示，由店员核销后领取</text>
        </template>
        <template v-else>
          <text class="note-title">
            {{ order.status === 'completed' ? '已核销领取' : '取货码将在备货完成后显示' }}
          </text>
          <text class="muted">
            {{
              order.status === 'completed'
                ? '取货码已失效，愿鲜花为你带来好心情'
                : '请等待门店备货完成，再前往门店自取'
            }}
          </text>
        </template>
      </view>
    </view>
    <view class="panel">
      <view class="panel-heading">
        <text class="section-title">{{ order.method === 'pickup' ? '自取信息' : '配送信息' }}</text>
        <text class="tag">{{ order.method === 'pickup' ? '门店自取' : '鲜花到家' }}</text>
      </view>
      <text class="store-name">{{ order.storeName }}</text>
      <text class="muted">{{ order.storeAddress }}</text>
      <text class="muted">营业时间 {{ order.hours }}</text>
      <view class="contact-info">
        <text>{{ order.contactName }} · {{ order.phone }}</text>
        <text v-if="order.method === 'delivery'" class="muted">{{ order.address }}</text>
        <text v-else class="muted">备货完成后，凭取货码在营业时间内到店领取</text>
      </view>
    </view>
    <view class="panel">
      <text class="section-title">鲜花明细</text>
      <view class="product-row">
        <image :src="order.image" mode="aspectFill" />
        <view class="product-copy">
          <text class="product-name">{{ order.productName }}</text>
          <text class="muted">{{ order.specification }} / {{ order.unit }}</text>
          <text class="muted">数量 {{ order.quantity }} {{ order.unit }}</text>
        </view>
        <text class="product-price">¥{{ productAmount.toFixed(2) }}</text>
      </view>
      <view class="amount-row">
        <text>商品金额</text>
        <text>¥{{ productAmount.toFixed(2) }}</text>
      </view>
      <view class="amount-row">
        <text>配送费</text>
        <text>¥{{ deliveryFee.toFixed(2) }}</text>
      </view>
      <view class="amount-row">
        <text>优惠券抵扣</text>
        <text class="discount">−¥{{ discount.toFixed(2) }}</text>
      </view>
      <view class="amount-row total-row">
        <text>实付金额</text>
        <text class="price">¥{{ order.total.toFixed(2) }}</text>
      </view>
    </view>
    <view class="panel">
      <text class="section-title">订单信息</text>
      <view class="info-row">
        <text>订单类型</text>
        <text class="info-value">
          {{ order.type === 'custom' ? '平台定制订单' : '门店鲜花订单' }}
        </text>
      </view>
      <view class="info-row">
        <text>订单编号</text>
        <view class="order-number">
          <text>{{ order.orderNo }}</text>
          <button @click="copyOrderNo">复制</button>
        </view>
      </view>
      <view class="info-row">
        <text>下单时间</text>
        <text class="info-value">{{ order.createdAt || '演示订单' }}</text>
      </view>
      <view class="info-row">
        <text>支付状态</text>
        <text class="info-value">{{ order.total === 0 ? '0元确认成功' : '模拟支付成功' }}</text>
      </view>
      <view class="info-row remark-row">
        <text>订单备注</text>
        <text class="info-value">{{ order.remark || '无备注' }}</text>
      </view>
    </view>
    <text class="footer-note">
      {{
        order.type === 'custom'
          ? '如需取消或退款，请联系平台客服'
          : '如需取消或退款，请联系门店协助处理'
      }}
    </text>
    <text class="demo-note">当前为模拟订单，未发生真实扣款</text>
    <view class="action-bar">
      <button class="contact-button" @click="contactStore">
        {{ order.type === 'custom' ? '联系平台' : '联系门店' }}
      </button>
      <button class="shopping-button" @click="goShopping">继续选花</button>
    </view>
  </view>
  <view v-else class="empty-state">
    <text>暂无订单信息</text>
    <button @click="goShopping">去选花</button>
  </view>
</template>

<style lang="scss" scoped>
@use './detail.scss';
</style>
