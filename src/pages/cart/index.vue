<script setup lang="ts">
import { getAddresses } from '@/pages/addresses/address-actions'
import { getProduct, getStore } from '@/pages/stores/shop-data'
import { useCartStore } from '@/stores/modules/cart'
import { useUserStore } from '@/stores/modules/user'
import type { Address } from '@/types/address'
import type { CartItem } from '@/types/cart'
import { getRequestFailure } from '@/utils/request-error'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
import WdCheckbox from '@wot-ui/ui/components/wd-checkbox/wd-checkbox.vue'
// 获取商品不可结算的原因。
const reason = (item: CartItem) => {
  if (loading.value) return '正在核验商品…'
  // 当前商品的核验结果。
  const state = availability.value[item.id]
  if (!state) return '商品信息待刷新'
  return state.reason || (item.quantity > state.limit ? '数量超过当前库存，请减少数量' : '')
}
// 购物车状态与操作。
const cart = useCartStore()
// 当前用户登录状态。
const user = useUserStore()
// 是否正在核验商品信息。
const loading = ref(false)
// 页面操作反馈提示。
const feedback = ref('')
// 地址加载状态及空列表提示。
const addressLoading = ref(false)
const addressEmpty = ref(false)
const addressError = ref(false)
let addressVersion = 0
let selectedAddressId = ''
// 各购物车商品的库存上限、不可用原因和重试标记。
const availability = ref<
  Record<
    string,
    {
      limit: number
      reason: string
      retry?: boolean
    }
  >
