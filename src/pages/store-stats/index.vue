<script setup lang="ts">
import { getManagedStoresApi as getManagedStores } from '@/api/manage-orders'
import { getCurrentUserApi } from '@/api/user'
import { useResource } from '@/composables/use-resource'
import { getSales } from '@/pages/store-stats/sales-summary'
import { useUserStore } from '@/stores/modules/user'
import type { SalesPeriod } from '@/types/report'
import { UserRole } from '@/types/user'
import { onShow } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
const userStore = useUserStore()
const isManager = computed(
  () => Boolean(userStore.token) && userStore.profile?.role === UserRole.STORE_MANAGER,
)
const period = ref<SalesPeriod>('today')
const periods: {
  id: SalesPeriod
  label: string
}[] = [
  { id: 'today', label: '今日' },
  { id: 'week', label: '近7天' },
  { id: 'month', label: '本月' },
]
const selectedStoreId = ref<number>()
const storeResource = useResource(async () => (await getManagedStores()).data)
const stores = computed(() => storeResource.data.value || [])
const store = computed(() => stores.value.find((item) => item.id === selectedStoreId.value))
const resource = useResource(() =>
  getSales({ storeId: selectedStoreId.value!, period: period.value }),
)
const sales = resource.data
const loading = computed(() => storeResource.loading.value || resource.loading.value)
const message = computed(() => storeResource.message.value || resource.message.value)
const pending = resource.pending
let initVersion = 0
const loadSales = async () => {
  resource.reset()
  if (isManager.value && store.value) await resource.load()
}
const init = async () => {
  const version = ++initVersion
  resource.reset()
  storeResource.reset()
  const token = userStore.token
  if (!token) return
  try {
    const { data } = await getCurrentUserApi()
    if (version !== initVersion || token !== userStore.token) return
    userStore.setProfile(data)
  } catch (error) {
    if (version === initVersion && token === userStore.token) resource.fail(error)
    return
  }
  if (!isManager.value) return
  await storeResource.load()
  if (version !== initVersion) return
  if (!stores.value.some((item) => item.id === selectedStoreId.value))
    selectedStoreId.value = stores.value[0]?.id
  await loadSales()
}
const chooseStore = (event: {
  detail: {
    value: string | number
  }
}) => {
  selectedStoreId.value = stores.value[Number(event.detail.value)]?.id
  void loadSales()
}
const goMy = () => {
  uni.switchTab({ url: '/pages/my/index' })
}
onShow(init)
watch(period, loadSales, { flush: 'sync' })
watch(
  () => userStore.token,
  () => {
    initVersion++
    selectedStoreId.value = undefined
  },
  { flush: 'sync' },
)
</script>

