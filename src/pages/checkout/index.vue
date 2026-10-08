<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { homeContent, mockBouquets, mockFlowers, mockStores } from '../index/mock-data'
import type { PreviewOrder } from './preview-order'
import { readAddresses, type Address } from '../addresses/address-data'
import { useUserStore } from '@/stores/modules/user'
import { readCoupons, couponReason, markCouponUsed, type Coupon } from '../coupons/coupon-data'
import { createOrder } from '@/services/preview-orders'
import { readStock } from '@/services/preview-stock'

// 当前模拟账户，用于读取账户新人券。
const userStore = useUserStore()
// 当前可供选择的卡包数据。
const coupons = ref<Coupon[]>([])
// 当前选择的优惠券标识。
const selectedCouponId = ref('')
// 防止同一确认页连续点击重复创建订单。
const submitted = ref(false)
// 当前选中的券数据。
const selectedCoupon = computed(() =>
  coupons.value.find((coupon) => coupon.id === selectedCouponId.value),
)
// 当前订单适用券数量。
const availableCouponCount = computed(
  () => coupons.value.filter((coupon) => !getCouponReason(coupon)).length,
)

// 当前订单的模拟商品标识。
const productId = ref('')
// 是否为平台定制订单，独立于门店履约。
const isCustom = ref(false)
// 当前订单归属的模拟门店标识。
const storeId = ref('')
// 用户选择的商品数量。
const quantity = ref(1)
// 当前收花方式。
const method = ref<'pickup' | 'delivery'>('pickup')
// 联系人姓名，供前端表单预览。
const contactName = ref('')
// 联系手机号，供前端表单预览。
const phone = ref('')
// 配送详细地址，后续接入地址管理页。
const address = ref('')
// 当前订单选中的本地地址标识。
const selectedAddressId = ref('')
// 用户填写的订单备注。
const remark = ref('')
// 当前是否使用模拟新人现金券。
const useCoupon = computed(() => Boolean(selectedCoupon.value))
// 当前是否展开优惠券选择区域。
const showCoupons = ref(false)
// 当前订单的商品数据。
const product = computed(() =>
  (isCustom.value ? mockBouquets : mockFlowers).find((item) => item.id === productId.value),
)
// 当前订单的门店数据。
const store = computed(() =>
  isCustom.value
    ? {
        name: '平台定制花礼',
        address: '由平台安排制作与配送，无需选择门店',
        hours: '以平台接单安排为准',
        phone: '',
        deliveryArea: homeContent.customDeliveryArea,
        deliveryFee: homeContent.customDeliveryFee,
      }
    : mockStores.find((item) => item.id === storeId.value),
)
// 商品金额，按模拟单价和数量计算。
const productAmount = computed(() => (product.value?.price || 0) * quantity.value)
// 配送费，自取不收配送费。
const deliveryFee = computed(() =>
  method.value === 'delivery' ? store.value?.deliveryFee || 0 : 0,
)
// 模拟现金券只抵扣商品金额，最多抵扣10元。
const discount = computed(() => {
  if (!selectedCoupon.value || getCouponReason(selectedCoupon.value)) return 0
  if (selectedCoupon.value.type === 'cash')
    return Math.min(selectedCoupon.value.amount || 0, productAmount.value)
  return (product.value?.price || 0) * (selectedCoupon.value.exchangeQuantity || 1)
})
// 前端预览的应付金额。
const total = computed(() => productAmount.value - discount.value + deliveryFee.value)

