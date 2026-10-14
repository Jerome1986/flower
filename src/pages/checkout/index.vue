<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { getStore, getProduct } from '@/pages/stores/shop-data'
import type { ShopProduct } from '@/types/shop'
import type { OrderQuote, OrderSelection, OrderSubmission } from '@/types/order-api'
import { quoteCheckout, submitCheckout } from '@/pages/checkout/checkout-actions'
import { getAvailableCouponsApi as getAvailableCoupons } from '@/api/marketing'
import { couponCheckoutEnabled } from '@/pages/checkout/coupon-config'
import { useResource } from '@/composables/use-resource'
import type { FlowerStore } from '@/types/store'
import { useUserStore } from '@/stores/modules/user'
import { getAddresses } from '@/pages/addresses/address-actions'
import { isIntegrationPending } from '@/utils/integration'
import type { Address } from '@/types/address'
import { positiveId, positiveQuantity, makeRequestKey } from '@/utils/order-input'
const user = useUserStore()
const productId = ref('')
const storeId = ref('')
const specId = ref('')
const quantity = ref(1)
const method = ref<'pickup' | 'delivery'>('pickup')
const product = ref<ShopProduct>()
const store = ref<FlowerStore>()
const spec = computed(() => product.value?.specs.find((item) => item.id === specId.value))
const name = ref('')
const phone = ref('')
const address = ref('')
const remark = ref('')
const quote = ref<OrderQuote>()
const loading = ref(false)
const submitting = ref(false)
const failed = ref(false)
const invalidRoute = ref(false)
const quoteFailed = ref(false)
const createdOrderNo = ref('')
const submission = ref<OrderSubmission>()
const addressMessage = ref('')
const selectedAddressId = ref('')
const selectedCouponId = ref('')
let submittedCouponId = ''
const couponResource = useResource(() => getAvailableCoupons(selection()))
const coupons = couponResource.data
async function loadCoupons() {
  if (couponCheckoutEnabled && user.token && spec.value && !locked.value)
    await couponResource.load()
}
function chooseCoupon(id: string) {
  if (locked.value || !couponCheckoutEnabled) return
  selectedCouponId.value = id
  void refreshQuote()
}
const locked = computed(() => submitting.value || Boolean(submission.value))
let requestKey = makeRequestKey()
let quoteVersion = 0
let loadVersion = 0
function goShopping() {
  uni.switchTab({ url: '/pages/order/index' })
}
function selection(): OrderSelection {
  return {
    storeId: Number(storeId.value),
    productId: Number(productId.value),
    specId: Number(specId.value),
    quantity: quantity.value,
    method: method.value,
  }
}
function login() {
  const back =
    '/pages/checkout/index?id=' +
    productId.value +
    '&storeId=' +
    storeId.value +
    '&specId=' +
    specId.value +
    '&quantity=' +
    quantity.value +
    '&method=' +
    method.value
  uni.navigateTo({ url: '/pages/test-login/index?returnUrl=' + encodeURIComponent(back) })
}
function applyAddress(item: Address) {
  if (locked.value) return
  selectedAddressId.value = item.id
  name.value = item.name
  phone.value = item.phone
  address.value = [item.region, item.detail].filter(Boolean).join(' ')
}
function chooseAddress() {
  if (locked.value) return
  if (!user.token) return login()
  const token = user.token
  uni.navigateTo({
    url:
      '/pages/addresses/index?select=1&selectedId=' + encodeURIComponent(selectedAddressId.value),
    events: {
      addressSelected: (item: Address) => {
        if (token === user.token) applyAddress(item)
      },
    },
  })
}
async function loadDefaultAddress() {
  if (!user.token || method.value !== 'delivery' || locked.value) return
  const token = user.token
  try {
    const list = await getAddresses()
    if (token !== user.token || method.value !== 'delivery') return
    addressMessage.value = ''
    const item = list.find((item) => item.isDefault)
    if (item && !name.value.trim() && !address.value.trim()) applyAddress(item)
  } catch (error) {
    if (token === user.token)
      addressMessage.value = isIntegrationPending(error)
        ? '地址管理暂未开放，请手动填写'
        : '地址加载失败，可手动填写或重试选择'
  }
}
function resetAccount() {
  loadVersion++
  quoteVersion++
  submission.value = undefined
  selectedCouponId.value = ''
  submittedCouponId = ''
  requestKey = makeRequestKey()
  createdOrderNo.value = ''
  quote.value = undefined
  name.value = ''
  phone.value = ''
  address.value = ''
  remark.value = ''
  selectedAddressId.value = ''
  addressMessage.value = ''
  submitting.value = false
  loading.value = false
}
watch(() => user.token, resetAccount, { flush: 'sync' })
onUnload(() => {
  loadVersion++
  quoteVersion++
})
async function refreshQuote() {
  const version = ++quoteVersion
  const token = user.token
  quote.value = undefined
  quoteFailed.value = false
  if (!token || !spec.value || invalidRoute.value || locked.value) return
  try {
    const { data } = await quoteCheckout(selection(), selectedCouponId.value)
    if (version === quoteVersion && token === user.token) quote.value = data
  } catch {
    if (version === quoteVersion && token === user.token) quoteFailed.value = true
  }
}
async function load() {
  const version = ++loadVersion
  ++quoteVersion
  if (invalidRoute.value) return
  loading.value = true
  failed.value = false
  quote.value = undefined
  try {
    const [s, p] = await Promise.all([
      getStore(storeId.value),
      getProduct(storeId.value, productId.value),
    ])
    if (version !== loadVersion) return
    store.value = s
    product.value = p
    if (!spec.value || !p.methods.includes(method.value)) throw new Error('规格或配送方式不可用')
    if (!submission.value && (!s.open || quantity.value > spec.value.available))
      throw new Error('门店已关闭或库存不足')
    if (!phone.value) phone.value = user.profile?.phone || ''
    await loadCoupons()
    if (version !== loadVersion) return
    await refreshQuote()
    if (version === loadVersion) await loadDefaultAddress()
  } catch {
    if (version === loadVersion) failed.value = true
  } finally {
    if (version === loadVersion) loading.value = false
  }
}
onLoad((options) => {
  productId.value = options?.id || ''
  storeId.value = options?.storeId || ''
  specId.value = options?.specId || ''
  quantity.value = Number(options?.quantity)
  method.value = options?.method === 'delivery' ? 'delivery' : 'pickup'
  phone.value = user.profile?.phone || ''
  invalidRoute.value =
    Boolean(options?.type && options.type !== 'ordinary') ||
    ![productId.value, storeId.value, specId.value].every(positiveId) ||
    !positiveQuantity(quantity.value) ||
    !['pickup', 'delivery'].includes(options?.method || '')
})
onShow(load)
watch(
  method,
  () => {
    selectedCouponId.value = ''
    void refreshQuote()
    void loadCoupons()
    void loadDefaultAddress()
  },
  { flush: 'sync' },
)
function changeMethod(value: 'pickup' | 'delivery') {
  if (!locked.value && product.value?.methods.includes(value)) method.value = value
}
async function submit() {
  if (createdOrderNo.value)
    return uni.redirectTo({ url: '/pages/payment-result/index?orderNo=' + createdOrderNo.value })
  if (submitting.value) return
  if (!user.token) return login()
  if (
    invalidRoute.value ||
    failed.value ||
    loading.value ||
    (!quote.value && !submission.value) ||
    !spec.value
  )
    return
  if (
    !submission.value &&
    (!store.value?.open ||
      quantity.value > spec.value.available ||
      !product.value?.methods.includes(method.value))
  )
    return
  if (!name.value.trim()) return uni.showToast({ title: '请填写联系人', icon: 'none' })
  if (!/^1\d{10}$/.test(phone.value))
    return uni.showToast({ title: '请填写正确的手机号', icon: 'none' })
  if (method.value === 'delivery' && !address.value.trim())
    return uni.showToast({ title: '请填写配送地址', icon: 'none' })
  const token = user.token
  submitting.value = true
  // 网络失败复用幂等键与不可编辑的提交快照。
  if (!submission.value) submittedCouponId = selectedCouponId.value
  submission.value ??= {
    ...selection(),
    requestKey,
    contactName: name.value.trim(),
    contactPhone: phone.value,
    address: method.value === 'delivery' ? address.value.trim() : '',
    remark: remark.value.trim(),
    expectedAmount: quote.value!.payableAmount,
  }
  try {
    const order = await submitCheckout(submission.value, submittedCouponId)
    if (token !== user.token) return
    createdOrderNo.value = order.orderNo
    uni.redirectTo({ url: '/pages/payment-result/index?orderNo=' + order.orderNo })
  } catch (error: any) {
    if (token !== user.token) return
    if (error?.statusCode >= 400 && error?.statusCode < 500 && error.statusCode !== 401) {
      submission.value = undefined
      requestKey = makeRequestKey()
      submitting.value = false
      await load()
    }
  } finally {
    if (token === user.token) submitting.value = false
  }
}
</script>
<template>
  <view class="checkout-page">
    <view class="panel"
      ><text class="section-title">确认订单</text
      ><text class="hint">创建订单：只创建订单，不发起微信支付，不实际扣款。</text></view
    >
    <view v-if="invalidRoute" class="panel"
      ><text>订单参数不完整，请重新选择商品</text
      ><button @click="goShopping">返回选购</button></view
    >
    <view v-else-if="loading || failed" class="panel"
      ><text>{{
        loading ? '正在加载订单信息…' : '商品、门店、规格或库存不可用，请刷新或重新选择'
      }}</text
      ><button v-if="failed" @click="load">重新加载</button
      ><button v-if="failed" @click="goShopping">返回选购</button></view
    >
    <template v-else-if="product && store && spec">
      <view class="panel">
        <text class="section-title">{{ store.name }}</text
        ><text class="hint">{{ store.address }} · {{ store.hours }}</text>
        <view class="product-row"
          ><image
            :src="product.image"
            mode="aspectFill"
            style="width: 140rpx; height: 140rpx"
          /><view
            ><text class="product-name">{{ product.name }}</text
            ><text class="hint">{{ spec.name }} / {{ spec.unit }} × {{ quantity }}</text
            ><text class="price">¥{{ spec.price.toFixed(2) }}</text></view
          ></view
        >
        <view class="method-tabs">
          <button
            :disabled="locked || !product.methods.includes('pickup')"
            :class="{ selected: method === 'pickup' }"
            @click="changeMethod('pickup')"
          >
            门店自取
          </button>
          <button
            :disabled="locked || !product.methods.includes('delivery')"
            :class="{ selected: method === 'delivery' }"
            @click="changeMethod('delivery')"
          >
            配送到家
          </button>
        </view>
        <text v-if="method === 'delivery'" class="hint">配送区域：{{ store.deliveryArea }}</text>
      </view>
      <view class="panel">
        <text class="section-title">联系信息</text
        ><button v-if="method === 'delivery'" :disabled="locked" @click="chooseAddress">
          选择收货地址</button
        ><text v-if="method === 'delivery'" class="hint">{{ addressMessage }}</text>
        <view class="contact-field">
          <input
            v-model="name"
            :disabled="locked"
            :maxlength="64"
            placeholder="联系人姓名"
            placeholder-class="contact-placeholder"
            class="form-input"
          />
        </view>
        <view class="contact-field">
          <input
            v-model="phone"
            :disabled="locked"
            type="number"
            :maxlength="11"
            placeholder="联系人手机号"
            placeholder-class="contact-placeholder"
            class="form-input"
          />
        </view>
        <textarea
          v-if="method === 'delivery'"
          v-model="address"
          :disabled="locked"
          :maxlength="500"
          placeholder="配送区域内的详细地址"
          class="remark-input"
        />
        <textarea
          v-model="remark"
          :disabled="locked"
          :maxlength="500"
          placeholder="订单备注（选填）"
          class="remark-input"
        />
      </view>
      <view class="panel">
        <text class="section-title">金额明细</text
        ><text v-if="!couponCheckoutEnabled" class="hint">本阶段暂不使用优惠券</text>
        <view v-else>
          <text class="hint">{{
            couponResource.loading.value ? '正在加载可用券…' : couponResource.message.value
          }}</text>
          <button
            v-if="couponResource.message.value && !couponResource.pending.value"
            :disabled="locked"
            @click="loadCoupons"
          >
            重试加载优惠券
          </button>
          <button :disabled="locked" @click="chooseCoupon('')">不使用优惠券</button>
          <button
            v-for="coupon in coupons || []"
            :key="coupon.id"
            :disabled="locked || coupon.status !== 'available'"
            @click="chooseCoupon(coupon.id)"
          >
            {{ selectedCouponId === coupon.id ? '已选 · ' : '' }}{{ coupon.title }}
          </button>
          <text v-if="coupons && !coupons.length" class="hint">暂无可用优惠券</text>
        </view>
        <template v-if="quote">
          <view class="amount-row"
            ><text>商品金额</text><text>¥{{ (quote.productAmount / 100).toFixed(2) }}</text></view
          >
          <view v-if="quote.discountAmount" class="amount-row"
            ><text>优惠金额</text><text>−¥{{ (quote.discountAmount / 100).toFixed(2) }}</text></view
          >
          <view class="amount-row"
            ><text>配送费</text><text>¥{{ (quote.deliveryFee / 100).toFixed(2) }}</text></view
          >
          <view class="amount-row"
            ><text>订单金额（未付款）</text
            ><text class="price">¥{{ (quote.payableAmount / 100).toFixed(2) }}</text></view
          >
        </template>
        <view v-else-if="user.token"
          ><text v-if="quoteFailed" class="hint">金额加载失败，请重试</text
          ><button :disabled="locked" @click="refreshQuote">刷新金额</button></view
        >
        <button v-if="!user.token" @click="login">手机号测试登录</button>
      </view>
      <view class="submit-bar"
        ><text class="hint">不实际付款</text
        ><button
          class="submit-button"
          :loading="submitting"
          :disabled="submitting || (!createdOrderNo && !submission && (!quote || !store.open))"
          @click="submit"
        >
          {{
            createdOrderNo ? '查看已创建订单' : locked ? '重试提交（不付款）' : '确认下单（不付款）'
          }}
        </button></view
      >
    </template>
  </view>
</template>
<style lang="scss" scoped>
@use './checkout.scss';
.remark-input {
  margin-top: 24rpx;
  width: 100%;
  height: 140rpx;
}
.product-row {
  display: flex;
  gap: 24rpx;
  margin: 24rpx 0;
}
.product-name,
.hint {
  display: block;
}
.method-tabs {
  margin-top: 24rpx;
}
</style>
