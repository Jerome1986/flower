<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { readSalesOrders, summarizeSales } from '../store-stats/sales-data'
import { mockStores } from '../index/mock-data'
import type { PreviewOrder } from '../checkout/preview-order'
import UniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'
import { useUserStore } from '@/stores/modules/user'
import { orderEntries, serviceEntries } from './page-data'

// 当前账户信息与模拟登录状态。
const userStore = useUserStore()
// 当前账户是否为店长，统一控制管理入口与用户订单区。
const isManager = computed(() => userStore.profile?.role === 'manager')
// 每次返回我的页面刷新销售数据。
const salesOrders = ref<PreviewOrder[]>([])
// 店长所属门店名称。
const managerStore = computed(() =>
  mockStores.find((store) => store.id === userStore.profile?.storeId),
)
// 今日所属门店的销售摘要。
const todaySales = computed(() =>
  summarizeSales(salesOrders.value, userStore.profile?.storeId || '', 'today'),
)
onShow(() => {
  salesOrders.value = isManager.value ? readSalesOrders() : []
})
// 打开门店销售统计。
function openSales() {
  uni.navigateTo({ url: '/pages/store-stats/index' })
}
// 是否已保存登录账户。
const isLoggedIn = computed(() => Boolean(userStore.profile))
// 当前账户显示名称。
const displayName = computed(() => userStore.profile?.nickname || '爱花的你')
// 当前测试角色的展示名称。
const testRoleLabel = computed(() =>
  userStore.profile?.isTest
    ? userStore.profile.role === 'manager'
      ? '测试身份 · 店长'
      : '测试身份 · 用户'
    : '',
)
// 隐藏手机号中间四位。
const phoneLabel = computed(() => {
  // 账户绑定的手机号。
  const phone = userStore.profile?.phone || userStore.profile?.mobile
  return typeof phone === 'string' && /^\d{11}$/.test(phone)
    ? `${phone.slice(0, 3)}****${phone.slice(-4)}`
    : '愿每一天，都有鲜花相伴'
})

// 打开独立测试登录页面。
function openTestLogin() {
  uni.navigateTo({ url: '/pages/test-login/index' })
}
// 打开当前店长绑定门店的订单管理。
function openStoreOrders() {
  uni.navigateTo({ url: '/pages/store-orders/index' })
}

// 打开我的订单并预选对应状态。
function openOrders(status = 'all') {
  if (userStore.profile?.role === 'manager') return openStoreOrders()
  uni.navigateTo({ url: `/pages/orders/index?status=${status}` })
}

// 统一处理账户、卡包、邀请、地址和客服入口。
function openEntry(title: string) {
  if (title === '微信手机号登录' || (title === '登录信息' && !isLoggedIn.value))
    return openTestLogin()
  if (title === '登录信息') {
    uni.showModal({
      title: '当前账户',
      content: `${displayName.value}\n${phoneLabel.value}\n${testRoleLabel.value || '用户账户'}`,
      showCancel: false,
      confirmColor: '#32845b',
    })
    return
  }
  if (title === '联系客服') {
    uni.showModal({
      title: '联系客服',
      content: '普通鲜花订单可在订单详情中联系履约门店。定制花束由平台处理，平台客服电话尚待配置。',
      showCancel: false,
      confirmColor: '#32845b',
    })
    return
  }
  if (title === '地址管理') {
    uni.navigateTo({ url: '/pages/addresses/index' })
    return
  }
  if (title === '邀请好友') {
    uni.navigateTo({ url: '/pages/invite/index' })
    return
  }
  if (title === '我的优惠券') {
    uni.navigateTo({ url: '/pages/coupons/index' })
    return
  }
  uni.showModal({
    title,
    content: isLoggedIn.value
      ? `${title}功能正在准备中，敬请期待。`
      : '登录后即可查看订单、管理花礼券和收货地址。微信手机号登录功能正在准备中。',
    showCancel: false,
    confirmText: '知道了',
    confirmColor: '#32845b',
  })
}

// 展示花礼券的使用规则。
function showRules() {
  uni.showModal({
    title: '花礼使用说明',
    content:
      '现金抵扣券抵扣适用商品金额；兑换券用于指定商品、规格和数量。每笔订单限用一张，不抵配送费，不找零、不兑现。新人及邀请奖励券领取后5天有效，具体奖励以活动配置为准。',
    showCancel: false,
    confirmText: '知道了',
    confirmColor: '#32845b',
  })
}

// 返回买花列表。
function goShopping() {
  uni.switchTab({ url: '/pages/order/index' })
}
</script>

