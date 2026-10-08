<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { readCoupons, type Coupon } from './coupon-data'

// 当前模拟账户，用于展示该账户已发放的新人券。
const userStore = useUserStore()

// 优惠券展示状态。
type CouponStatus = Coupon['status']
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
// 本地模拟优惠券数据。
const coupons = ref<Coupon[]>([])
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
  coupons.value = readCoupons(userStore.profile?.role === 'user' ? userStore.profile.id : undefined)
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
function useCoupon(coupon: Coupon) {
  uni.setStorageSync('flower-preferred-coupon', coupon.id)
  if (coupon.type === 'exchange') {
    uni.navigateTo({
      url: `/pages/${coupon.productType === 'B' ? 'bouquet-detail' : 'product'}/index?id=${
        coupon.productId || 'rose'
      }`,
    })
    return
  }
  if (coupon.productType === 'B') {
    uni.navigateTo({ url: '/pages/bouquets/index' })
    return
  }
  uni.switchTab({ url: '/pages/order/index' })
}
// 展示两类优惠券的使用说明。
function showRules() {
  uni.showModal({
    title: '花礼使用说明',
    content:
      '现金券抵扣适用商品金额；兑换券用于指定商品、规格及数量。全门店通用，但仍须符合商品范围。每单限用一张，不抵配送费，不找零、不兑现。新人及邀请奖励券发放后5天有效。使用中的券由未支付订单占用，取消后释放；退款成功返还原券。',
    showCancel: false,
    confirmColor: '#32845b',
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
            <text class="source">{{ coupon.source }} · 全部门店通用</text>
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
          <button v-if="activeTab === 'available'" class="use-button" @click="useCoupon(coupon)">
            去使用
          </button>
        </view>
      </view>
    </view>
    <view v-if="!visibleCoupons.length" class="empty-state">
      <UniIcons type="wallet" size="44" color="#32845b" />
      <text>暂无{{ tabs.find((tab) => tab.id === activeTab)?.name }}花礼券</text>
      <text class="subtitle">每一份花礼，都值得好好珍惜</text>
    </view>
    <text class="demo-note">当前为模拟卡包，供前端样式与交互预览</text>
  </view>
</template>

<style lang="scss" scoped>
@use './coupons.scss';
</style>
