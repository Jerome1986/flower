<script setup lang="ts">
import { UserRole } from '@/types/user'
import { resolveApiImage } from '@/utils/http'
import { openAuthPage } from '@/utils/login-return'
import { computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getSales } from '@/pages/store-stats/sales-summary'
import { getManagedStoresApi as getManagedStores } from '@/api/manage-orders'
import { useResource } from '@/composables/use-resource'

import UniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'
import { useUserStore } from '@/stores/modules/user'
import { orderEntries, serviceEntries } from './page-data'
import { getCurrentUserApi as getCurrentUser } from '@/api/user'

// 当前账户信息与登录状态。
const userStore = useUserStore()
// 当前账户是否为店长，统一控制管理入口与用户订单区。
const isManager = computed(
  () => Boolean(userStore.token) && userStore.profile?.role === UserRole.STORE_MANAGER,
)
const storeResource = useResource(async () => (await getManagedStores()).data)
const managerStore = computed(() => storeResource.data.value?.[0])
const salesResource = useResource(() =>
  getSales({ storeId: managerStore.value!.id, period: 'today' }),
)
const todaySales = salesResource.data
const salesMessage = computed(() => storeResource.message.value || salesResource.message.value)
const salesLoading = computed(() => storeResource.loading.value || salesResource.loading.value)
let profileVersion = 0
watch(
  () => userStore.token,
  () => {
    profileVersion++
  },
  { flush: 'sync' },
)
async function loadProfile() {
  const version = ++profileVersion
  const token = userStore.token
  storeResource.reset()
  salesResource.reset()
  if (!token) return
  try {
    const { data } = await getCurrentUser()
    if (version !== profileVersion || token !== userStore.token) return
    userStore.setProfile(data)
    if (!isManager.value) return
    await storeResource.load()
    if (version === profileVersion && managerStore.value) await salesResource.load()
  } catch {
    if (version === profileVersion) storeResource.message.value = '账户信息加载失败，请重试'
  }
}
onShow(loadProfile)
// 打开门店销售统计。
function openSales() {
  uni.navigateTo({ url: '/pages/store-stats/index' })
}
// 是否已保存登录账户。
const isLoggedIn = computed(() => Boolean(userStore.token && userStore.profile))
// 当前账户显示名称。
const displayName = computed(() => userStore.profile?.nickname || '爱花的你')
// 隐藏手机号中间四位。
const phoneLabel = computed(() => {
  // 账户绑定的手机号。
  const phone = userStore.profile?.phone
  return typeof phone === 'string' && /^\d{11}$/.test(phone)
    ? `${phone.slice(0, 3)}****${phone.slice(-4)}`
    : '愿每一天，都有鲜花相伴'
})

// 保留测试登录占位入口。
function openTestLogin() {
  console.log('测试登录')
}
// 打开当前店长绑定门店的订单管理。
function openStoreOrders() {
  openAuthPage('/pages/store-orders/index')
}

// 打开我的订单并预选对应状态。
function openOrders(status = 'all') {
  if (isManager.value) return openStoreOrders()
  openAuthPage(`/pages/orders/index?status=${status}`)
}

// 统一处理账户、卡包、邀请、地址和客服入口。
function openEntry(title: string) {
  if (title === '微信手机号登录' || (title === '登录信息' && !isLoggedIn.value))
    return uni.navigateTo({ url: '/pages/login/index?returnUrl=%2Fpages%2Fmy%2Findex' })
  if (title === '登录信息') {
    openAuthPage('/pages/profile/index')
    return
  }
  if (title === '联系客服') {
    uni.showModal({
      title: '联系客服',
      content: '普通鲜花订单可在订单详情中联系履约门店。定制花束由平台处理，平台客服电话尚待配置。',
      showCancel: false,
      confirmColor: '#eed261',
    })
    return
  }
  if (title === '地址管理') {
    openAuthPage('/pages/addresses/index')
    return
  }
  if (title === '邀请好友') {
    uni.navigateTo({ url: '/pages/invite/index' })
    return
  }
  if (title === '我的优惠券') {
    openAuthPage('/pages/coupons/index')
    return
  }
  uni.showModal({
    title,
    content: isLoggedIn.value
      ? `${title}功能正在准备中，敬请期待。`
      : '登录后即可查看订单、管理花礼券和收货地址。微信手机号登录功能正在准备中。',
    showCancel: false,
    confirmText: '知道了',
    confirmColor: '#eed261',
  })
}

// 展示花礼券的使用规则。
function showRules() {
  console.info('[待对接] 花礼券使用规则')
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
          <image v-if="userStore.profile?.avatar" :src="resolveApiImage(userStore.profile.avatar)" mode="aspectFill" style="width: 100%; height: 100%; border-radius: 50%" />
          <text v-else class="iconfont icon-hua" />
        </button>
        <button class="profile-copy" @click="openEntry('登录信息')">
          <text class="profile-name">{{ isLoggedIn ? displayName : '你好，爱花的你' }}</text>
          <text class="muted">{{ isLoggedIn ? phoneLabel : '登录，让每一份花礼都有归属' }}</text>
        </button>
        <button class="login-button" @click="openEntry(isLoggedIn ? '登录信息' : '微信手机号登录')">
          {{ isLoggedIn ? '查看资料' : '登录 / 注册' }}
        </button>
      </view>
      <view v-if="!isManager" class="account-entries">
        <button @click="openEntry('我的优惠券')">
          <view class="account-icon"><UniIcons type="wallet" size="27" color="#eed261" /></view>
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
        <view class="service-icon"><UniIcons type="shop" size="27" color="#eed261" /></view>
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
      <text v-if="salesLoading || salesMessage" class="muted">{{
        salesLoading ? '正在加载统计…' : salesMessage
      }}</text
      ><button v-if="salesMessage && !salesResource.pending.value" @click="loadProfile">
        重试
      </button>
      <view class="sales-summary">
        <view>
          <text class="sales-value">¥{{ todaySales ? todaySales.amount.toFixed(2) : '—' }}</text>
          <text class="muted">销售额</text>
        </view>
        <view>
          <text class="sales-value">{{ todaySales?.count ?? '—' }}</text>
          <text class="muted">今日下单</text>
        </view>
        <view>
          <text class="sales-value">{{ todaySales?.pending ?? '—' }}</text>
          <text class="muted">今日单待处理</text>
        </view>
      </view>
      <text class="muted">销售额按今日完成统计，扣优惠及成功退款，不含配送费和测试单</text>
      <text class="muted gift-note">
        今日兑花赠送 {{ todaySales?.giftQuantity ?? '—' }} 份 · ¥{{
          todaySales ? todaySales.giftAmount.toFixed(2) : '—'
        }}
      </text>
      <text v-if="todaySales?.giftExceptionCount" class="muted"
        >{{ todaySales.giftExceptionCount }} 笔赠花存在退款或取消异常，详见统计</text
      >
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
        <text class="muted">查看邀请活动详情</text>
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
        <view class="service-icon"><UniIcons :type="entry.icon" size="23" color="#eed261" /></view>
        <view class="service-copy">
          <text class="entry-title">{{ entry.label }}</text>
          <text class="muted">{{ entry.description }}</text>
        </view>
        <text class="chevron iconfont icon-youjiantou1" />
      </button>
      <button class="service-row" @click="showRules">
        <view class="service-icon"><UniIcons type="help" size="23" color="#eed261" /></view>
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
