<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { mockStores } from '../index/mock-data'
import type { PreviewOrder } from '../checkout/preview-order'
import { readSalesOrders, summarizeSales, type SalesPeriod } from './sales-data'

// 当前账户用于区分店长和用户。
const userStore = useUserStore()
// 当前是否为店长身份。
const isManager = computed(() => userStore.profile?.role === 'manager')
// 当前店长所属门店。
const store = computed(() => mockStores.find((item) => item.id === userStore.profile?.storeId))
// 本地已支付模拟订单。
const orders = ref<PreviewOrder[]>([])
// 默认展示今日销售。
const period = ref<SalesPeriod>('today')
// 简洁的时间筛选选项。
const periods: { id: SalesPeriod; label: string }[] = [
  { id: 'today', label: '今日' },
  { id: 'week', label: '近7天' },
  { id: 'month', label: '本月' },
]
// 根据时间和所属门店实时计算销售摘要。
const sales = computed(() =>
  summarizeSales(orders.value, userStore.profile?.storeId || '', period.value),
)
// 返回时刷新订单，展示最新履约状态。
onShow(() => {
  orders.value = isManager.value ? readSalesOrders() : []
})
// 返回我的页面切换身份。
function goMy() {
  uni.switchTab({ url: '/pages/my/index' })
}
</script>

<template>
  <view v-if="isManager" class="sales-page">
    <text class="eyebrow">店长工作台</text>
    <text class="page-title">门店销售</text>
    <text class="muted">{{ store?.name || '门店' }}</text>
    <view class="periods">
      <button
        v-for="item in periods"
        :key="item.id"
        :class="{ active: period === item.id }"
        @click="period = item.id"
      >
        {{ item.label }}
      </button>
    </view>
    <view class="amount-card">
      <text class="muted">销售额</text>
      <text class="amount">¥{{ sales.amount.toFixed(2) }}</text>
      <text class="muted">已支付商品金额，不含配送费</text>
    </view>
    <view class="metrics">
      <view>
        <text class="metric-value">{{ sales.count }}</text>
        <text class="muted">订单数</text>
      </view>
      <view>
        <text class="metric-value">{{ sales.completed }}</text>
        <text class="muted">已完成</text>
      </view>
      <view>
        <text class="metric-value">¥{{ sales.average.toFixed(2) }}</text>
        <text class="muted">客单价</text>
      </view>
    </view>
    <view class="panel">
      <text class="section-title">兑花赠送</text>
      <view class="state-row">
        <text>赠送数量</text>
        <text class="state-count">{{ sales.giftQuantity }} 份 · {{ sales.giftStems }} 支</text>
      </view>
      <view class="state-row">
        <text>赠送商品价值</text>
        <text class="state-count">¥{{ sales.giftAmount.toFixed(2) }}</text>
      </view>
      <text class="muted">按本店实际核销时间统计，不计入销售额；商品价值不等同报销金额</text>
    </view>
    <view class="panel">
      <text class="section-title">订单状态</text>
      <view v-for="item in sales.states" :key="item.label" class="state-row">
        <text>{{ item.label }}</text>
        <text class="state-count">{{ item.count }} 笔</text>
      </view>
    </view>
    <text v-if="!sales.count && !sales.giftQuantity" class="empty-note">
      所选时间暂无本店订单或兑花赠送
    </text>
    <text class="footer-note">仅统计本店普通鲜花订单，定制订单由平台处理</text>
  </view>
  <view v-else class="sales-page empty">
    <text>请先使用店长身份登录</text>
    <button @click="goMy">返回我的</button>
  </view>
</template>

<style lang="scss" scoped>
.sales-page {
  padding: 32rpx $qs-page-spacing;
  color: $qs-font-body;
  text {
    display: block;
  }
  button {
    margin: 0;
    border-radius: 0;
    background: transparent;
    font-size: 26rpx;
    line-height: 1.5;
  }
}
.eyebrow {
  color: $qs-brandColor;
  font-size: 22rpx;
  letter-spacing: 2rpx;
}
.page-title {
  margin: 12rpx 0;
  font-size: 44rpx;
  font-weight: 600;
  color: $qs-font-title;
}
.muted {
  color: $qs-font-dec;
  font-size: 23rpx;
  line-height: 1.7;
}
.periods {
  display: flex;
  gap: 12rpx;
  margin: 30rpx 0;
  padding: 8rpx;
  border-radius: 40rpx;
  background: $qs-brandColor-light;
}
.periods button {
  flex: 1;
  padding: 15rpx 0;
  border-radius: 32rpx;
  color: $qs-font-dec;
}
.periods .active {
  background: $qs-brandColor;
  color: $qs-font-inverse;
}
.amount-card {
  padding: 32rpx;
  border-radius: 24rpx;
  background: $qs-brandColor-light;
}
.amount {
  margin: 12rpx 0;
  color: $qs-brandColor;
  font-size: 60rpx;
  font-weight: 600;
}
.metrics {
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
  padding: 28rpx 16rpx;
  border-radius: 24rpx;
  background: $qs-card-bg;
}
.metrics > view {
  flex: 1;
  min-width: 0;
  text-align: center;
}
.metric-value {
  margin-bottom: 8rpx;
  color: $qs-font-title;
  font-size: 30rpx;
  font-weight: 600;
}
.panel {
  margin-top: 24rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: $qs-card-bg;
  border: 1rpx solid $qs-divider;
}
.section-title {
  margin-bottom: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
}
.state-row {
  display: flex;
  justify-content: space-between;
  padding: 22rpx 0;
  border-bottom: 1rpx solid $qs-divider;
  font-size: 26rpx;
}
.state-row:last-child {
  border-bottom: 0;
}
.state-count {
  color: $qs-brandColor;
}
.empty-note,
.footer-note {
  margin-top: 28rpx;
  text-align: center;
  font-size: 22rpx;
  line-height: 1.8;
  color: $qs-font-dec;
}
.empty {
  text-align: center;
  padding-top: 140rpx;
}
.empty button {
  margin-top: 30rpx;
  color: $qs-brandColor;
}
</style>
