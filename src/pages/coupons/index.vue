<script setup lang="ts">
import type { Coupon, CouponStatus } from '@/types/coupon'
import { computed, ref } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { getWalletApi as getWallet } from '@/api/marketing'
import { couponCheckoutEnabled } from '@/pages/checkout/coupon-config'
import { useResource } from '@/composables/use-resource'

// 数据以当前账户的服务端响应为准。
const userStore = useUserStore()

// 当前卡包筛选状态。
const activeTab = ref<CouponStatus>('available')
// 卡包状态分类。
const tabs: { id: CouponStatus; name: string }[] = [
  { id: 'available', name: '可用' },
  { id: 'locked', name: '使用中' },
  { id: 'used', name: '已使用' },
  { id: 'expired', name: '已过期' },
]
// 当前时间，供优惠券倒计时展示。
const now = ref(Date.now())
// 数据以当前账户的服务端响应为准。
const resource = useResource(getWallet)
const coupons = computed(() => resource.data.value?.coupons || [])
const loading = resource.loading
const message = resource.message
const pending = resource.pending
function login() {
  uni.navigateTo({ url: '/pages/test-login/index?returnUrl=%2Fpages%2Fcoupons%2Findex' })
}
// 倒计时刷新定时器。
let timer: ReturnType<typeof setInterval> | undefined
// 当前分类显示的优惠券。
const visibleCoupons = computed(() =>
  coupons.value.filter((coupon) => getStatus(coupon) === activeTab.value),
)

// 根据到期时间计算可用券的展示状态。
function getStatus(coupon: Coupon): CouponStatus {
  return coupon.status === 'available' && coupon.expiresAt <= now.value ? 'expired' : coupon.status
}
// 启动前台倒计时。
onShow(() => {
  stopTimer()
  now.value = Date.now()
  void resource.load()
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
// 离开页面时停止刷新。
onHide(stopTimer)
// 销毁页面时释放定时器。
onUnload(stopTimer)

// 清理倒计时定时器。
function stopTimer() {
  if (timer) clearInterval(timer)
  timer = undefined
}
// 切换卡包状态分类。
function changeTab(status: CouponStatus) {
  activeTab.value = status
}
// 格式化优惠券到期时间。
function formatExpiry(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
}
// 将剩余有效时间展示为天、小时、分钟、秒。
function countdown(timestamp: number) {
  // 距到期剩余的秒数。
  const seconds = Math.max(0, Math.floor((timestamp - now.value) / 1000))
  return `${Math.floor(seconds / 86400)}天 ${Math.floor(seconds / 3600) % 24}时 ${
    Math.floor(seconds / 60) % 60
  }分 ${seconds % 60}秒`
}
// 前往下单页挑选适用鲜花，实际券选择在确认订单页完成。
function useCoupon(_coupon: Coupon) {
  if (!couponCheckoutEnabled) return uni.showToast({ title: '结算用券暂未开放', icon: 'none' })
  uni.switchTab({ url: '/pages/order/index' })
}
// 展示两类优惠券的使用说明。
function showRules() {
  uni.showModal({
    title: '花礼使用说明',
    content: resource.data.value?.rules || '花礼券暂未开放，活动规则将在开放后展示。',
    showCancel: false,
    confirmColor: '#eed261',
  })
}
</script>

<template>
  <view class="coupons-page">
    <view class="page-intro">
      <text class="eyebrow">花礼，与你分享</text>
      <view class="heading-row">
        <text class="page-title">我的花礼券</text>
        <button class="rules-button" @click="showRules">
          使用说明
          <text class="iconfont icon-youjiantou1" />
        </button>
      </view>
      <text class="subtitle">把每一份心意，用在喜欢的鲜花上</text>
    </view>
    <view class="status-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        @click="changeTab(tab.id)"
      >
        {{ tab.name }}
      </button>
    </view>
    <view v-if="loading || message" class="empty-state"
      ><text>{{ loading ? '正在加载花礼券…' : message }}</text
      ><button v-if="!loading && !pending && userStore.token" @click="resource.load">重试</button
      ><button v-if="!userStore.token" @click="login">登录</button></view
    >
    <view class="coupon-list">
      <view
        v-for="coupon in visibleCoupons"
        :key="coupon.id"
        class="coupon-card"
        :class="{ inactive: activeTab === 'used' || activeTab === 'expired' }"
      >
        <view class="coupon-main">
          <view class="coupon-value">
            <text v-if="coupon.type === 'cash'" class="cash-value">
              <text class="currency">¥</text>
              {{ coupon.amount }}
            </text>
            <text v-else class="exchange-value">兑花</text>
            <text class="type-label">
              {{ coupon.type === 'cash' ? '现金抵扣券' : '商品兑换券' }}
            </text>
          </view>
          <view class="coupon-copy">
            <text class="coupon-title">{{ coupon.title }}</text>
            <text class="scope">{{ coupon.scope }}</text>
            <text class="source">{{ coupon.source }}</text>
          </view>
        </view>
        <view class="coupon-footer">
          <view class="expiry-copy">
            <text class="expiry">{{ formatExpiry(coupon.expiresAt) }} 到期</text>
            <text v-if="activeTab === 'available'" class="countdown">
              剩余 {{ countdown(coupon.expiresAt) }}
            </text>
            <text v-else class="state-note">
              {{
                activeTab === 'locked'
                  ? '未支付订单占用中，暂不可重复使用'
                  : activeTab === 'used'
                  ? '已在订单中使用'
                  : '优惠券已过期'
              }}
            </text>
          </view>
          <button
            v-if="activeTab === 'available'"
            class="use-button"
            :disabled="!couponCheckoutEnabled"
            @click="useCoupon(coupon)"
          >
            {{ couponCheckoutEnabled ? '去选花' : '结算用券暂未开放' }}
          </button>
        </view>
      </view>
    </view>
    <view v-if="!loading && !message && !visibleCoupons.length" class="empty-state">
      <UniIcons type="wallet" size="44" color="#eed261" />
      <text>暂无{{ tabs.find((tab) => tab.id === activeTab)?.name }}花礼券</text>
      <text class="subtitle">每一份花礼，都值得好好珍惜</text>
    </view>
    <text class="demo-note">花礼券及使用规则以活动开放后的说明为准</text>
  </view>
</template>

<style lang="scss" scoped>
@use './coupons.scss';
</style>