<template>
  <view class="my-page">
    <button class="test-login-float" @click="openTestLogin">测试登录</button>
    <view class="profile-section">
      <text class="eyebrow">一花一份心意</text>
      <view class="profile-row">
        <button class="avatar" aria-label="查看登录信息" @click="openEntry('登录信息')">
          <text class="iconfont icon-hua" />
        </button>
        <button class="profile-copy" @click="openEntry('登录信息')">
          <text class="profile-name">{{ isLoggedIn ? displayName : '你好，爱花的你' }}</text>
          <text class="muted">{{ isLoggedIn ? phoneLabel : '登录，让每一份花礼都有归属' }}</text>
          <text v-if="testRoleLabel" class="test-role-label">{{ testRoleLabel }}</text>
        </button>
        <button class="login-button" @click="openEntry(isLoggedIn ? '登录信息' : '微信手机号登录')">
          {{ isLoggedIn ? '查看资料' : '登录 / 注册' }}
        </button>
      </view>
      <view v-if="!isManager" class="account-entries">
        <button @click="openEntry('我的优惠券')">
          <view class="account-icon"><UniIcons type="wallet" size="27" color="#32845b" /></view>
          <text class="entry-title">我的优惠券</text>
          <text class="muted">现金券 / 商品兑换券</text>
        </button>
        <button @click="openEntry('邀请好友')">
          <view class="account-icon"><text class="iconfont icon-liwuhe" /></view>
          <text class="entry-title">邀请好友</text>
          <text class="muted">分享美好，收获花礼</text>
        </button>
      </view>
    </view>
    <view v-if="isManager" class="panel manager-panel">
      <view class="panel-heading">
        <text class="section-title">店长工作台</text>
        <text class="muted">{{ managerStore?.name || '门店' }}</text>
      </view>
      <button class="manager-entry" @click="openStoreOrders">
        <view class="service-icon"><UniIcons type="shop" size="27" color="#32845b" /></view>
        <view class="service-copy">
          <text class="entry-title">门店订单管理</text>
          <text class="muted">接单备货 · 自取核销 · 配送履约</text>
        </view>
        <text class="chevron iconfont icon-youjiantou1" />
      </button>
    </view>
    <view v-if="isManager" class="panel">
      <view class="panel-heading">
        <text class="section-title">今日销售</text>
        <button class="text-button" @click="openSales">
          查看统计
          <text class="iconfont icon-youjiantou1" />
        </button>
      </view>
      <view class="sales-summary">
        <view>
          <text class="sales-value">¥{{ todaySales.amount.toFixed(2) }}</text>
          <text class="muted">销售额</text>
        </view>
        <view>
          <text class="sales-value">{{ todaySales.count }}</text>
          <text class="muted">订单数</text>
        </view>
        <view>
          <text class="sales-value">{{ todaySales.pending }}</text>
          <text class="muted">待处理</text>
        </view>
      </view>
      <text class="muted gift-note">
        今日兑花赠送 {{ todaySales.giftQuantity }} 份 · ¥{{ todaySales.giftAmount.toFixed(2) }}
      </text>
    </view>
    <view v-else class="panel orders-panel">
      <view class="panel-heading">
        <text class="section-title">我的订单</text>
        <button class="text-button" @click="openOrders()">
          全部订单
          <text class="iconfont icon-youjiantou1" />
        </button>
      </view>
      <view class="order-entries">
        <button v-for="entry in orderEntries" :key="entry.id" @click="openOrders(entry.id)">
          <UniIcons :type="entry.icon" size="27" color="#4b554f" />
          <text>{{ entry.label }}</text>
        </button>
      </view>
      <view class="order-note">
        <text class="iconfont icon-hua" />
        <text>门店鲜花与定制花束，订单都在这里</text>
      </view>
    </view>
    <button v-if="!isManager" class="invite-card" @click="openEntry('邀请好友')">
      <view class="invite-copy">
        <text class="eyebrow">花礼，与你分享</text>
        <text class="invite-title">邀好友，一起收花</text>
        <text class="muted">好友通过邀请首次注册，你也可获奖励券</text>
        <text class="invite-link">
          去邀请
          <text class="iconfont icon-youjiantou1" />
        </text>
      </view>
      <view class="invite-art"><text class="iconfont icon-liwuhe" /></view>
    </button>
    <view v-if="!isManager" class="panel services-panel">
      <view class="panel-heading">
        <text class="section-title">我的服务</text>
        <text class="muted">让收花更安心</text>
      </view>
      <button
        v-for="entry in serviceEntries"
        :key="entry.id"
        class="service-row"
        @click="openEntry(entry.label)"
      >
        <view class="service-icon"><UniIcons :type="entry.icon" size="23" color="#32845b" /></view>
        <view class="service-copy">
          <text class="entry-title">{{ entry.label }}</text>
          <text class="muted">{{ entry.description }}</text>
        </view>
        <text class="chevron iconfont icon-youjiantou1" />
      </button>
      <button class="service-row" @click="showRules">
        <view class="service-icon"><UniIcons type="help" size="23" color="#32845b" /></view>
        <view class="service-copy">
          <text class="entry-title">花礼使用说明</text>
          <text class="muted">了解抵扣、兑换与有效期</text>
        </view>
        <text class="chevron iconfont icon-youjiantou1" />
      </button>
    </view>
    <button v-if="!isManager" class="daily-card" @click="goShopping">
      <image src="/static/home/tulip.jpg" mode="aspectFill" />
      <view class="daily-copy">
        <text class="entry-title">给日常，添一点鲜活</text>
        <text class="muted">挑一束喜欢的花，把美好带回家</text>
        <text class="invite-link">
          去选花
          <text class="iconfont icon-youjiantou1" />
        </text>
      </view>
    </button>
    <view class="my-footer">
      <text>让鲜花走进日常</text>
      <text class="muted">每一次相遇，都值得一束花</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@use './my.scss';
</style>