// 接收商品详情页的订单预览参数。
onLoad((options) => {
  isCustom.value = options?.type === 'custom'
  productId.value = options?.id || ''
  storeId.value = options?.storeId || ''
  quantity.value = Math.max(1, Number(options?.quantity) || 1)
  if (
    isCustom.value ||
    (options?.method === 'delivery' && product.value?.methods.includes('delivery'))
  )
    method.value = 'delivery'
  phone.value = userStore.profile?.phone || userStore.profile?.mobile || ''
  fillDefaultAddress()
  coupons.value = readCoupons(userStore.profile?.role === 'user' ? userStore.profile.id : undefined)
  // 卡包去使用时传递的预选券。
  const preferredId = uni.getStorageSync('flower-preferred-coupon')
  // 预选券仍需符合本次订单。
  const preferred = coupons.value.find((coupon) => coupon.id === preferredId)
  if (preferred && !getCouponReason(preferred)) selectedCouponId.value = preferred.id
  uni.removeStorageSync('flower-preferred-coupon')
})
// 返回确认页时刷新券状态，避免使用其他订单已消耗的券。
onShow(() => {
  coupons.value = readCoupons(userStore.profile?.role === 'user' ? userStore.profile.id : undefined)
})
// 返回当前订单中优惠券的不可用原因。
function getCouponReason(coupon: Coupon) {
  return couponReason(
    coupon,
    productId.value,
    product.value?.specification || '',
    quantity.value,
    isCustom.value,
  )
}
// 首次进入时带入默认地址，不覆盖已填写的联系人。
function fillDefaultAddress() {
  // 本地保存的收货地址。
  const addresses = readAddresses(
    userStore.profile?.role === 'user' ? userStore.profile.id : undefined,
  )
  // 优先默认地址，否则使用第一条。
  const defaultAddress = addresses.find((item) => item.isDefault) || addresses[0]
  if (!defaultAddress || selectedAddressId.value || address.value) return
  selectedAddressId.value = defaultAddress.id
  address.value = `${defaultAddress.region} ${defaultAddress.detail}`
  if (method.value === 'delivery') {
    contactName.value = defaultAddress.name
    phone.value = defaultAddress.phone
  }
}
// 打开地址选择页并更新订单收货信息。
function chooseAddress() {
  uni.navigateTo({
    url: `/pages/addresses/index?select=1&selectedId=${selectedAddressId.value}`,
    events: {
      // 将确认选择的收货地址带入订单表单。
      addressSelected: (selected: Address) => {
        selectedAddressId.value = selected.id
        contactName.value = selected.name
        phone.value = selected.phone
        address.value = `${selected.region} ${selected.detail}`
      },
    },
  })
}
// 切换商品支持的收花方式。
function changeMethod(value: 'pickup' | 'delivery') {
  if (isCustom.value) return
  if (product.value?.methods.includes(value)) method.value = value
  if (method.value === 'delivery' && !contactName.value && !phone.value) {
    // 切换配送时补齐已选地址的收货人信息。
    const addresses = readAddresses(
      userStore.profile?.role === 'user' ? userStore.profile.id : undefined,
    )
    // 当前已带入的默认地址。
    const selected = addresses.find((item) => item.id === selectedAddressId.value)
    if (selected) {
      contactName.value = selected.name
      phone.value = selected.phone
    }
  }
}
// 展开或收起前端优惠券选项。
function toggleCoupons() {
  showCoupons.value = !showCoupons.value
}
// 选择模拟现金券或不使用优惠券。
function chooseCoupon(coupon?: Coupon) {
  if (coupon && getCouponReason(coupon)) return
  selectedCouponId.value = coupon?.id || ''
  showCoupons.value = false
}
// 校验预览表单并直接进入模拟支付成功页。
function submitOrder() {
  if (submitted.value) return
  if (userStore.profile?.role !== 'user') {
    // 登录后返回当前商品的确认页，保留购买参数。
    const returnUrl = `/pages/checkout/index?id=${productId.value}&storeId=${
      storeId.value
    }&quantity=${quantity.value}&method=${method.value}${isCustom.value ? '&type=custom' : ''}`
    return uni.navigateTo({
      url: `/pages/test-login/index?returnUrl=${encodeURIComponent(returnUrl)}`,
    })
  }
  if (!contactName.value.trim()) return uni.showToast({ title: '请填写联系人', icon: 'none' })
  if (!/^1\d{10}$/.test(phone.value))
    return uni.showToast({ title: '请填写正确的手机号', icon: 'none' })
  if (method.value === 'delivery' && !address.value.trim())
    return uni.showToast({ title: '请填写配送地址', icon: 'none' })
  if (!product.value || !store.value) return
  if (!Number.isInteger(quantity.value) || quantity.value < 1)
    return uni.showToast({ title: '购买数量不正确', icon: 'none' })
  if (!product.value.methods.includes(method.value))
    return uni.showToast({ title: '商品不支持此收花方式', icon: 'none' })
  if (!isCustom.value) {
    // 提交时再检查营业状态及当前门店商品库存。
    const currentStore = mockStores.find((item) => item.id === storeId.value)
    if (!currentStore?.open) return uni.showToast({ title: '门店休息中，请重新选店', icon: 'none' })
    if ((readStock()[storeId.value]?.[productId.value] || 0) < quantity.value)
      return uni.showToast({ title: '商品库存不足，请重新选择', icon: 'none' })
  }
  // 提交前重新读取卡包，保证前端模拟券状态一致。
  coupons.value = readCoupons(userStore.profile?.role === 'user' ? userStore.profile.id : undefined)
  if (selectedCouponId.value && !selectedCoupon.value) {
    selectedCouponId.value = ''
    return uni.showToast({ title: '优惠券不可用，请重新选择', icon: 'none' })
  }
  if (selectedCoupon.value && getCouponReason(selectedCoupon.value)) {
    selectedCouponId.value = ''
    return uni.showToast({ title: '优惠券已失效，请重新选择', icon: 'none' })
  }
  submitted.value = true
  // 保存订单展示快照，后续商品修改不影响结果页。
  const order: PreviewOrder = {
    type: isCustom.value ? 'custom' : 'ordinary',
    storeId: isCustom.value ? undefined : storeId.value,
    status: 'pending',
    userId: userStore.profile?.id || 'test-user',
    orderNo: `FL${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    productName: product.value.name,
    productId: product.value.id,
    image: product.value.image,
    specification: product.value.specification,
    unit: product.value.unit,
    quantity: quantity.value,
    storeName: store.value.name,
    storeAddress: store.value.address,
    hours: store.value.hours,
    storePhone: store.value.phone,
    method: method.value,
    contactName: contactName.value.trim(),
    phone: phone.value,
    address: address.value.trim(),
    remark: remark.value,
    total: total.value,
    productAmount: productAmount.value,
    deliveryFee: deliveryFee.value,
    discount: discount.value,
    couponType: selectedCoupon.value?.type,
    couponId: selectedCoupon.value?.id,
    couponTitle: selectedCoupon.value?.title,
    stemsPerUnit: Number(product.value.specification.match(/(\d+)\s*支/)?.[1]) || 0,
    giftAmount: selectedCoupon.value?.type === 'exchange' ? discount.value : 0,
    giftQuantity:
      selectedCoupon.value?.type === 'exchange' ? selectedCoupon.value.exchangeQuantity || 1 : 0,
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  createOrder(order)
  if (selectedCoupon.value) markCouponUsed(selectedCoupon.value, userStore.profile?.id)
  uni.redirectTo({ url: '/pages/payment-result/index' })
}
// 返回下单页继续挑选鲜花。
function goShopping() {
  uni.switchTab({ url: '/pages/order/index' })
}
</script>

<template>
  <view v-if="product && store" class="checkout-page">
    <view class="page-intro">
      <text class="eyebrow">一花一份心意</text>
      <text class="page-title">确认这份美好</text>
      <text class="subtitle">核对收花信息，把喜欢的鲜花带回家</text>
    </view>
    <view class="panel">
      <view class="section-heading">
        <text class="section-title">收花方式</text>
        <text v-if="isCustom" class="coupon-value">平台配送 · 仅配送</text>
        <view v-else class="method-tabs">
          <button :class="{ selected: method === 'pickup' }" @click="changeMethod('pickup')">
            自取
          </button>
          <button
            :class="{ selected: method === 'delivery' }"
            :disabled="!product.methods.includes('delivery')"
            @click="changeMethod('delivery')"
          >
            配送
          </button>
        </view>
      </view>
      <view class="store-summary">
        <view class="entry-icon">
          <text :class="['iconfont', method === 'pickup' ? 'icon-shouye1' : 'icon-address']" />
        </view>
        <view class="store-copy">
          <text class="store-name">{{ store.name }}</text>
          <text class="subtitle">{{ store.address }}</text>
          <text class="hint">营业时间 {{ store.hours }}</text>
        </view>
      </view>
      <view v-if="method === 'delivery'" class="delivery-note">
        配送区域：{{ store.deliveryArea }} · 配送费 ¥{{ deliveryFee.toFixed(2) }}
      </view>
      <view class="form-row">
        <text class="field-label">{{ method === 'pickup' ? '联系人' : '收货人' }}</text>
        <input v-model="contactName" placeholder="请填写姓名" maxlength="20" />
      </view>
      <view class="form-row">
        <text class="field-label">联系电话</text>
        <input v-model="phone" type="number" placeholder="请填写手机号" maxlength="11" />
      </view>
      <view v-if="method === 'delivery'" class="address-field">
        <view class="address-heading">
          <text class="field-label">配送地址</text>
          <button class="address-select" @click="chooseAddress">
            {{ address ? '选择其他地址' : '选择收货地址' }}
            <text class="iconfont icon-youjiantou1" />
          </button>
        </view>
        <textarea
          v-model="address"
          placeholder="选择已保存的地址，或填写完整配送地址"
          maxlength="220"
          auto-height
        />
      </view>
      <text class="hint fulfillment-hint">
        {{
          method === 'pickup'
            ? '备货完成后，凭订单取货码到店自取'
            : '请确认地址在配送区域内，并保持电话畅通'
        }}
      </text>
    </view>
    <view class="panel">
      <text class="section-title">你的鲜花</text>
      <view class="product-row">
        <image :src="product.image" mode="aspectFill" />
        <view class="product-copy">
          <text class="product-name">{{ product.name }}</text>
          <text class="hint">{{ product.specification }} / {{ product.unit }}</text>
          <text class="hint">
            {{ isCustom ? '平台配送' : method === 'pickup' ? '门店自取' : '门店配送' }}
          </text>
          <view class="product-price-row">
            <text>¥{{ product.price.toFixed(2) }}</text>
            <text class="hint">× {{ quantity }}</text>
          </view>
        </view>
      </view>
    </view>
    <view class="panel">
      <button class="coupon-entry" @click="toggleCoupons">
        <text class="section-title">优惠券</text>
        <view>
          <text class="coupon-value">
            {{ useCoupon ? `−¥${discount.toFixed(2)}` : `${availableCouponCount} 张可用` }}
          </text>
          <text class="iconfont icon-youjiantou1" />
        </view>
      </button>
      <text class="hint">每笔订单限用一张，优惠券不抵配送费</text>
      <view v-if="showCoupons" class="coupon-options">
        <button
          v-for="coupon in coupons"
          :key="coupon.id"
          class="coupon-option"
          :class="{ selected: selectedCouponId === coupon.id }"
          :disabled="Boolean(getCouponReason(coupon))"
          @click="chooseCoupon(coupon)"
        >
          <view class="coupon-amount">
            {{ coupon.type === 'cash' ? `¥${coupon.amount}` : '兑花' }}
          </view>
          <view class="coupon-copy">
            <text>{{ coupon.title }}</text>
            <text class="hint">{{ coupon.scope }}</text>
            <text v-if="getCouponReason(coupon)" class="hint">{{ getCouponReason(coupon) }}</text>
          </view>
          <text class="selection-dot" :class="{ checked: selectedCouponId === coupon.id }" />
        </button>
        <text v-if="!coupons.length" class="hint">暂无优惠券</text>
        <button class="no-coupon" @click="chooseCoupon()">
          <text>不使用优惠券</text>
          <text class="selection-dot" :class="{ checked: !useCoupon }" />
        </button>
      </view>
    </view>
    <view class="panel">
      <text class="section-title">订单备注</text>
      <textarea
        v-model="remark"
        class="remark-input"
        :placeholder="isCustom ? '有什么想告诉平台的？（选填）' : '有什么想告诉花店的？（选填）'"
        maxlength="100"
      />
      <text class="character-count">{{ remark.length }} / 100</text>
    </view>
    <view class="panel amount-panel">
      <text class="section-title">金额明细</text>
      <view class="amount-row">
        <text>商品金额</text>
        <text>¥{{ productAmount.toFixed(2) }}</text>
      </view>
      <view class="amount-row">
        <text>配送费</text>
        <text>{{ method === 'pickup' ? '自取免配送费' : `¥${deliveryFee.toFixed(2)}` }}</text>
      </view>
      <view class="amount-row">
        <text>优惠券抵扣</text>
        <text :class="{ discount: useCoupon }">−¥{{ discount.toFixed(2) }}</text>
      </view>
      <view class="amount-row total-row">
        <text>应付金额</text>
        <text class="price">¥{{ total.toFixed(2) }}</text>
      </view>
    </view>
    <text class="demo-note">当前为前端预览，商品、优惠券及金额使用模拟数据</text>
    <view class="submit-bar">
      <view>
        <text class="hint">合计</text>
        <text class="price">
          <text class="currency">¥</text>
          {{ total.toFixed(2) }}
        </text>
      </view>
      <button class="submit-button" @click="submitOrder">
        {{ total === 0 ? '确认领取' : '提交订单' }}
      </button>
    </view>
  </view>
  <view v-else class="empty-state">
    <text>请先选择鲜花与门店</text>
    <button @click="goShopping">去选花</button>
  </view>
</template>

<style lang="scss" scoped>
@use './checkout.scss';
</style>
