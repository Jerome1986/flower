<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { getBouquetApi as getBouquet, quoteCustomApi as quoteCustom } from '@/api/bouquets'
import { submitCustom, customCheckoutEnabled } from '@/pages/custom-checkout/bouquet-checkout'
import { getAddresses } from '@/pages/addresses/address-actions'
import { integrationMessage } from '@/utils/integration'
import { useResource } from '@/composables/use-resource'
import { positiveQuantity, makeRequestKey } from '@/utils/order-input'
import type { Address } from '@/types/address'
import type { CustomQuote, CustomSubmission } from '@/types/integration'
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
const quoteLoading = ref(false)
const quoteMessage = ref('')
const addressMessage = ref('')
const submitting = ref(false)
const submission = ref<CustomSubmission>()
const createdOrderNo = ref('')
const locked = computed(() => submitting.value || Boolean(submission.value))
let loadVersion = 0
let quoteVersion = 0
let requestKey = makeRequestKey()
function reset() {
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
watch(() => user.token, reset, { flush: 'sync' })
onUnload(() => {
  loadVersion++
  quoteVersion++
})
onLoad((options) => {
  bouquetId.value = options?.id || ''
  specId.value = options?.specId || ''
  quantity.value = Number(options?.quantity)
  invalidRoute.value = !bouquetId.value || !specId.value || !positiveQuantity(quantity.value)
})
function goBouquets() {
  uni.redirectTo({ url: '/pages/bouquets/index' })
}
function login() {
  const back =
    '/pages/custom-checkout/index?id=' +
    encodeURIComponent(bouquetId.value) +
    '&specId=' +
    encodeURIComponent(specId.value) +
    '&quantity=' +
    quantity.value
  uni.navigateTo({ url: '/pages/test-login/index?returnUrl=' + encodeURIComponent(back) })
}
function selection() {
  return {
    bouquetId: bouquetId.value,
    specId: specId.value,
    quantity: quantity.value,
    address: address.value.trim(),
  }
}
function applyAddress(item: Address) {
  if (locked.value) return
  name.value = item.name
  phone.value = item.phone
  address.value = [item.region, item.detail].filter(Boolean).join(' ')
}
function chooseAddress() {
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
async function loadDefaultAddress() {
  const token = user.token
  if (!token || locked.value) return
  try {
    const list = await getAddresses()
    const item = list.find((item) => item.isDefault)
    if (token === user.token && item && !name.value.trim() && !address.value.trim())
      applyAddress(item)
  } catch (error) {
    if (token === user.token)
      addressMessage.value = integrationMessage(error, '地址加载失败，可手动填写')
  }
}
async function load() {
  const version = ++loadVersion
  if (!customCheckoutEnabled || invalidRoute.value) return
  ++quoteVersion
  quote.value = undefined
  await resource.load()
  if (version !== loadVersion) return
  if (!phone.value) phone.value = user.profile?.phone || ''
  if (bouquet.value && !spec.value) {
    resource.message.value = '规格不可用，请重新选择'
    return
  }
  await loadDefaultAddress()
  if (version === loadVersion && address.value.trim()) await refreshQuote()
}
onShow(load)
// 地址变化立即使旧报价失效，用户确认地址后主动报价，避免每个按键发请求。
watch(
  address,
  () => {
    quoteVersion++
    quote.value = undefined
    quoteMessage.value = ''
    quoteLoading.value = false
  },
  { flush: 'sync' },
)
async function refreshQuote() {
  const version = ++quoteVersion
  const token = user.token
  quote.value = undefined
  quoteMessage.value = ''
  if (!customCheckoutEnabled || invalidRoute.value || locked.value || !spec.value) return
  if (!token) return login()
  if (!address.value.trim()) {
    quoteMessage.value = '请先填写配送地址'
    return
  }
  if (quantity.value > spec.value.available) {
    quoteMessage.value = '当前规格库存不足'
    return
  }
  quoteLoading.value = true
  try {
    const result = await quoteCustom(selection())
    if (version === quoteVersion && token === user.token) quote.value = result
  } catch (error) {
    if (version === quoteVersion && token === user.token)
      quoteMessage.value = integrationMessage(error, '报价失败，请重试')
  } finally {
    if (version === quoteVersion) quoteLoading.value = false
  }
}
async function submit() {
  if (!customCheckoutEnabled || invalidRoute.value || submitting.value) return
  if (createdOrderNo.value)
    return uni.redirectTo({ url: '/pages/payment-result/index?orderNo=' + createdOrderNo.value })
  if (!user.token) return login()
  if (!submission.value && (!quote.value || !spec.value || quantity.value > spec.value.available))
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
    uni.redirectTo({ url: '/pages/payment-result/index?orderNo=' + order.orderNo })
  } catch (error: any) {
    if (token !== user.token) return
    quoteMessage.value = integrationMessage(error, '提交失败，请重试')
    if (error?.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 401) {
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
      ><text class="section-title">确认花束订单</text
      ><text class="hint">平台安排配送 · 测试下单不实际付款</text></view
    >
    <view v-if="!customCheckoutEnabled || invalidRoute" class="panel"
      ><text>{{ !customCheckoutEnabled ? '花束下单暂未开放' : '订单参数不完整，请重新选购' }}</text
      ><button @click="goBouquets">返回花束专区</button></view
    >
    <view v-else-if="loading || message" class="panel"
      ><text>{{ loading ? '正在加载花束…' : message }}</text
      ><button v-if="!loading && !pending" @click="load">重试</button></view
    >
    <template v-else-if="bouquet && spec">
      <view class="panel"
        ><text class="section-title">{{ bouquet.name }}</text
        ><text class="hint">{{ spec.name }} / {{ spec.unit }} × {{ quantity }}</text
        ><text class="hint">配送区域：{{ bouquet.deliveryArea }}</text></view
      >
      <view class="panel">
        <text class="section-title">联系信息</text
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
        <textarea
          v-model="remark"
          :disabled="locked"
          :maxlength="500"
          class="remark-input"
          placeholder="订单备注（选填）"
        />
      </view>
      <view class="panel">
        <text class="section-title">订单金额（未付款）</text
        ><text class="hint">本阶段暂不支持优惠券</text>
        <template v-if="quote"
          ><view class="amount-row"
            ><text>商品金额</text><text>¥{{ (quote.productAmount / 100).toFixed(2) }}</text></view
          ><view class="amount-row"
            ><text>配送费</text><text>¥{{ (quote.deliveryFee / 100).toFixed(2) }}</text></view
          ><view class="amount-row"
            ><text>合计</text><text>¥{{ (quote.payableAmount / 100).toFixed(2) }}</text></view
          ></template
        >
        <text v-if="quoteMessage" class="hint">{{ quoteMessage }}</text>
        <button v-if="!user.token" @click="login">手机号测试登录</button
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
        ><text class="hint">不实际付款</text
        ><button
          class="submit-button"
          :disabled="submitting || (!quote && !submission && !createdOrderNo)"
          :loading="submitting"
          @click="submit"
        >
          {{
            createdOrderNo ? '查看订单' : submission ? '重试提交（不付款）' : '确认下单（不付款）'
          }}
        </button></view
      >
    </template>
  </view>
</template>
<style lang="scss" scoped>
@use '../checkout/checkout.scss';
.hint {
  display: block;
  margin-top: 16rpx;
}
.remark-input {
  margin-top: 24rpx;
  width: 100%;
  height: 140rpx;
}
</style>
