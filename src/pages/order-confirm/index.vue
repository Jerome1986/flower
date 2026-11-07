<script setup lang="ts">
import { getAvailableCouponsApi } from '@/api/marketing'
import { quoteOrderApi } from '@/api/orders'
import { commonPayApi, createOrderFreeApi, orderPayApi } from '@/api/payment'
import { useCartStore } from '@/stores/modules/cart'
import { useUserStore } from '@/stores/modules/user'
import type { CouponItem } from '@/types/coupon'
import type { CartOrderSelection, OrderQuote } from '@/types/order-api'
import { makeRequestKey } from '@/utils/order-input'
import { getRequestFailure } from '@/utils/request-error'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
import { canRequestWechatPayment, requestWechatPayment } from './payment'
const cart = useCartStore(),
  user = useUserStore()
const id = ref(''),
  loading = ref(false),
  submitting = ref(false),
  error = ref('')
const quote = ref<OrderQuote>(),
  coupons = ref<CouponItem[]>([]),
  couponId = ref('')
// 优惠券选择弹窗的显示状态。
const showCoupons = ref(false)
const couponLabel = computed(
  () =>
    coupons.value.find((item) => String(item.id) === couponId.value)?.name ||
    (coupons.value.length ? '选择优惠券' : '暂无可用优惠券'),
)
const session = computed(() => (cart.confirmation?.id === id.value ? cart.confirmation : undefined))
const common = computed(() => session.value?.items[0])
const locked = computed(() => Boolean(session.value?.submission))
let version = 0,
  initialized = ''
