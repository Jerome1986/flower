<script setup lang="ts">
import UniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'
import { getSelectedStore, getProducts } from '@/pages/stores/shop-data'
import type { ShopProduct } from '@/types/shop'
import { computed } from 'vue'
import { useUserStore } from '@/stores/modules/user'
import {
  getNewcomerGiftApi as getNewcomerGift,
  claimNewcomerGiftApi as claimNewcomerGift,
} from '@/api/marketing'
import { rememberInvitation } from '@/pages/invite/invitation-actions'
import { useResource } from '@/composables/use-resource'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
const recommended = ref<ShopProduct[]>([])
const recommendationStoreId = ref('')
let recommendationVersion = 0
async function loadRecommendations() {
  const version = ++recommendationVersion
  recommended.value = []
  recommendationStoreId.value = ''
  try {
    const store = await getSelectedStore()
    const products = store ? await getProducts(store.id) : []
    if (version !== recommendationVersion) return
    recommendationStoreId.value = store?.id || ''
    recommended.value = products.slice(0, 8)
  } catch {
    /* 请求工具展示错误，推荐区域不回退模拟商品。 */
  }
}

// 数据以当前账户的服务端响应为准。
const userStore = useUserStore()
// 分享落地仅记录来源，有效性与奖励由后端判定。
onLoad((options) => {
  rememberInvitation(options?.inviteCode)
})
// 查询花礼状态，提取请求工具包装中的业务数据。
async function loadNewcomerGift() {
  // 1. 请求当前账户的服务端状态，不使用本地模拟券。
  const res = await getNewcomerGift()
  // 2. 返回业务数据，交由资源工具处理账户隔离和加载状态。
  return res.data
}
const giftResource = useResource(loadNewcomerGift)
const gift = giftResource.data
const claiming = ref(false)
// 展示已领券状态或服务端返回的不可领取原因。
const giftDescription = computed(() => {
  // 1. 已领券优先展示使用状态，过期和已使用也不能重复领取。
  if (gift.value?.coupon) {
    const labels = { AVAILABLE: '已领取，可前往花礼券查看', LOCKED: '花礼券使用中', USED: '花礼券已使用', EXPIRED: '花礼券已过期' }
    return labels[gift.value.coupon.status]
  }
  // 2. 可领取时展示提示，否则沿用后端的具体原因。
  return gift.value?.canClaim ? '新人花礼待领取，领取后开始计算有效期' : gift.value?.reason
})
const couponButtonLabel = computed(() =>
  gift.value?.coupon
    ? '查看新人花礼'
    : gift.value?.canClaim
    ? '领取新人花礼'
    : gift.value
    ? '暂无可领取花礼'
    : '领取新人花礼',
)
onShow(() => {
  void loadRecommendations()
  if (!claiming.value) void giftResource.load()
})
// 登录后主动领取新人花礼，已领取时打开卡包。
async function claimNewUserCoupon() {
  // 1. 未登录先进入登录页，加载或领取期间阻止重复点击。
  if (!userStore.token) return uni.navigateTo({ url: '/pages/login/index?returnUrl=%2Fpages%2Fcoupons%2Findex' })
  if (claiming.value || giftResource.loading.value) return
  // 2. 状态尚未获取时重新查询，已有券直接查看，不能领取时不发请求。
  if (!gift.value) return giftResource.load()
  if (gift.value.coupon) return uni.navigateTo({ url: '/pages/coupons/index' })
  if (!gift.value.canClaim) return
  const token = userStore.token
  claiming.value = true
  try {
    // 3. 请求后端重新校验并发券，切换账户后忽略旧账户结果。
    const res = await claimNewcomerGift()
    if (token !== userStore.token) return
    gift.value = res.data
    // 4. 发券成功后打开卡包，卡包会重新读取服务端券列表。
    uni.navigateTo({ url: '/pages/coupons/index' })
  } catch {
    // 5. 请求工具统一提示错误，刷新状态以同步活动变化或实际已发出的券。
    if (token === userStore.token) await giftResource.load()
  } finally {
    // 6. 请求结束后恢复按钮。
    claiming.value = false
  }
}