>({})
// 刷新版本号，用于忽略过期请求结果。
let version = 0
// 当前可参与结算的商品。
const eligible = computed(() => cart.items.filter((item) => !reason(item)))
// 已选中的可结算商品。
const selected = computed(() => eligible.value.filter((item) => item.selected))
// 是否已选中所有可结算商品。
const allSelected = computed(
  () => eligible.value.length > 0 && eligible.value.every((item) => item.selected),
)
// 已选商品总金额，单位为分。
const total = computed(() =>
  selected.value.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
)
// 已选商品总件数。
const count = computed(() => selected.value.reduce((sum, item) => sum + item.quantity, 0))
// 将用户地址转换为购物车收花信息。
const addressContact = (item: Address) => {
  return {
    contactName: item.name,
    contactPhone: item.phone,
    address: [item.region, item.detail].filter(Boolean).join(' '),
  }
}
// 保留仍有效的已选地址，否则自动使用列表中的第一个地址。
const refreshAddress = async () => {
  const current = ++addressVersion
  const owner = cart.owner
  const token = user.token
  addressEmpty.value = false
  addressError.value = false
  addressLoading.value = false
  if (!owner || !cart.items.length) return
  addressLoading.value = true
  try {
    const addresses = await getAddresses()
    if (current !== addressVersion || owner !== cart.owner || token !== user.token) return
    addressEmpty.value = !addresses.length
    if (cart.confirmation?.submission && !cart.confirmation.orderNo) return
    const previous = cart.fulfillment
    const chosen =
      addresses.find((item) => item.id === selectedAddressId) ||
      addresses.find((item) => {
        const contact = addressContact(item)
        return (
          previous?.contactName === contact.contactName &&
          previous?.contactPhone === contact.contactPhone &&
          previous?.address === contact.address
        )
      }) ||
      addresses[0]
    const contact = chosen
      ? addressContact(chosen)
      : { contactName: '', contactPhone: '', address: '' }
    if (
      cart.items.some(
        (item) =>
          item.contactName !== contact.contactName ||
          item.contactPhone !== contact.contactPhone ||
          item.address !== contact.address,
      )
    ) {
      if (!save(() => cart.updateContact(contact))) return
    }
    selectedAddressId = chosen?.id || ''
  } catch {
    if (current === addressVersion && owner === cart.owner && token === user.token)
      addressError.value = true
  } finally {
    if (current === addressVersion) addressLoading.value = false
  }
}
// 将分转换为保留两位小数的元金额。
const money = (value: number) => {
  return (value / 100).toFixed(2)
}
// 执行购物车变更并提示保存失败。
const save = (action: () => void) => {
  try {
    action()
    return true
  } catch {
    uni.showToast({ title: '购物车保存失败，请重试', icon: 'none' })
    return false
  }
}
// 刷新商品信息并核验库存与收花方式。
const refresh = async () => {
  // 本次刷新的版本号。
  const current = ++version
  // 刷新开始时的登录凭证。
  const token = user.token
  // 刷新开始时的购物车归属。
  const owner = cart.owner
  availability.value = {}
  feedback.value = ''
  loading.value = true
  // 本次待核验的购物车商品快照。
  const rows = [...cart.items]
  // 相同门店、商品只请求一次，避免多个收花地址重复请求。
  // 按门店缓存查询请求。
  const stores = new Map<string, ReturnType<typeof getStore>>()
  // 按门店和商品缓存查询请求。
  const products = new Map<string, ReturnType<typeof getProduct>>()
  await Promise.all(
    rows.map(async (item) => {
      try {
        if (!stores.has(item.storeId)) stores.set(item.storeId, getStore(item.storeId))
        // 商品请求的唯一缓存键。
        const key = item.storeId + ':' + item.productId
        if (!products.has(key)) products.set(key, getProduct(item.storeId, item.productId))
        // 最新的门店与商品信息。
        const [store, product] = await Promise.all([stores.get(item.storeId)!, products.get(key)!])
        if (current !== version || token !== user.token || owner !== cart.owner) return
        if (!cart.items.some((row) => row.id === item.id)) return
        // 购物车商品对应的最新规格。
        const spec = product.specs.find((row) => row.id === item.specId)
        // 限制在 0 至 999 之间的可购数量。
        const limit = Math.max(0, Math.min(999, Math.floor(spec?.available || 0)))
        // 门店、规格或收花方式不可用的提示。
        const message = !store.open
          ? '门店暂未营业'
          : !spec
          ? '该规格已失效'
          : !product.methods.includes(item.method)
          ? '当前收花方式不可用'
          : !limit
          ? '商品已售罄'
          : ''
        availability.value[item.id] = { limit, reason: message }
        if (
          !save(() =>
            cart.update(item.id, {
              ...(spec
                ? { unitPrice: Math.round(spec.price * 100), specName: spec.name, unit: spec.unit }
                : {}),
              storeName: store.name,
              productName: product.name,
              image: product.image,
              ...(message || item.quantity > limit ? { selected: false } : {}),
            }),
          )
        )
          feedback.value = '最新商品信息保存失败，请重新进入购物车'
      } catch (error: unknown) {
        const requestFailure = getRequestFailure(error)
        if (current !== version || token !== user.token || owner !== cart.owner) return
        // 商品或门店是否已失效。
        const missing = requestFailure.statusCode === 404 || requestFailure.statusCode === 410
        availability.value[item.id] = {
          limit: 0,
          reason: missing ? '商品或门店已失效' : '商品信息刷新失败',
          retry: !missing,
        }
        if (!missing) feedback.value = '部分商品信息加载失败，请重新进入购物车'
        save(() => cart.update(item.id, { selected: false }))
      }
    }),
  )
  if (current === version) loading.value = false
}
// 切换单个商品的选中状态。
const toggle = (item: CartItem) => {
  if (reason(item)) return
  save(() => cart.update(item.id, { selected: !item.selected }))
}
// 全选或取消选择所有可结算商品。
const toggleAll = () => {
  save(() =>
    cart.select(
      eligible.value.map((item) => item.id),
      !allSelected.value,
    ),
  )
}
// 在库存限制内调整商品数量。
const changeQuantity = (item: CartItem, delta: number) => {
  // 当前商品的核验结果。
  const state = availability.value[item.id]
  if (loading.value || !state || state.reason) return
  // 本次调整后的商品数量。
  const quantity = item.quantity + delta
  // 库存下降后允许逐步减少超额数量。
  if (quantity < 1 || (delta > 0 && quantity > state.limit)) return
  save(() => cart.update(item.id, { quantity }))
}
// 确认后删除商品，并校验账号是否发生变化。
const remove = (item: CartItem) => {
  // 弹窗打开时的购物车归属。
  const owner = cart.owner
  // 弹窗打开时的登录凭证。
  const token = user.token
  uni.showModal({
    title: '删除商品',
    content: '确定从购物车删除该商品吗？',
    success: (result) => {
      if (result.confirm && owner === cart.owner && token === user.token)
        save(() => cart.remove(item.id))
    },
  })
}
// 打开地址管理，选择后统一更新购物车收花信息。
const chooseAddress = () => {
  const owner = cart.owner
  const token = user.token
  uni.navigateTo({
    url: '/pages/addresses/index?select=1',
    events: {
      addressSelected: (item: Address) => {
        if (owner !== cart.owner || token !== user.token) return
        addressVersion++
        addressLoading.value = false
        if (save(() => cart.updateContact(addressContact(item)))) {
          selectedAddressId = item.id
          addressEmpty.value = false
          addressError.value = false
        }
      },
    },
  })
}
// 创建结算记录并进入订单确认页。
const checkout = () => {
  if (!cart.confirmation?.submission && (addressLoading.value || addressError.value)) {
    uni.showToast({
      title: addressLoading.value ? '正在加载地址' : '地址加载失败，请重新进入购物车',
      icon: 'none',
    })
    return
  }
  try {
    // 未提交的订单须先补齐联系人和配送地址。
    if (!cart.confirmation?.submission && selected.value.length && !cart.mixed) {
      const contact = cart.fulfillment
      if (
        !contact?.contactName.trim() ||
        !/^1\d{10}$/.test(contact.contactPhone) ||
        (contact.method === 'delivery' && !contact.address.trim())
      ) {
        uni.showToast({ title: '请先选择收花地址，补全联系人信息', icon: 'none' })
        return
      }
    }
    // 本次结算记录的标识。
    const id = cart.begin(selected.value.map((item) => item.id))
    uni.navigateTo({ url: '/pages/order-confirm/index?id=' + encodeURIComponent(id) })
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : '结算信息保存失败，请重试',
      icon: 'none',
    })
  }
}
// 确认后清空包含冲突信息的购物车。
const clearMixed = () => {
  // 弹窗打开时的购物车归属。
  const owner = cart.owner
  uni.showModal({
    title: '清空购物车',
    content: '清空已有商品后重新选购？',
    success: (result) => {
      if (result.confirm && owner === cart.owner) save(() => cart.clear())
    },
  })
}
// 跳转到选购页面。
const shop = () => {
  uni.switchTab({ url: '/pages/order/index' })
}
// 跳转到登录页，并设置返回购物车的地址。
const login = () => {
  uni.navigateTo({ url: '/pages/login/index?returnUrl=' + encodeURIComponent('/pages/cart/index') })
}
// 登录状态或购物车归属变化时重新核验商品。
watch(
  () => [user.token, cart.owner],
  () => {
    selectedAddressId = ''
    void refreshAddress()
    void refresh()
  },
  { flush: 'sync' },
)
// 页面显示时刷新商品信息。
onShow(refresh)
onShow(refreshAddress)
// 页面卸载时使未完成的刷新请求失效。
onUnload(() => {
  version++
  addressVersion++
})
</script>