// 支付操作版本；离开页面或切换账户后，不再处理旧支付回调。
let paymentVersion = 0
const money = (value: number) => {
  return (value / 100).toFixed(2)
}
// 按本地日期展示优惠券有效期。
const couponExpiry = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate(),
  ).padStart(2, '0')}`
}
const back = () => {
  uni.switchTab({ url: '/pages/cart/index' })
}
const selection = (): CartOrderSelection => {
  const current = session.value
  if (!current || !common.value) throw new Error('结算信息已失效，请返回购物车')
  return {
    storeId: Number(common.value.storeId),
    method: common.value.method,
    items: current.items.map((item) => ({
      productId: Number(item.productId),
      specId: Number(item.specId),
      quantity: item.quantity,
      remark: item.remark,
    })),
    ...(couponId.value ? { couponId: Number(couponId.value) } : {}),
  }
}
const load = async () => {
  const current = ++version,
    token = user.token,
    owner = cart.owner
  quote.value = undefined
  error.value = ''
  if (!session.value || !user.token) return
  if (session.value.orderNo || session.value.submission) return
  loading.value = true
  try {
    const input = selection()
    delete input.couponId
    const result = await getAvailableCouponsApi(input)
    if (current !== version || token !== user.token || owner !== cart.owner) return
    coupons.value = result.data
    if (initialized !== id.value) {
      const ids = [...new Set(session.value.items.map((item) => item.couponId).filter(Boolean))]
      couponId.value = ids.length === 1 ? ids[0] : ''
      initialized = id.value
    }
    if (couponId.value && !coupons.value.some((c) => String(c.id) === couponId.value)) {
      couponId.value = ''
      error.value = '原优惠券已不可用，请重新确认金额'
    }
    const priced = await quoteOrderApi(selection())
    if (current !== version || token !== user.token || owner !== cart.owner) return
    quote.value = priced.data
  } catch {
    if (current === version) error.value = '商品、库存或优惠券信息已变化，调整购物车或重试'
  } finally {
    if (current === version) loading.value = false
  }
}
const chooseCoupon = (value: string) => {
  if (loading.value || submitting.value || locked.value) return
  showCoupons.value = false
  couponId.value = value
  void load()
}
const result = (orderNo: string) => {
  uni.redirectTo({ url: '/pages/payment-result/index?orderNo=' + encodeURIComponent(orderNo) })
}
const submit = async () => {
  if (submitting.value || !session.value || !common.value || !user.token) return
  if (!canRequestWechatPayment()) {
    uni.showToast({ title: '请在微信小程序中支付', icon: 'none' })
    return
  }
  // 当前项目字段为 openId，支付接口沿用旧项目的 openid 命名。
  const openid = user.profile?.openId
  if (!openid) {
    error.value = '微信登录信息缺失，请重新登录后支付'
    return
  }
  if (session.value.orderNo && session.value.submission?.expectedAmount === 0)
    return result(session.value.orderNo)
  if (!session.value.submission && (!quote.value || loading.value)) return
  const token = user.token,
    owner = cart.owner,
    currentId = id.value
  const operation = ++paymentVersion
  const active = () =>
    operation === paymentVersion &&
    token === user.token &&
    owner === cart.owner &&
    currentId === id.value
  submitting.value = true
  error.value = ''
  let requestStarted = false
  try {
    if (!session.value.submission) {
      cart.lockSubmission(currentId, {
        ...selection(),
        requestKey: makeRequestKey(),
        contactName: common.value.contactName,
        contactPhone: common.value.contactPhone,
        address: common.value.address,
        expectedAmount: quote.value!.payableAmount,
      })
    }
    const input = { ...session.value!.submission!, openid }
    requestStarted = true
    // 零元订单无需拉起微信收银台，状态仍由服务端决定。
    if (input.expectedAmount === 0) {
      const { data } = await createOrderFreeApi(input)
      if (!active()) return
      if (!data.orderId) throw new Error('订单编号缺失，请重试确认结果')
      cart.complete(currentId, data.orderId)
      result(data.orderId)
      return
    }
    const existingOrder = session.value!.orderNo
    const { data } = existingOrder
      ? await orderPayApi(existingOrder, openid)
      : await commonPayApi(input)
    if (!active()) return
    if (!data.orderId || (existingOrder && data.orderId !== existingOrder))
      throw new Error('支付订单编号异常，请重试确认结果')
    // 创建成功即持久化订单编号并扣减购物车；支付取消时保留原订单继续支付。
    cart.complete(currentId, data.orderId)
    await requestWechatPayment(data)
    if (active()) result(data.orderId)
  } catch (failure: unknown) {
    const requestFailure = getRequestFailure(failure)
    if (!active()) return
    if (session.value?.orderNo) {
      const cancelled = /cancel/i.test(requestFailure.errMsg || '')
      error.value = cancelled
        ? '已取消支付，可继续支付当前订单'
        : '支付未完成，请重试或查看订单状态'
      uni.showToast({ title: cancelled ? '取消支付' : '支付未完成', icon: 'none' })
      return
    }
    const definitive =
      requestStarted &&
      requestFailure.statusCode >= 400 &&
      requestFailure.statusCode < 500 &&
      ![401, 408, 429].includes(requestFailure.statusCode)
    if (definitive) {
      try {
        cart.unlock(currentId)
        await load()
      } catch {
        // 解锁或刷新失败时保留当前快照，后续仍需核对服务端结果。
      }
      error.value = '订单未创建，请重新核对商品、优惠券和金额后确认'
    } else
      error.value = requestStarted
        ? '提交结果待确认，请重试；不会重复创建订单'
        : '结算信息保存失败，请重试'
  } finally {
    if (active()) submitting.value = false
  }
}
watch(
  () => [user.token, cart.owner],
  () => {
    version++
    paymentVersion++
    quote.value = undefined
    coupons.value = []
    showCoupons.value = false
    loading.value = false
    submitting.value = false
    error.value = ''
  },
  { flush: 'sync' },
)
onLoad((options) => {
  id.value = options?.id || ''
})
onShow(load)
onUnload(() => {
  version++
  paymentVersion++
})
</script>

<template>
  <view class="confirm-page">
    <view v-if="!session || !common" class="panel"
      ><text>结算信息已失效，请返回购物车重新选择</text
      ><button @click="back">返回购物车</button></view
    >
    <template v-else>
      <view class="panel fulfillment"
        ><text class="title">{{ common.storeName }}</text
        ><text>{{ common.method === 'pickup' ? '门店自取' : '配送到家' }}</text
        ><text>{{ common.contactName }} · {{ common.contactPhone }}</text
        ><text v-if="common.address">{{ common.address }}</text
        ><text class="hint">使用购物车中确认的收花信息</text></view
      >
      <view class="panel">
        <view v-for="(item, index) in session.items" :key="item.id" class="product">
          <image :src="item.image" mode="aspectFill" />
          <view class="product-copy"
            ><text class="title">{{ quote?.items?.[index]?.productName || item.productName }}</text
            ><text class="hint">{{ item.specName }} / {{ item.unit }} × {{ item.quantity }}</text
            ><text>¥{{ money(quote?.items?.[index]?.unitPrice ?? item.unitPrice) }}</text
            ><text v-if="item.remark" class="hint">备注：{{ item.remark }}</text></view
          >
        </view>
      </view>
      <view v-if="!locked" class="panel">
        <button class="coupon-entry" :disabled="loading || submitting" @click="showCoupons = true">
          <text class="title">优惠券</text>
          <text class="coupon-summary">{{ couponLabel }}</text>
          <text class="iconfont icon-youjiantou1" />
        </button>
      </view>
      <view
        v-if="showCoupons && !locked"
        class="coupon-mask"
        @click="showCoupons = false"
        @touchmove.stop.prevent
      >
        <view class="coupon-sheet" @click.stop>
          <view class="coupon-heading">
            <text class="title">选择优惠券</text>
            <button class="coupon-close" aria-label="关闭优惠券弹窗" @click="showCoupons = false">
              ×
            </button>
          </view>
          <scroll-view scroll-y class="coupon-list">
            <button
              class="coupon-none"
              :class="{ selected: !couponId }"
              :disabled="loading || submitting"
              @click="chooseCoupon('')"
            >
              <text>不使用优惠券</text>
              <text class="coupon-check">{{ !couponId ? '✓' : '' }}</text>
            </button>
            <button
              v-for="coupon in coupons"
              :key="coupon.id"
              class="coupon-card"
              :class="{ selected: couponId === String(coupon.id) }"
              :disabled="loading || submitting"
              @click="chooseCoupon(String(coupon.id))"
            >
              <view class="coupon-value">
                <text v-if="coupon.type === 'CASH'" class="coupon-amount"
                  ><text class="coupon-currency">¥</text>{{ coupon.cashAmount }}</text
                >
                <text v-else class="coupon-exchange">兑换</text>
                <text class="coupon-kind">{{
                  coupon.type === 'CASH' ? '现金抵扣券' : '商品兑换券'
                }}</text>
              </view>
              <view class="coupon-info">
                <text class="coupon-name">{{ coupon.name }}</text>
                <text class="coupon-rule"
                  >{{
                    coupon.type === 'CASH'
                      ? '全部商品可用'
                      : [coupon.exchangeProductName, coupon.exchangeSpecName]
                          .filter(Boolean)
                          .join(' · ')
                  }}<text v-if="coupon.type === 'EXCHANGE' && coupon.exchangeQuantity">
                    × {{ coupon.exchangeQuantity }}</text
                  ></text
                >
                <text v-if="couponExpiry(coupon.expiresAt)" class="coupon-expiry"
                  >有效期至 {{ couponExpiry(coupon.expiresAt) }}</text
                >
              </view>
              <text class="coupon-check">{{ couponId === String(coupon.id) ? '✓' : '' }}</text>
            </button>
            <text v-if="!coupons.length && !loading" class="hint">暂无可用优惠券</text>
          </scroll-view>
        </view>
      </view>
      <view v-if="quote" class="panel">
        <view class="amount"
          ><text>商品金额</text><text>¥{{ money(quote.productAmount) }}</text></view
        >
        <view class="amount"
          ><text>配送费</text><text>¥{{ money(quote.deliveryFee) }}</text></view
        >
        <view class="amount"
          ><text>优惠金额</text><text>−¥{{ money(quote.discountAmount) }}</text></view
        >
        <view class="amount"
          ><text>应付金额</text><text class="price">¥{{ money(quote.payableAmount) }}</text></view
        >
      </view>
      <view v-if="loading || error" class="panel feedback"
        ><text>{{ loading ? '正在核对订单信息…' : error }}</text
        ><button v-if="!loading && !locked" @click="load">重新核对</button></view
      >
      <view v-if="locked && !session.orderNo" class="panel"
        ><text>订单提交信息已保存，请重试确认结果。</text
        ><text class="hint"
          >应付 ¥{{ money(session.submission!.expectedAmount) }}；重试不会重复创建订单</text
        ></view
      >
      <view class="footer">
        <button v-if="session.orderNo && !submitting" @click="result(session.orderNo)">
          查看订单状态
        </button>
        <button
          class="primary"
          :loading="submitting"
          :disabled="submitting || (!locked && (!quote || loading))"
          @click="submit"
        >
          {{
            session.orderNo
              ? session.submission?.expectedAmount === 0
                ? '查看订单'
                : '继续支付'
              : locked
              ? '重试确认订单'
              : quote?.payableAmount === 0
              ? '提交订单'
              : '微信支付'
          }}
        </button></view
      >
    </template>
  </view>
</template>

<style lang="scss" scoped>
.confirm-page {
  min-height: 100vh;
  box-sizing: border-box;
  background: $qs-pageBackGroundColor;
  padding: 24rpx 24rpx calc(264rpx + env(safe-area-inset-bottom));
  color: $qs-font-body;
}
.panel {
  padding: 32rpx;
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow-wrap: anywhere;
  border: 1rpx solid $qs-divider;
}
.fulfillment > text,
.product-copy > text {
  display: block;
  margin-bottom: 12rpx;
}
.title {
  font-size: 32rpx;
  font-weight: 600;
  color: $qs-font-title;
}
.hint {
  display: block;
  font-size: 24rpx;
  color: $qs-font-dec;
  line-height: 1.7;
}
.product {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid $qs-divider;
  image {
    width: 130rpx;
    height: 150rpx;
    border-radius: 16rpx;
    flex: none;
  }
}
.product-copy {
  flex: 1;
  min-width: 0;
}
button {
  font-size: 26rpx;
  margin-top: 16rpx;
  &::after {
    border: 0;
  }
}
.amount {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  font-size: 28rpx;
}
.price {
  font-size: 34rpx;
  color: $qs-accent-text;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.coupon-entry {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  line-height: 1.5;
}
.coupon-summary {
  flex: 1;
  min-width: 0;
  text-align: right;
  color: $qs-font-dec;
}
.coupon-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.4);
}
.coupon-sheet {
  width: 100%;
  box-sizing: border-box;
  padding: 32rpx 24rpx calc(32rpx + env(safe-area-inset-bottom));
  border-radius: 32rpx 32rpx 0 0;
  background: $qs-card-bg;
}
.coupon-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.coupon-close {
  margin: 0;
  padding: 0;
  width: 64rpx;
  height: 64rpx;
  line-height: 64rpx;
  background: transparent;
  font-size: 40rpx;
}
.coupon-list {
  height: 55vh;
}
.coupon-card,
.coupon-none {
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  margin: 0 0 24rpx;
  padding: 24rpx 24rpx;
  border: 2rpx solid $qs-border;
  border-radius: 20rpx;
  background: $qs-card-bg;
  text-align: left;
  line-height: 1.6;
  white-space: normal;
  overflow-wrap: anywhere;
  &.selected {
    border-color: $qs-brandColor;
    background: $qs-brandColor-light;
    .coupon-check {
      background: $qs-brandColor;
      border-color: $qs-brandColor;
      color: $qs-font-inverse;
    }
  }
}
.coupon-none {
  justify-content: space-between;
}
.coupon-value {
  flex: 0 0 160rpx;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-right: 24rpx;
  border-right: 2rpx dashed $qs-border;
  text-align: center;
  color: $qs-font-inverse;
}
.coupon-amount {
  font-size: 42rpx;
  font-weight: 600;
}
.coupon-currency {
  font-size: 24rpx;
}
.coupon-exchange {
  font-size: 36rpx;
  font-weight: 600;
}
.coupon-kind {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $qs-font-dec;
}
.coupon-info {
  flex: 1;
  min-width: 0;
  padding: 0 24rpx;
  > text {
    display: block;
  }
}
.coupon-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $qs-font-title;
}
.coupon-rule {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $qs-font-dec;
}
.coupon-expiry {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: $qs-font-dec2;
}
.coupon-check {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid $qs-border;
  border-radius: 50%;
  text-align: center;
  line-height: 1;
  font-size: 24rpx;
}
.feedback {
  color: $qs-warning;
}
.footer {
  position: fixed;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1rpx solid $qs-divider;
  padding: 16rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 88rpx;
    margin: 0;
    padding: 16rpx 24rpx;
    line-height: 1.5;
  }
}
.primary {
  margin-top: 0;
  background: $qs-brandColor;
  color: $qs-font-inverse;
  border-radius: 16rpx;
  min-height: 88rpx;
  font-weight: 500;
}
</style>
