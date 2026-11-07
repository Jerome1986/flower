<script setup lang="ts">
import { getAddresses } from '@/pages/addresses/address-actions'
import { quoteCheckout } from '@/pages/checkout/checkout-actions'
import { takeCoupon } from '@/pages/coupons/selection'
import { getProduct, getStore } from '@/pages/stores/shop-data'
import { useCartStore } from '@/stores/modules/cart'
import { useUserStore } from '@/stores/modules/user'
import type { Address } from '@/types/address'
import type { OrderQuote, OrderSelection } from '@/types/order-api'
import type { ShopProduct } from '@/types/shop'
import type { FlowerStore } from '@/types/store'
import { isIntegrationPending } from '@/utils/integration'
import { positiveId, positiveQuantity } from '@/utils/order-input'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
// 当前登录用户及账户信息。
const user = useUserStore()
const cart = useCartStore()
const added = ref(false)
// 当前结算商品编号。
const productId = ref('')
// 当前履约门店编号。
const storeId = ref('')
// 当前选中的商品规格编号。
const specId = ref('')
// 本次购买数量。
const quantity = ref(1)
// 收花方式：门店自取或配送到家。
const method = ref<'pickup' | 'delivery'>('pickup')
// 当前商品详情及可售规格。
const product = ref<ShopProduct>()
// 当前门店信息及营业状态。
const store = ref<FlowerStore>()
// 根据规格编号匹配当前购买规格。
const spec = computed(() => product.value?.specs.find((item) => item.id === specId.value))
// 收花联系人姓名。
const name = ref('')
// 收花联系人手机号。
const phone = ref('')
// 配送地址完整文本。
const address = ref('')
// 用户填写的订单备注。
const remark = ref('')
// 服务端返回的订单报价。
const quote = ref<OrderQuote>()
// 商品和门店信息是否正在加载。
const loading = ref(false)
// 购物车是否正在保存，防止重复操作。
const submitting = ref(false)
// 商品或门店信息是否加载失败。
const failed = ref(false)
// 页面传入的结算参数是否无效。
const invalidRoute = ref(false)
// 订单报价是否获取失败。
const quoteFailed = ref(false)
// 地址加载失败时的提示文案。
const addressMessage = ref('')
// 当前选中的收花地址编号。
const selectedAddressId = ref('')
const amounts = computed(() => ({
  discountAmount: 0,
  payableAmount: quote.value?.payableAmount || 0,
}))
let entryCouponId = takeCoupon(user.profile?.id)
// 保存后锁定表单，跳转失败时只重试跳转，不重复添加。
const locked = computed(() => submitting.value || added.value)
// 报价请求序号，用于忽略过期响应。
let quoteVersion = 0
// 页面加载序号，用于忽略过期响应。
let loadVersion = 0
// 地址请求序号，防止旧地址覆盖当前选择。
let addressVersion = 0
// 返回鲜花选购页面。
const goShopping = () => {
  uni.switchTab({ url: '/pages/order/index' })
}
// 组装当前商品、门店和收花方式的报价参数。
const selection = (): OrderSelection => {
  return {
    storeId: Number(storeId.value),
    productId: Number(productId.value),
    specId: Number(specId.value),
    quantity: quantity.value,
    method: method.value,
  }
}
// 跳转登录页并保留结算页面的返回地址。
const login = () => {
  // 登录完成后返回的结算地址，保留当前选购参数。
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
// 将选中的地址填入联系人和配送信息。
const applyAddress = (item: Address) => {
  if (locked.value) return
  addressVersion++
  addressMessage.value = ''
  selectedAddressId.value = item.id
  name.value = item.name
  phone.value = item.phone
  address.value = [item.region, item.detail].filter(Boolean).join(' ')
}
// 打开地址选择页并接收当前账户的选择结果。
const chooseAddress = () => {
  if (locked.value) return
  if (!user.token) return login()
  // 记录当前登录凭证，避免响应写入其他账户。
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
// 配送到家时加载默认地址，避免覆盖手动填写的信息。
const loadDefaultAddress = async () => {
  // 本次请求序号，用于校验响应是否仍然有效。
  const version = ++addressVersion
  if (!user.token || method.value !== 'delivery' || locked.value) return
  // 记录当前登录凭证，避免响应写入其他账户。
  const token = user.token
  try {
    // 当前用户的收花地址列表。
    const list = await getAddresses()
    if (
      version !== addressVersion ||
      token !== user.token ||
      method.value !== 'delivery' ||
      locked.value
    )
      return
    addressMessage.value = ''
    // 地址列表中标记为默认的地址。
    const item = list.find((item) => item.isDefault)
    if (item && !name.value.trim() && !address.value.trim()) applyAddress(item)
  } catch (error) {
    if (version === addressVersion && token === user.token && method.value === 'delivery')
      addressMessage.value = isIntegrationPending(error) ? '' : '地址加载失败，可手动填写或重试选择'
  }
}
// 切换账户时清空个人结算数据并使旧请求失效。
const resetAccount = () => {
  addressVersion++
  entryCouponId = undefined
  loadVersion++
  quoteVersion++
  added.value = false
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
// 获取当前选购参数和优惠券对应的服务端报价。
const refreshQuote = async () => {
  // 本次请求序号，用于校验响应是否仍然有效。
  const version = ++quoteVersion
  // 记录当前登录凭证，避免响应写入其他账户。
  const token = user.token
  quote.value = undefined
  quoteFailed.value = false
  if (!token || !spec.value || invalidRoute.value || locked.value) return
  try {
    // 服务端返回的最新报价数据。
    const { data } = await quoteCheckout(selection())
    if (version === quoteVersion && token === user.token) quote.value = data
  } catch {
    if (version === quoteVersion && token === user.token) quoteFailed.value = true
  }
}
// 加载并校验门店、商品，再刷新优惠券、报价和默认地址。
const load = async () => {
  // 本次请求序号，用于校验响应是否仍然有效。
  const version = ++loadVersion
  ++quoteVersion
  if (invalidRoute.value) return
  loading.value = true
  failed.value = false
  quote.value = undefined
  try {
    // 并行获取门店详情和商品详情。
    const [s, p] = await Promise.all([
      getStore(storeId.value),
      getProduct(storeId.value, productId.value),
    ])
    if (version !== loadVersion) return
    store.value = s
    product.value = p
    if (!spec.value || !p.methods.includes(method.value)) throw new Error('规格或配送方式不可用')
    if (!s.open || quantity.value > spec.value.available) throw new Error('门店已关闭或库存不足')
    if (!phone.value) phone.value = user.profile?.phone || ''
    if (version !== loadVersion) return
    await refreshQuote()
    if (version === loadVersion) await loadDefaultAddress()
  } catch {
    if (version === loadVersion) failed.value = true
  } finally {
    if (version === loadVersion) loading.value = false
  }
}
// 在允许编辑时切换商品支持的收花方式。
const changeMethod = (value: 'pickup' | 'delivery') => {
  if (!locked.value && product.value?.methods.includes(value)) method.value = value
}
// 提示结算校验失败原因，并返回未通过结果。
const rejectCheckout = (title: string): false => {
  uni.showToast({ title, icon: 'none' })
  return false
}
// 校验登录、商品、联系人、地址及用券条件，未通过时阻止提交。
const validateCheckout = (): boolean => {
  if (submitting.value) return false
  if (!user.token) {
    login()
    return false
  }
  if (invalidRoute.value || failed.value || loading.value || !quote.value || !spec.value)
    return false
  if (
    !store.value?.open ||
    quantity.value > spec.value.available ||
    !product.value?.methods.includes(method.value)
  )
    return false
  if (!name.value.trim()) return rejectCheckout('请填写联系人')
  if (!/^1\d{10}$/.test(phone.value)) return rejectCheckout('请填写正确的手机号')
  if (method.value === 'delivery' && !address.value.trim()) return rejectCheckout('请填写配送地址')
  return true
}
// 保存选购信息，不创建订单或核销优惠券。
const submit = async () => {
  if (submitting.value) return
  if (added.value) return openCart()
  if (!validateCheckout()) return
  submitting.value = true
  try {
    const input = {
      storeId: storeId.value,
      productId: productId.value,
      specId: specId.value,
      storeName: store.value!.name,
      productName: product.value!.name,
      image: product.value!.image,
      specName: spec.value!.name,
      unit: spec.value!.unit,
      unitPrice: Math.round(spec.value!.price * 100),
      quantity: quantity.value,
      method: method.value,
      contactName: name.value.trim(),
      contactPhone: phone.value,
      address: method.value === 'delivery' ? address.value.trim() : '',
      remark: remark.value.trim(),
      couponId: entryCouponId ? String(entryCouponId) : '',
    }
    const token = user.token
    const owner = cart.owner
    let replace = false
    if (cart.conflicts(input)) {
      replace = await new Promise<boolean>((resolve) =>
        uni.showModal({
          title: '购物车信息不同',
          content: '购物车只能使用同一门店、配送方式和收花信息。清空原购物车并加入新商品？',
          confirmText: '清空并加入',
          success: (result) => resolve(result.confirm),
          fail: () => resolve(false),
        }),
      )
      if (!replace) return
    }
    if (token !== user.token || owner !== cart.owner) return
    cart.add(input, spec.value!.available, replace)
    added.value = true
    openCart()
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : '购物车保存失败，请重试',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}
const openCart = () => {
  uni.switchTab({
    url: '/pages/cart/index',
    fail: () => uni.showToast({ title: '已加入购物车，点击按钮重新进入', icon: 'none' }),
  })
}
// 登录身份变化时立即重置结算状态。
watch(() => user.token, resetAccount, { flush: 'sync' })
// 页面卸载时使所有未完成请求失效。
onUnload(() => {
  addressVersion++
  loadVersion++
  quoteVersion++
})
// 读取页面选购参数并校验其合法性。
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
    quantity.value > 999 ||
    !['pickup', 'delivery'].includes(options?.method || '')
})
// 每次进入页面时刷新结算数据。
onShow(load)
// 收花方式变化时同步刷新报价、优惠券和默认地址。
watch(
  method,
  () => {
    void refreshQuote()
    void loadDefaultAddress()
  },
  { flush: 'sync' },
)
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
        <view class="cart-submit-action"
          ><button
            class="submit-button"
            :loading="submitting"
            :disabled="submitting || (!added && (!quote || !store.open))"
            @click="submit"
          >
            {{ added ? '查看购物车' : '加入购物车' }}
          </button>
          <text class="hint">优惠券将在确认订单时选择</text></view
        ></view
      >
    </template>
  </view>
</template>
<style lang="scss" scoped>
@use './checkout.scss' as page;
.cart-submit-action {
  flex: none;
  text-align: center;
  .hint {
    margin-top: 10rpx;
    font-size: 22rpx;
  }
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