// 打开买花列表并预设收花方式。
function goShopping(method: 'pickup' | 'delivery' = 'pickup') {
  uni.setStorageSync('flower-entry-method', method)
  uni.switchTab({ url: '/pages/order/index' })
}

// 打开首页推荐商品的详情页。
function viewProduct(id: string) {
  uni.navigateTo({ url: `/pages/product/index?id=${id}&storeId=${recommendationStoreId.value}` })
}

// 打开邀请好友活动页。
function goInvite() {
  uni.navigateTo({ url: '/pages/invite/index' })
}

function goMember() {
  uni.switchTab({ url: '/pages/my/index' })
}

function goOrders() {
  uni.navigateTo({ url: '/pages/orders/index' })
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
      <image class="hero__image" src="/static/home/home-background.jpg" mode="aspectFill" />
    </view>
    <view class="fulfillment-card">
      <view class="fulfillment-card__header">
        <view class="member-copy">
          <text class="member-hello">Hello</text>
          <text class="member-title">欢迎加入花哩时叙会员</text>
        </view>
        <button class="member-button" @click="goMember">查看详情</button>
      </view>
      <view class="fulfillment-options">
        <button class="fulfillment-option" @click="goShopping('pickup')">
          <view class="entry-icon"><text class="iconfont icon-shouye1" /></view>
          <text class="entry-title">门店自提</text>
          <text class="entry-english">PICK UP</text>
          <text class="muted">路过花店，带一束回家</text>
        </button>
        <button class="fulfillment-option" @click="goShopping('delivery')">
          <view class="entry-icon"><text class="iconfont icon-address" /></view>
          <text class="entry-title">外卖到家</text>
          <text class="entry-english">DELIVERY</text>
          <text class="muted">新零售鲜花配送到家</text>
        </button>
      </view>
    </view>
    <button class="order-bar" @click="goOrders">
      <view class="order-bar__title"
        ><UniIcons type="list" size="20" color="#ffffff" /><text>订单中心</text></view
      >
      <view class="order-bar__hint"
        ><text>新零售鲜花配送到家</text><text class="iconfont icon-youjiantou1"
      /></view>
    </button>
    <button class="custom-card" @click="goBouquets">
      <view class="custom-card__copy">
        <text class="section-title">送TA一束花</text>
        <text class="muted">成品花 | 生日用花 | 礼品用花 | 同城配送</text>
      </view>
      <view class="round-action">选购</view>
    </button>
    <view class="gift-card">
      <view class="gift-card__copy">
        <text class="gift-card__icon iconfont icon-liwuhe" />
        <text class="entry-title">新注册用户可以免费领取一束鲜花</text>
        <button class="invite-link" @click="goInvite">分享给朋友，他领一束，你也得一束</button>
        <text
          v-if="giftDescription || giftResource.loading.value || giftResource.message.value"
          class="gift-status"
          >{{
            giftDescription ||
            (giftResource.loading.value ? '正在加载花礼…' : giftResource.message.value)
          }}</text
        >
        <button
          v-if="userStore.token && giftResource.message.value && !giftResource.pending.value"
          class="text-button"
          @click="giftResource.load"
        >
          重试
        </button>
      </view>
      <button
        class="round-action"
        :disabled="claiming || giftResource.loading.value || (!!userStore.token && !!gift && !gift.coupon && !gift.canClaim)"
        :aria-label="couponButtonLabel"
        @click="claimNewUserCoupon"
      >
        {{ claiming ? '领取中' : !userStore.token ? '注册' : gift?.coupon ? '查看' : '领取' }}
      </button>
    </view>
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
        v-for="product in recommended"
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
            {{ product.methods.map((item) => (item === 'pickup' ? '自取' : '配送')).join(' / ') }}
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
      <text class="muted">商品信息以所选门店当前配置为准</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@use './home.scss';
</style>