<template>
  <view class="cart-page">
    <view v-if="!cart.owner" class="empty">
      <image src="/static/tabar-icon/cart.png" mode="aspectFit" />
      <text class="empty-title">登录后查看购物车</text>
      <button class="primary" @click="login">去登录</button>
    </view>
    <view v-else-if="!cart.items.length" class="empty">
      <image src="/static/tabar-icon/cart.png" mode="aspectFit" />
      <text class="empty-title">购物车空空如也</text>
      <text class="muted">选一份鲜花，装点美好生活</text>
      <button class="primary" @click="shop">去选购</button>
    </view>
    <template v-else>
      <view v-if="cart.mixed" class="card feedback">
        <text>购物车包含不同门店或收花信息，请删除冲突商品后结算，或清空重新选购。</text>
        <button @click="clearMixed">清空购物车</button>
      </view>
      <button
        v-else-if="cart.fulfillment"
        class="card address-card"
        @click="chooseAddress"
        aria-label="选择或更换收花地址与联系人"
      >
        <view class="address-icon">
          <text class="iconfont icon-address" />
        </view>
        <view class="address-content">
          <view class="address-heading">
            <text class="address-label">收花地址</text>
          </view>
          <view
            v-if="!addressEmpty && !addressLoading && !addressError && cart.fulfillment.contactName"
            class="address-contact"
          >
            <text class="contact-name">{{ cart.fulfillment.contactName }}</text>
            <text class="contact-phone">{{ cart.fulfillment.contactPhone }}</text>
          </view>
          <text class="address-location">{{
            addressLoading
              ? '正在加载地址…'
              : addressError
              ? '地址加载失败，点击选择地址'
              : addressEmpty
              ? '新建地址'
              : cart.fulfillment.address || '请选择收花地址'
          }}</text>
        </view>
        <text class="address-arrow iconfont icon-youjiantou1" />
      </button>
      <view v-if="feedback" class="feedback">{{ feedback }}</view>
      <view v-for="item in cart.items" :key="item.id" class="card">
        <view class="store-row"
          ><text>{{ item.storeName }}</text
          ><button class="delete" @click="remove(item)">删除</button></view
        >
        <view class="product-row">
          <view class="item-select">
            <WdCheckbox
              :model-value="item.selected && !reason(item)"
              :disabled="!!reason(item)"
              type="circle"
              checked-color="#eed261"
              :aria-label="item.selected ? '取消选择商品' : '选择商品'"
              @change="toggle(item)"
            />
          </view>
          <image class="cover" :src="item.image" mode="aspectFill" />
          <view class="product-info">
            <text class="name">{{ item.productName }}</text>
            <text class="spec">{{ item.specName }} / {{ item.unit }}</text>
            <view class="price-row"
              ><text class="price">¥{{ money(item.unitPrice) }}</text>
              <view class="stepper">
                <button
                  :disabled="
                    loading ||
                    !availability[item.id] ||
                    !!availability[item.id]?.reason ||
                    item.quantity <= 1
                  "
                  aria-label="减少数量"
                  @click="changeQuantity(item, -1)"
                >
                  <view class="stepper-symbol">
                    <view class="stepper-line" />
                  </view>
                </button>
                <text>{{ item.quantity }}</text>
                <button
                  :disabled="!!reason(item) || item.quantity >= (availability[item.id]?.limit || 0)"
                  aria-label="增加数量"
                  @click="changeQuantity(item, 1)"
                >
                  <view class="stepper-symbol">
                    <view class="stepper-line" />
                    <view class="stepper-line stepper-line--vertical" />
                  </view>
                </button>
              </view>
            </view>
          </view>
        </view>
        <text v-if="reason(item)" class="unavailable">{{ reason(item) }}</text>
        <view v-if="cart.mixed || item.remark || item.couponId" class="details">
          <text v-if="cart.mixed"
            ><text class="method">{{ item.method === 'pickup' ? '门店自取' : '配送到家' }}</text>
            {{ item.contactName }} · {{ item.contactPhone }}</text
          >
          <text v-if="cart.mixed && item.address">{{ item.address }}</text>
          <text v-if="item.remark">备注：{{ item.remark }}</text>
          <text v-if="item.couponId">已保留优惠券选择，结算时重新校验</text>
        </view>
      </view>
      <view class="footer">
        <view class="footer-main">
          <view class="select-all">
            <WdCheckbox
              :model-value="allSelected"
              :disabled="!eligible.length"
              :indeterminate="selected.length > 0 && !allSelected"
              type="circle"
              checked-color="#eed261"
              @change="toggleAll"
            >
              全选
            </WdCheckbox>
          </view>
          <view class="total"
            ><text class="muted">商品合计</text><text class="price">¥{{ money(total) }}</text></view
          >
          <button class="primary" @click="checkout">去结算{{ count ? ` (${count})` : '' }}</button>
        </view>
      </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
@use './cart.scss' as page;
</style>
