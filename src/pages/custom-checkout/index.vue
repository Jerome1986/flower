<script setup lang="ts">
import { orderPayApi } from '@/api/payment'
import { useResource } from '@/composables/use-resource'
import { getAddresses } from '@/pages/addresses/address-actions'
import { getBouquet } from '@/pages/bouquets/bouquet-data'
import { canRequestWechatPayment, requestWechatPayment } from '@/pages/order-confirm/payment'
import { useUserStore } from '@/stores/modules/user'
import type { Address } from '@/types/address'
import type { CouponItem } from '@/types/coupon'
import type { CustomQuote, CustomSubmission } from '@/types/integration'
import { integrationMessage } from '@/utils/integration'
import { makeRequestKey, positiveId, positiveQuantity } from '@/utils/order-input'
import { getRequestFailure } from '@/utils/request-error'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
import {
  customCheckoutEnabled,
  getCustomCoupons,
  quoteCustom,
  submitCustom,
} from './bouquet-checkout'
const user = useUserStore()
const bouquetId = ref('')
const specId = ref('')
const quantity = ref(1)
const invalidRoute = ref(false)
const resource = useResource(() => getBouquet(bouquetId.value), false)
const bouquet = resource.data
const loading = resource.loading
const message = resource.message
const pending = resource.pending
const spec = computed(() => bouquet.value?.specs.find((item) => item.id === specId.value))
const name = ref('')
const phone = ref('')
const address = ref('')
const remark = ref('')
const quote = ref<CustomQuote>()
// 当前规格可用券与用户选择，金额以服务端报价为准。
const coupons = ref<CouponItem[]>([])
const couponId = ref<number>()
const showCoupons = ref(false)
const couponLabel = computed(
  () => coupons.value.find((item) => item.id === couponId.value)?.name || '不使用优惠券',
)
const quoteLoading = ref(false)
const quoteMessage = ref('')
const addressMessage = ref('')
const submitting = ref(false)
const submission = ref<CustomSubmission>()
const createdOrderNo = ref('')
const locked = computed(() => submitting.value || Boolean(submission.value))
let loadVersion = 0
let quoteVersion = 0
let addressVersion = 0
let requestKey = makeRequestKey()
let paymentVersion = 0
const reset = () => {
  paymentVersion++
  coupons.value = []
  couponId.value = undefined
  showCoupons.value = false
  addressVersion++
  loadVersion++
  quoteVersion++
  quote.value = undefined
  submission.value = undefined
  submitting.value = false
  quoteLoading.value = false
  name.value = ''
  phone.value = ''
  address.value = ''
  remark.value = ''
  createdOrderNo.value = ''
  requestKey = makeRequestKey()
  quoteMessage.value = ''
  addressMessage.value = ''
}
const goBouquets = () => {
  uni.redirectTo({ url: '/pages/bouquets/index' })
}
const login = () => {
  const back =
    '/pages/custom-checkout/index?id=' +
    encodeURIComponent(bouquetId.value) +
    '&specId=' +
    encodeURIComponent(specId.value) +
    '&quantity=' +
    quantity.value
  uni.navigateTo({ url: '/pages/login/index?returnUrl=' + encodeURIComponent(back) })
}
const selection = () => {
  return {
    bouquetId: bouquetId.value,
    specId: specId.value,
    quantity: quantity.value,
    address: address.value.trim(),
    ...(couponId.value ? { couponId: couponId.value } : {}),
  }
}
const applyAddress = (item: Address) => {
  if (locked.value) return
  addressVersion++
  addressMessage.value = ''
  name.value = item.name
  phone.value = item.phone
  address.value = [item.region, item.detail].filter(Boolean).join(' ')
}
const chooseAddress = () => {
  if (locked.value) return
  if (!user.token) return login()
  const token = user.token
  uni.navigateTo({
    url: '/pages/addresses/index?select=1',
    events: {
      addressSelected: (item: Address) => {
        if (token === user.token) applyAddress(item)
      },
    },
  })
}
const loadDefaultAddress = async () => {
  const version = ++addressVersion
  const token = user.token
  if (!token || locked.value) return
  try {
    const list = await getAddresses()
    if (version !== addressVersion || token !== user.token || locked.value) return
    addressMessage.value = ''
    const item = list.find((item) => item.isDefault)
    if (token === user.token && item && !name.value.trim() && !address.value.trim())
      applyAddress(item)
  } catch (error) {
    if (version === addressVersion && token === user.token)
      addressMessage.value = integrationMessage(error, '地址加载失败，可手动填写')
  }
}
const load = async () => {
  const version = ++loadVersion
  if (!customCheckoutEnabled || invalidRoute.value) return
  ++quoteVersion
  quote.value = undefined
  quoteLoading.value = false
  await resource.load()
  if (version !== loadVersion) return
  if (!phone.value) phone.value = user.profile?.phone || ''
  if (!bouquet.value) return
  if (!spec.value) {
    resource.message.value = '规格不可用，请重新选择'
    return
  }
  await loadDefaultAddress()
  if (version === loadVersion && address.value.trim()) await refreshQuote()
}
const refreshQuote = async () => {
  const version = ++quoteVersion
  const token = user.token
  quote.value = undefined
  quoteMessage.value = ''
  quoteLoading.value = false
  if (!customCheckoutEnabled || invalidRoute.value || locked.value || !spec.value) return
  if (!token) return login()
  if (!address.value.trim()) {
    quoteMessage.value = '请先填写配送地址'
    return
  }
  if (quantity.value > (bouquet.value?.maxQuantity || 1)) {
    quoteMessage.value = '单笔购买数量超过限制'
    return
  }
  quoteLoading.value = true
  try {
    const list = await getCustomCoupons(selection())
    if (version !== quoteVersion || token !== user.token) return
    coupons.value = list
    if (couponId.value && !list.some((item) => item.id === couponId.value)) {
      couponId.value = undefined
      quoteMessage.value = '原优惠券已不可用，已按不用券重新报价，请确认金额'
    }
    const result = await quoteCustom(selection())
    if (version === quoteVersion && token === user.token) quote.value = result
  } catch (error) {
    if (version === quoteVersion && token === user.token)
      quoteMessage.value = integrationMessage(error, '报价失败，请重试')
  } finally {
    if (version === quoteVersion) quoteLoading.value = false
  }
}
const submit = async () => {
  if (!customCheckoutEnabled || invalidRoute.value || submitting.value) return
  if (createdOrderNo.value) return payCreatedOrder()
  if (!user.token) return login()
  if (
    !submission.value &&
    (!quote.value || !spec.value || quantity.value > (bouquet.value?.maxQuantity || 1))
  )
    return
  if (!name.value.trim() || !/^1\d{10}$/.test(phone.value) || !address.value.trim()) {
    uni.showToast({ title: '请填写完整联系人、手机号和地址', icon: 'none' })
    return
  }
  const token = user.token
  submitting.value = true
  submission.value ??= {
    ...selection(),
    requestKey,
    contactName: name.value.trim(),
    contactPhone: phone.value,
    remark: remark.value.trim(),
    expectedAmount: quote.value!.payableAmount,
  }
  try {
    const order = await submitCustom(submission.value)
    if (token !== user.token) return
    createdOrderNo.value = order.orderNo
    await payCreatedOrder()
  } catch (error: unknown) {
    const requestFailure = getRequestFailure(error)
    if (token !== user.token) return
    quoteMessage.value = integrationMessage(error, '提交失败，请重试')
    if (
      requestFailure.statusCode >= 400 &&
      requestFailure.statusCode < 500 &&
      requestFailure.statusCode !== 401
    ) {
      submission.value = undefined
      requestKey = makeRequestKey()
      submitting.value = false
      await load()
    }
  } finally {
    if (token === user.token) submitting.value = false
  }
}
// 付款取消或失败保留订单，重试仅获取同一笔订单的支付参数。
const payCreatedOrder = async () => {
  const no = createdOrderNo.value
  const token = user.token
  const version = ++paymentVersion
  const active = () =>
    token === user.token && no === createdOrderNo.value && version === paymentVersion
  if (!no || !token) return
  if (submission.value?.expectedAmount === 0)
    return uni.redirectTo({ url: '/pages/payment-result/index?orderNo=' + encodeURIComponent(no) })
  if (!canRequestWechatPayment()) {
    quoteMessage.value = '请在微信小程序中继续支付，可在我的订单中查看'
    return
  }
  const openid = user.profile?.openId
  if (!openid) {
    quoteMessage.value = '请重新微信登录后继续支付'
    return
  }
  submitting.value = true
  try {
    const response = await orderPayApi(no, openid)
    if (!active()) return
    if (response.data.orderId !== no) throw new Error('支付订单编号异常')
    await requestWechatPayment(response.data)
    if (active())
      uni.redirectTo({ url: '/pages/payment-result/index?orderNo=' + encodeURIComponent(no) })
  } catch (error: unknown) {
    const requestFailure = getRequestFailure(error)
    if (active())
      quoteMessage.value = requestFailure.errMsg?.includes('cancel')
        ? '已取消支付，订单已保留，可继续支付'
        : '支付结果未确认，可继续支付或在我的订单查看'
  } finally {
    if (active()) submitting.value = false
  }
}
// 展开券列表前重新核验，避免展示已失效的券。
const chooseCoupon = async () => {
  if (locked.value || quoteLoading.value) return
  if (!user.token) return login()
  await refreshQuote()
  if (quote.value && !locked.value) showCoupons.value = true
}
// 切换优惠券后立即使旧金额失效并重新报价。
const selectCoupon = async (value?: number) => {
  if (locked.value || quoteLoading.value) return
  couponId.value = value
  showCoupons.value = false
  await refreshQuote()
}
watch(() => user.token, reset, { flush: 'sync' })
onUnload(() => {
  paymentVersion++
  addressVersion++
  loadVersion++
  quoteVersion++
})
onLoad((options) => {
  bouquetId.value = options?.id || ''
  specId.value = options?.specId || ''
  quantity.value = Number(options?.quantity)
  invalidRoute.value =
    !positiveId(bouquetId.value) ||
    !positiveId(specId.value) ||
    !positiveQuantity(quantity.value) ||
    quantity.value > 999
})
onShow(load)
// 地址变化立即使旧报价失效，用户确认地址后主动报价，避免每个按键发请求。
watch(
  address,
  () => {
    coupons.value = []
    showCoupons.value = false
    quoteVersion++
    quote.value = undefined
    quoteMessage.value = ''
    quoteLoading.value = false
  },
  { flush: 'sync' },
)
</script>
<template>
  <view class="checkout-page">
    <view class="panel"
      ><text class="section-title">确认花束订单</text
      ><text class="hint">平台安排配送 · 支付成功后安排制作</text></view
    >
    <view v-if="!customCheckoutEnabled || invalidRoute" class="panel"
      ><text>订单参数不完整，请重新选购</text
      ><button @click="goBouquets">返回花束专区</button></view
    >
    <view v-else-if="loading || message" class="panel"
      ><text>{{ loading ? '正在加载花束…' : message }}</text
      ><button v-if="!loading && !pending" @click="load">重试</button></view
    >
    <template v-else-if="bouquet && spec">
      <view class="panel"
        ><image class="summary-image" :src="bouquet.image" mode="aspectFill" /><text
          class="section-title"
          >{{ bouquet.name }}</text
        ><text class="hint">{{ spec.name }} / {{ spec.unit }} × {{ quantity }}</text></view
      >
      <view class="panel">
        <text class="section-title">收货信息</text
        ><button :disabled="locked" @click="chooseAddress">选择收货地址</button
        ><text class="hint">{{ addressMessage }}</text>
        <view class="contact-field"
          ><input
            v-model="name"
            :disabled="locked"
            :maxlength="64"
            class="form-input"
            placeholder="收货人姓名"
        /></view>
        <view class="contact-field"
          ><input
            v-model="phone"
            :disabled="locked"
            type="number"
            :maxlength="11"
            class="form-input"
            placeholder="联系电话"
        /></view>
        <textarea
          v-model="address"
          :disabled="locked"
          :maxlength="500"
          class="remark-input"
          placeholder="完整配送地址"
        />
      </view>
      <view class="panel">
        <text class="section-title">订单备注</text>
        <text class="hint">可填写配送提醒；固定款式不支持改款</text>
        <textarea
          v-model="remark"
          :disabled="locked"
          :maxlength="500"
          class="remark-input"
          placeholder="订单备注（选填）"
        />
      </view>
      <view class="panel">
        <text class="section-title">订单金额</text
        ><button :disabled="locked || quoteLoading" @click="chooseCoupon">
          优惠券：{{ couponLabel }}
        </button>
        <view v-if="showCoupons" class="coupon-list">
          <button @click="selectCoupon()">不使用优惠券</button>
          <button v-for="item in coupons" :key="item.id" @click="selectCoupon(item.id)">
            {{ item.name }} ·
            {{
              item.type === 'CASH'
                ? '抵扣¥' + Number(item.cashAmount).toFixed(2)
                : '兑换' + item.exchangeQuantity + '份'
            }}
            <text class="hint">有效期至 {{ item.expiresAt.slice(0, 10) }}</text>
          </button>
          <text v-if="!coupons.length" class="hint">当前花束暂无可用优惠券</text>
          <button @click="showCoupons = false">收起</button>
        </view>
        <template v-if="quote"
          ><view class="amount-row"
            ><text>商品金额</text><text>¥{{ (quote.productAmount / 100).toFixed(2) }}</text></view
          ><view class="amount-row"
            ><text>配送费</text><text>¥{{ (quote.deliveryFee / 100).toFixed(2) }}</text></view
          ><view class="amount-row"
            ><text>优惠金额</text><text>−¥{{ (quote.discountAmount / 100).toFixed(2) }}</text></view
          ><view class="amount-row"
            ><text>合计</text><text>¥{{ (quote.payableAmount / 100).toFixed(2) }}</text></view
          ></template
        >
        <text v-if="!quote && !quoteMessage" class="hint"
          >填写地址后，点击下方按钮确认配送费与合计</text
        >
        <text v-if="quoteMessage" class="hint">{{ quoteMessage }}</text>
        <button v-if="!user.token" @click="login">微信手机号登录</button
        ><button
          v-else
          :disabled="locked || quoteLoading"
          :loading="quoteLoading"
          @click="refreshQuote"
        >
          确认地址并刷新金额
        </button>
      </view>
      <view class="submit-bar"
        ><view
          ><text class="total-label">应付合计</text
          ><text class="checkout-total">{{
            quote ? '¥' + (quote.payableAmount / 100).toFixed(2) : '请先确认地址'
          }}</text></view
        ><button
          class="submit-button"
          :disabled="submitting || (!quote && !submission && !createdOrderNo)"
          :loading="submitting"
          @click="submit"
        >
          {{
            createdOrderNo
              ? '继续支付'
              : submission
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
@use './custom-checkout.scss' as page;
.hint {
  display: block;
  margin-top: 16rpx;
}
.coupon-list {
  margin-top: 20rpx;
  padding: 16rpx;
  border: 1rpx solid $qs-divider;
  border-radius: 16rpx;
  button {
    margin-bottom: 12rpx;
    padding: 16rpx;
    font-size: 26rpx;
  }
}
.remark-input {
  margin-top: 24rpx;
  width: 100%;
  height: 140rpx;
}
</style>