<template>
  <view v-if="isManager" class="sales-page">
    <view class="page-intro">
      <text class="eyebrow">店长工作台</text>
      <text class="page-title">门店销售</text>
      <picker v-if="stores.length > 1" :range="stores" range-key="name" @change="chooseStore"
        ><text class="muted">{{ store?.name }} · 切换门店</text></picker
      ><text v-else class="muted">{{ store?.name || '门店' }}</text>
    </view>
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
    <view v-if="loading || message" class="panel"
      ><text>{{ loading ? '正在加载统计…' : message }}</text
      ><button v-if="!loading && !pending" @click="init">重试</button></view
    >
    <view v-else-if="!stores.length" class="panel"><text>暂无可管理门店</text></view>
    <view class="amount-card">
      <text class="muted">销售额</text>
      <text class="amount">¥{{ sales ? sales.amount.toFixed(2) : '—' }}</text>
      <text class="muted">按北京时间完成日期统计，扣优惠和成功退款，不含配送费及测试单</text>
      <text class="muted">实收客单价按已完成且未成功退款的收款订单计算（含零元确认订单）</text>
    </view>
    <view class="metrics">
      <view>
        <text class="metric-value">{{ sales?.count ?? '—' }}</text>
        <text class="muted">期间下单数</text>
      </view>
      <view>
        <text class="metric-value">{{ sales?.completed ?? '—' }}</text>
        <text class="muted">期间完成数</text>
      </view>
      <view>
        <text class="metric-value">¥{{ sales ? sales.average.toFixed(2) : '—' }}</text>
        <text class="muted">实收客单价</text>
      </view>
    </view>
    <view class="panel">
      <text class="section-title">兑花赠送</text>
      <view class="state-row">
        <text>赠送数量</text>
        <text class="state-count"
          >{{ sales?.giftQuantity ?? '—' }} 份 · {{ sales?.giftStems ?? '—' }} 支</text
        >
      </view>
      <view class="state-row">
        <text>赠送商品价值</text>
        <text class="state-count">¥{{ sales ? sales.giftAmount.toFixed(2) : '—' }}</text>
      </view>
      <text class="muted">按实际履约门店统计活动赠花，商品价值不计入实收，也不是报销金额</text>
      <text v-if="sales?.giftUnknownStemsCount" class="muted"
        >{{ sales.giftUnknownStemsCount }} 笔赠花缺少支数，合计支数暂不展示</text
      >
      <text v-if="sales?.giftExceptionCount" class="muted"
        >{{ sales.giftExceptionCount }} 笔已送出赠花存在退款或取消异常，赠送事实已保留</text
      >
    </view>
    <view class="panel">
      <text class="section-title">期间下单的当前状态</text>
      <view v-for="item in sales?.states || []" :key="item.label" class="state-row">
        <text>{{ item.label }}</text>
        <text class="state-count">{{ item.count }} 笔</text>
      </view>
    </view>
    <text
      v-if="sales && !sales.count && !sales.completed && !sales.giftQuantity"
      class="empty-note"
    >
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
.page-intro {
  padding: 32rpx;
  border: 1rpx solid $qs-divider;
  border-radius: 24rpx;
  background: $qs-card-bg;
}
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
  color: $qs-accent-text;
  font-size: 22rpx;
  letter-spacing: 0;
}
.page-title {
  margin: 12rpx 0;
  font-size: 44rpx;
  font-weight: 600;
  color: $qs-font-title;
}
.muted {
  color: $qs-font-dec;
  font-size: 24rpx;
  line-height: 1.7;
}
.periods {
  display: flex;
  gap: 12rpx;
  margin: 24rpx 0;
  padding: 8rpx;
  border-radius: 16rpx;
  background: $qs-input-bg;
}
.periods button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 16rpx 0;
  border-radius: 12rpx;
  color: $qs-font-dec;
  min-height: 72rpx;
}
.periods .active {
  background: $qs-brandColor;
  color: $qs-font-inverse;
}
.amount-card {
  padding: 32rpx;
  border-radius: 24rpx;
  background: $qs-brandColor-light;
  border: 1rpx solid #eee4be;
}
.amount {
  margin: 12rpx 0;
  color: $qs-accent-text;
  font-size: 56rpx;
  font-weight: 600;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.metrics {
  display: grid;
  gap: 12rpx;
  margin-top: 24rpx;
  padding: 24rpx 16rpx;
  border-radius: 24rpx;
  background: $qs-card-bg;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1rpx solid $qs-divider;
}
.metrics > view {
  flex: 1;
  min-width: 0;
  text-align: center;
}
.metric-value {
  margin-bottom: 8rpx;
  color: $qs-font-title;
  font-size: 32rpx;
  font-weight: 600;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.panel {
  margin-top: 24rpx;
  padding: 32rpx;
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
  padding: 24rpx 0;
  border-bottom: 1rpx solid $qs-divider;
  font-size: 26rpx;
  gap: 24rpx;
  line-height: 1.6;
}
.state-row:last-child {
  border-bottom: 0;
}
.state-count {
  color: $qs-accent-text;
}
.empty-note,
.footer-note {
  margin-top: 32rpx;
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
  margin-top: 32rpx;
  color: $qs-accent-text;
}
</style>
