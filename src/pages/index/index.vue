<script setup lang="ts">
import { homeContent, mockFlowers } from './mock-data'
import { computed } from 'vue'
import { useUserStore } from '@/stores/modules/user'
import { getNewUserCoupon, grantNewUserCoupon } from '../coupons/new-user-coupon'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { rememberInvitation } from '../invite/invite-data'

// 当前模拟账户，复用测试登录状态。
const userStore = useUserStore()
// 分享落地只记录邀请码，首次模拟注册后才发奖励。
onLoad((options) => {
  rememberInvitation(options?.inviteCode)
})
// 当前用户是否已领取新人券。
const hasNewUserCoupon = ref(false)
// 首页领取按钮文案。
const couponButtonLabel = computed(() => (hasNewUserCoupon.value ? '查看新人花礼' : '领取新人花礼'))
// 返回首页后刷新当前账户的领取记录。
onShow(() => {
  hasNewUserCoupon.value = Boolean(
    userStore.profile?.role === 'user' && getNewUserCoupon(userStore.profile.id),
  )
})
// 引导测试用户登录，并展示唯一的模拟新人券。
function claimNewUserCoupon() {
  if (!userStore.profile || userStore.profile.role !== 'user') {
    uni.navigateTo({ url: '/pages/test-login/index?from=coupon' })
    return
  }
  grantNewUserCoupon(userStore.profile.id)
  hasNewUserCoupon.value = true
  uni.navigateTo({ url: '/pages/coupons/index' })
}

// 打开买花列表并预设收花方式。
function goShopping(method: 'pickup' | 'delivery' = 'pickup') {
  uni.setStorageSync('flower-entry-method', method)
  uni.switchTab({ url: '/pages/order/index' })
}

// 打开首页推荐商品的详情页。
function viewProduct(id: string) {
  uni.navigateTo({ url: `/pages/product/index?id=${id}` })
}

// 打开邀请好友活动页。
function goInvite() {
  uni.navigateTo({ url: '/pages/invite/index' })
}

// 打开平台成品花束专区。
function goBouquets() {
  uni.navigateTo({ url: '/pages/bouquets/index' })
}

// 统一展示价格格式。
function formatPrice(amount: number) {
  return amount.toFixed(2)
}
</script>

<template>
  <view class="home">
    <view class="hero">
      <image class="hero__image" :src="homeContent.image" mode="aspectFill" />
      <view class="hero__copy">
        <text class="eyebrow">让鲜花走进日常</text>
        <text class="hero__title">{{ homeContent.title }}</text>
        <text class="hero__subtitle">{{ homeContent.subtitle }}</text>
        <button class="hero__button" @click="goShopping()">挑一份喜欢</button>
      </view>
    </view>
    <view class="fulfillment-card">
      <view class="fulfillment-card__header">
        <text>今天，想怎样收花？</text>
      </view>
      <view class="fulfillment-options">
        <button class="fulfillment-option" @click="goShopping('pickup')">
          <view class="entry-icon"><text class="iconfont icon-shouye1" /></view>
          <text class="entry-title">门店自取</text>
          <text class="muted">路过花店，带一束回家</text>
          <text class="entry-link">
            去选花
            <text class="iconfont icon-youjiantou1" />
          </text>
        </button>
        <button class="fulfillment-option" @click="goShopping('delivery')">
          <view class="entry-icon"><text class="iconfont icon-address" /></view>
          <text class="entry-title">鲜花到家</text>
          <text class="muted">让心意送到你身边</text>
          <text class="entry-link">
            选购配送
            <text class="iconfont icon-youjiantou1" />
          </text>
        </button>
      </view>
    </view>
    <button class="custom-card" @click="goBouquets">
      <view class="custom-card__copy">
        <text class="eyebrow">送给特别的人</text>
        <text class="section-title">定制一束鲜花</text>
        <text class="muted">精选成品花束 · 平台安排配送</text>
        <text class="entry-link">
          挑选一束
          <text class="iconfont icon-youjiantou1" />
        </text>
      </view>
      <image class="custom-card__image" :src="homeContent.customImage" mode="aspectFill" />
    </button>
    <view class="section-heading">
      <view>
        <text class="section-title">花礼，与你分享</text>
        <text class="muted">从第一束花开始，让美好发生</text>
      </view>
    </view>
    <view class="gift-card">
      <view class="gift-card__amount">
        <text class="currency">¥</text>
        <text>{{ homeContent.couponAmount }}</text>
        <text class="gift-card__label">新人花礼券</text>
      </view>
      <view class="gift-card__copy">
        <text class="entry-title">初次见面的心意</text>
        <text class="muted">门店散花可用 · 领取后 {{ homeContent.couponDays }} 天有效</text>
        <button class="small-button" @click="claimNewUserCoupon">
          {{ couponButtonLabel }}
          <text class="iconfont icon-youjiantou1" />
        </button>
      </view>
    </view>
    <button class="invite-card" @click="goInvite">
      <view class="invite-card__icon"><text class="iconfont icon-liwuhe" /></view>
      <view class="invite-card__copy">
        <text class="entry-title">邀好友，一起收花</text>
        <text class="muted">好友首次注册，你也可获奖励券</text>
      </view>
      <text class="chevron iconfont icon-youjiantou1" />
    </button>
    <view class="section-heading">
      <view>
        <text class="section-title">鲜花推荐</text>
        <text class="muted">给平常的一天，添一点鲜活</text>
      </view>
      <button class="text-button" @click="goShopping()">
        查看全部
        <text class="iconfont icon-youjiantou1" />
      </button>
    </view>
    <view class="flower-grid">
      <button
        v-for="product in mockFlowers"
        :key="product.id"
        class="flower-card"
        @click="viewProduct(product.id)"
      >
        <view class="flower-card__cover">
          <image :src="product.image" mode="aspectFill" lazy-load />
        </view>
        <view class="flower-card__body">
          <text class="entry-title">{{ product.name }}</text>
          <text class="muted">
            {{ product.specification }} / {{ product.unit }} ·
            {{ product.methods.includes('delivery') ? '自取 / 配送' : '仅自取' }}
          </text>
          <view class="flower-card__bottom">
            <text class="price">
              <text class="currency">¥</text>
              {{ formatPrice(product.price) }}
            </text>
            <text class="flower-card__plus iconfont icon-jiahao" />
          </view>
        </view>
      </button>
    </view>
    <view class="home-footer">
      <text>一花一份心意</text>
      <text class="muted">图片与价格均为演示素材</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@use './home.scss';
</style>
