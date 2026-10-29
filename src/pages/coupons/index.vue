<script setup lang="ts">
import type { CouponItem } from '@/types/coupon'
import { computed, ref } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { getUserCouponsApi } from '@/api/coupon'
import { rememberCoupon } from './selection'
import UniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'

// 数据以当前账户的服务端响应为准。
const userStore = useUserStore()

// 当前卡包筛选状态。
const activeTab = ref<CouponItem['status']>('AVAILABLE')
// 卡包状态分类。
const tabs: { id: CouponItem['status']; name: string }[] = [
  { id: 'AVAILABLE', name: '可用' },
  { id: 'LOCKED', name: '使用中' },
  { id: 'USED', name: '已使用' },
  { id: 'EXPIRED', name: '已过期' },
]
// 当前时间，供优惠券倒计时展示。
const now = ref(Date.now())
// 数据以当前账户的服务端响应为准。
const coupons = ref<CouponItem[]>([])
const loading = ref(false)
const message = ref('')
const sourceLabels = { NEW_USER: '新人注册奖励', INVITATION: '邀请奖励', MANUAL: '后台发放' }
let requestId = 0

async function loadCoupons() {
  const current = ++requestId
  const userId = userStore.profile?.id
  coupons.value = []
  message.value = ''
  loading.value = false
  if (!userStore.token || !userId) {
    message.value = '请先登录'
    return
  }
  loading.value = true
  try {
    const res = await getUserCouponsApi(userId)
    if (current === requestId) coupons.value = res.data
  } catch {
    if (current === requestId) message.value = '优惠券加载失败，请重试'
  } finally {
    if (current === requestId) loading.value = false
  }
}

function login() {
  uni.navigateTo({ url: '/pages/login/index?returnUrl=%2Fpages%2Fcoupons%2Findex' })
}
// 倒计时刷新定时器。
let timer: ReturnType<typeof setInterval> | undefined
// 当前分类显示的优惠券。
const visibleCoupons = computed(() =>
  coupons.value.filter((coupon) => getStatus(coupon) === activeTab.value),
)

// 根据到期时间计算可用券的展示状态。
function getStatus(coupon: CouponItem): CouponItem['status'] {
  return coupon.status === 'AVAILABLE' && new Date(coupon.expiresAt).getTime() <= now.value
    ? 'EXPIRED'
    : coupon.status
}
// 启动前台倒计时。
onShow(() => {
  stopTimer()
  now.value = Date.now()
  void loadCoupons()
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
// 离开页面时停止刷新。
onHide(() => {
  stopTimer()
  requestId++
  coupons.value = []
})
// 销毁页面时释放定时器。
onUnload(() => {
  stopTimer()
  requestId++
})

// 清理倒计时定时器。
function stopTimer() {
  if (timer) clearInterval(timer)
  timer = undefined
}
// 切换卡包状态分类。
function changeTab(status: CouponItem['status']) {
  activeTab.value = status
}
// 格式化优惠券到期时间。
function formatExpiry(timestamp: string) {
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
}
// 将剩余有效时间展示为天、小时、分钟、秒。
function countdown(timestamp: string) {
  // 距到期剩余的秒数。
  const seconds = Math.max(0, Math.floor((new Date(timestamp).getTime() - now.value) / 1000))
  return `${Math.floor(seconds / 86400)}天 ${Math.floor(seconds / 3600) % 24}时 ${
    Math.floor(seconds / 60) % 60
  }分 ${seconds % 60}秒`
}
// 前往下单页挑选适用鲜花，实际券选择在确认订单页完成。
function useCoupon(coupon: CouponItem) {
  if (getStatus(coupon) !== 'AVAILABLE' || !userStore.profile) return
  rememberCoupon(userStore.profile.id, coupon.id)
  uni.switchTab({ url: '/pages/order/index' })
}
</script>

<template>
  <view class="coupons-page">
    <view class="page-intro">
      <text class="eyebrow">花礼，与你分享</text>
      <view class="heading-row">
        <text class="page-title">我的花礼券</text>
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
      ><button v-if="!loading && userStore.token && userStore.profile?.id" @click="loadCoupons">
        重试</button
      ><button v-if="!userStore.token || !userStore.profile?.id" @click="login">登录</button></view
    >
    <view class="coupon-list">
      <view
        v-for="coupon in visibleCoupons"
        :key="coupon.id"
        class="coupon-card"
        :class="{ inactive: activeTab === 'USED' || activeTab === 'EXPIRED' }"
      >
        <view class="coupon-main">
          <view class="coupon-value">
            <text v-if="coupon.type === 'CASH'" class="cash-value">
              <text class="currency">¥</text>
              {{ coupon.cashAmount }}
            </text>
            <text v-else class="exchange-value">兑花</text>
            <text class="type-label">
              {{ coupon.type === 'CASH' ? '现金抵扣券' : '商品兑换券' }}
            </text>
          </view>
          <view class="coupon-copy">
            <text class="coupon-title">{{ coupon.name }}</text>
            <text class="scope">{{ coupon.scope === 'ALL' ? '全部商品可用' : coupon.scope }}</text>
            <text v-if="coupon.type === 'EXCHANGE'" class="scope">
              {{ coupon.exchangeProductName }} {{ coupon.exchangeSpecName }}
              <text v-if="coupon.exchangeQuantity"> × {{ coupon.exchangeQuantity }}</text>
            </text>
            <text class="source">{{ coupon.activityName || sourceLabels[coupon.source] }}</text>
          </view>
        </view>
        <view class="coupon-footer">
          <view class="expiry-copy">
            <text class="expiry">{{ formatExpiry(coupon.expiresAt) }} 到期</text>
            <text v-if="activeTab === 'AVAILABLE'" class="countdown">
              剩余 {{ countdown(coupon.expiresAt) }}
            </text>
            <text v-else class="state-note">
              {{
                activeTab === 'LOCKED'
                  ? '未支付订单占用中，暂不可重复使用'
                  : activeTab === 'USED'
                  ? '已在订单中使用'
                  : '优惠券已过期'
              }}
            </text>
          </view>
          <button v-if="activeTab === 'AVAILABLE'" class="use-button" @click="useCoupon(coupon)">
            去选花
          </button>
        </view>
      </view>
    </view>
    <view v-if="!loading && !message && !visibleCoupons.length" class="empty-state">
      <UniIcons type="wallet" size="44" color="#eed261" />
      <text>暂无{{ tabs.find((tab) => tab.id === activeTab)?.name }}花礼券</text>
      <text class="subtitle">每一份花礼，都值得好好珍惜</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@use './coupons.scss';
</style>
