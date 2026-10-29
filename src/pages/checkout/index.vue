<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import WdPopup from '@wot-ui/ui/components/wd-popup/wd-popup.vue'
import WdCell from '@wot-ui/ui/components/wd-cell/wd-cell.vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { getStore, getProduct } from '@/pages/stores/shop-data'
import type { ShopProduct } from '@/types/shop'
import type { OrderQuote, OrderSelection, OrderSubmission } from '@/types/order-api'
import { quoteCheckout, submitCheckout } from '@/pages/checkout/checkout-actions'
import { getUserCouponsApi } from '@/api/coupon'
import type { CouponItem } from '@/types/coupon'
import { takeCoupon } from '@/pages/coupons/selection'
import { couponAmount } from './coupon-amount'
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
const coupons = ref<CouponItem[]>([])
const couponsLoading = ref(false)
const couponsMessage = ref('')
const showCoupons = ref(false)
const selectedCoupon = computed(() =>
  coupons.value.find((item) => String(item.id) === selectedCouponId.value),
)
const amounts = computed(() =>
  quote.value
    ? couponAmount(quote.value, selectedCoupon.value, spec.value?.price)
    : { discountAmount: 0, payableAmount: 0 },
)
let couponVersion = 0
let entryCouponId = takeCoupon(user.profile?.id)
function canUseCoupon(coupon: CouponItem) {
  return (
    coupon.status === 'AVAILABLE' &&
    new Date(coupon.expiresAt).getTime() > Date.now() &&
    (coupon.type === 'CASH' ||
      (coupon.exchangeSpecId === Number(specId.value) &&
        quantity.value >= (coupon.exchangeQuantity || 1)))
  )
}
async function loadCoupons() {
  if (locked.value) return
  const version = ++couponVersion
  const userId = user.profile?.id
  coupons.value = []
  couponsMessage.value = ''
  if (!user.token || !userId) return
  couponsLoading.value = true
  try {
    const res = await getUserCouponsApi(userId)
    if (version !== couponVersion) return
    coupons.value = res.data.filter(canUseCoupon)
    if (entryCouponId) {
      selectedCouponId.value = String(entryCouponId)
      entryCouponId = undefined
    }
    if (selectedCouponId.value && !selectedCoupon.value) {
      selectedCouponId.value = ''
      uni.showToast({ title: '该优惠券当前订单不可用', icon: 'none' })
    }
  } catch {
    if (version === couponVersion) couponsMessage.value = '优惠券加载失败，请重试'
  } finally {
    if (version === couponVersion) couponsLoading.value = false
  }
}
function openCoupons() {
  if (locked.value) return
  if (!user.token) return login()
  showCoupons.value = true
  void loadCoupons()
}
function chooseCoupon(id: string) {
  if (locked.value) return
  const coupon = coupons.value.find((item) => String(item.id) === id)
  if (id && (!coupon || !canUseCoupon(coupon))) return
  selectedCouponId.value = id
  showCoupons.value = false
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
  uni.navigateTo({ url: '/pages/login/index?returnUrl=' + encodeURIComponent(back) })
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
      addressMessage.value = isIntegrationPending(error) ? '' : '地址加载失败，可手动填写或重试选择'
  }
}
function resetAccount() {
  couponVersion++
  coupons.value = []
  couponsLoading.value = false
  couponsMessage.value = ''
  entryCouponId = undefined
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
  couponVersion++
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
    const { data } = await quoteCheckout(selection())
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
  if (selectedCouponId.value) {
    if (!selectedCoupon.value || !canUseCoupon(selectedCoupon.value)) {
      await loadCoupons()
      return
    }
    console.info('[待对接] 含券订单报价与提交', { couponId: Number(selectedCouponId.value) })
    return
  }
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
        <text class="method-heading">收花方式</text>
        <view class="method-tabs">
          <button
            :disabled="locked || !product.methods.includes('pickup')"
            :class="{ selected: method === 'pickup' }"
            :aria-pressed="method === 'pickup'"
            @click="changeMethod('pickup')"
          >
            <view class="method-top"
              ><text class="iconfont icon-shouye1" /><text class="method-check">{{
                method === 'pickup' ? '✓' : ''
              }}</text></view
            >
            <text class="method-title">门店自取</text>
            <text class="method-description">{{
              product.methods.includes('pickup') ? '到店领取鲜花' : '暂不支持自取'
            }}</text>
          </button>
          <button
            :disabled="locked || !product.methods.includes('delivery')"
            :class="{ selected: method === 'delivery' }"
            :aria-pressed="method === 'delivery'"
            @click="changeMethod('delivery')"
          >
            <view class="method-top"
              ><text class="iconfont icon-address" /><text class="method-check">{{
                method === 'delivery' ? '✓' : ''
              }}</text></view
            >
            <text class="method-title">配送到家</text>
            <text class="method-description">{{
              product.methods.includes('delivery') ? '鲜花送到你身边' : '暂不支持配送'
            }}</text>
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
        <text class="section-title">金额明细</text>
        <wd-cell
          title="优惠券"
          :value="selectedCoupon?.name || '选择优惠券'"
          clickable
          @click="openCoupons"
        >
          <template #suffix><text class="iconfont icon-youjiantou1 coupon-arrow" /></template>
        </wd-cell>
        <template v-if="quote">
          <view class="amount-row"
            ><text>商品金额</text><text>¥{{ (quote.productAmount / 100).toFixed(2) }}</text></view
          >
          <view v-if="amounts.discountAmount" class="amount-row"
            ><text>优惠金额</text
            ><text>−¥{{ (amounts.discountAmount / 100).toFixed(2) }}</text></view
          >
          <view class="amount-row"
            ><text>配送费</text><text>¥{{ (quote.deliveryFee / 100).toFixed(2) }}</text></view
          >
          <view class="amount-row"
            ><text>合计</text
            ><text class="price">¥{{ (amounts.payableAmount / 100).toFixed(2) }}</text></view
          >
        </template>
        <view v-else-if="user.token"
          ><text v-if="quoteFailed" class="hint">金额加载失败，请重试</text
          ><button :disabled="locked" @click="refreshQuote">刷新金额</button></view
        >
        <button v-if="!user.token" @click="login">登录</button>
      </view>
      <view class="submit-bar">
        <view class="submit-total" v-if="quote"
          ><text class="hint">合计</text
          ><text class="price">¥{{ (amounts.payableAmount / 100).toFixed(2) }}</text
          ><text v-if="amounts.discountAmount" class="hint"
            >已优惠 ¥{{ (amounts.discountAmount / 100).toFixed(2) }}</text
          ></view
        >
        <button
          class="submit-button"
          :loading="submitting"
          :disabled="submitting || (!createdOrderNo && !submission && (!quote || !store.open))"
          @click="submit"
        >
          {{ createdOrderNo ? '查看已创建订单' : locked ? '重试提交' : '确认下单' }}
        </button></view
      >
    </template>
    <wd-popup
      v-model="showCoupons"
      position="bottom"
      closable
      safe-area-inset-bottom
      :z-index="100"
      custom-style="border-radius: 24px 24px 0 0; background: #f6f7f5;"
    >
      <view class="coupon-sheet">
        <view class="coupon-sheet-header"
          ><text class="coupon-sheet-title">选择优惠券</text
          ><text class="coupon-sheet-subtitle">每笔订单可使用一张优惠券</text></view
        >
        <scroll-view scroll-y class="coupon-sheet-scroll">
          <view class="coupon-sheet-list">
            <wd-cell
              title="不使用优惠券"
              :value="!selectedCouponId ? '✓' : ''"
              clickable
              custom-style="border-radius: 12px; overflow: hidden;"
              @click="chooseCoupon('')"
            />
            <view v-if="couponsLoading || couponsMessage" class="coupon-sheet-feedback">{{
              couponsLoading ? '正在加载优惠券…' : couponsMessage
            }}</view>
            <wd-cell
              v-if="couponsMessage"
              title="重新加载"
              clickable
              @click="loadCoupons"
            >
              <template #suffix><text class="iconfont icon-youjiantou1 coupon-arrow" /></template>
            </wd-cell>
            <view
              v-for="coupon in coupons"
              :key="coupon.id"
              class="coupon-sheet-item"
              :class="{ 'is-selected': selectedCouponId === String(coupon.id) }"
              @click="!couponsLoading && chooseCoupon(String(coupon.id))"
            >
              <view class="coupon-sheet-main">
                <view class="coupon-sheet-price"
                  ><text class="coupon-sheet-amount">{{
                    coupon.type === 'CASH' ? '¥' + coupon.cashAmount : '兑花'
                  }}</text
                  ><text class="coupon-sheet-kind">{{
                    coupon.type === 'CASH' ? '现金抵扣券' : '商品兑换券'
                  }}</text></view
                >
                <view class="coupon-sheet-copy"
                  ><text class="coupon-sheet-name">{{ coupon.name }}</text
                  ><text class="coupon-sheet-description">{{
                    coupon.type === 'CASH'
                      ? '全部商品可用'
                      : [coupon.exchangeProductName, coupon.exchangeSpecName]
                          .filter(Boolean)
                          .join(' · ')
                  }}</text
                  ><text class="coupon-sheet-expiry"
                    >{{ coupon.expiresAt.slice(0, 10).replace(/-/g, '.') }} 到期</text
                  ></view
                >
                <text class="coupon-sheet-check">{{
                  selectedCouponId === String(coupon.id) ? '✓' : ''
                }}</text>
              </view>
            </view>
            <view
              v-if="!couponsLoading && !couponsMessage && !coupons.length"
              class="coupon-sheet-feedback"
              >暂无可用优惠券</view
            >
          </view>
        </scroll-view>
      </view>
    </wd-popup>
  </view>
</template>
<style lang="scss" scoped>
@use './checkout.scss';
.coupon-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  flex-shrink: 0;
  margin-left: 12rpx;
  font-size: 20rpx;
  line-height: 1;
  color: #849087;
}
.coupon-sheet {
  color: #283c34;
}
.coupon-sheet-header {
  padding: 48rpx 72rpx 32rpx;
  text-align: center;
}
.coupon-sheet-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
}
.coupon-sheet-subtitle {
  display: block;
  margin-top: 12rpx;
  color: #849087;
  font-size: 23rpx;
}
.coupon-sheet-scroll {
  height: 58vh;
  flex: none;
}
.coupon-sheet-list {
  padding: 0 28rpx 40rpx;
}
.coupon-sheet-item {
  margin-top: 22rpx;
  border: 2rpx solid #e4e9e2;
  border-radius: 22rpx;
  background: #fff;
}
.coupon-sheet-item.is-selected {
  border-color: $qs-brandColor;
  background: $qs-brandColor-light;
}
.coupon-sheet-main {
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 30rpx 22rpx;
}
.coupon-sheet-price {
  flex: none;
  width: 140rpx;
  text-align: center;
  color: $qs-brandColor;
}
.coupon-sheet-amount {
  display: block;
  font-size: 44rpx;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.coupon-sheet-kind {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
}
.coupon-sheet-copy {
  flex: 1;
  min-width: 0;
  padding-left: 22rpx;
  border-left: 1rpx dashed #dce3d8;
}
.coupon-sheet-name {
  display: block;
  font-size: 27rpx;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.coupon-sheet-description,
.coupon-sheet-expiry {
  display: block;
  margin-top: 12rpx;
  font-size: 21rpx;
  line-height: 1.6;
  color: #849087;
}
.coupon-sheet-check {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34rpx;
  height: 34rpx;
  border: 2rpx solid #dce3d8;
  border-radius: 50%;
  font-size: 24rpx;
}
.is-selected .coupon-sheet-check {
  background: $qs-brandColor;
  color: $qs-font-inverse;
  border-color: $qs-brandColor;
}
.coupon-sheet-feedback {
  padding: 60rpx 20rpx;
  text-align: center;
  color: #849087;
  font-size: 25rpx;
}
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
</style>
