<script setup lang="ts">
import { getProduct, getSelectedStore, getStore } from '@/pages/stores/shop-data'
import { useCartStore } from '@/stores/modules/cart'
import type { ShopProduct } from '@/types/shop'
import type { FlowerStore } from '@/types/store'
import { openAuthPage } from '@/utils/login-return'
import { positiveId, positiveQuantity } from '@/utils/order-input'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import WdBadge from '@wot-ui/ui/components/wd-badge/wd-badge.vue'
import UniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'
// 当前账号的购物车。
const cart = useCartStore()
// 按当前账户购物车中所有商品的件数显示角标，包含未勾选商品。
const cartQuantity = computed(() => cart.items.reduce((total, item) => total + item.quantity, 0))
// 打开购物车，不改变当前商品或购物车内容。
const openCart = () => {
  uni.switchTab({ url: '/pages/cart/index' })
}
// 当前查看的普通鲜花标识。
const productId = ref('')
const source = ref<ShopProduct>()
const specId = ref('')
const selectedSpec = computed(() => source.value?.specs.find((spec) => spec.id === specId.value))
const loading = ref(false)
const failed = ref(false)
let loadVersion = 0
// 用户选择的购买份数。
const quantity = ref(1)
// 当前收花方式。
const method = ref<'pickup' | 'delivery'>('pickup')
// 当前规格对应的真实商品展示数据。
const product = computed(
  () =>
    source.value && {
      ...source.value,
      price: selectedSpec.value?.price ?? 0,
      specification: selectedSpec.value?.name ?? '',
      unit: selectedSpec.value?.unit ?? '',
    },
)
// 当前门店标识，未传入时读取上次选择或首家营业门店。
const storeId = ref('')
// 当前选择的真实门店。
const store = ref<FlowerStore>()
// 当前门店当前商品的可售数量。
const stock = computed(() => selectedSpec.value?.available ?? 0)
// 数量不超过选中规格的可售库存。
const maxQuantity = computed(() => Math.max(1, Math.min(999, stock.value)))
// 使用后台详情图，未配置时展示商品封面。
const detailImages = computed(() =>
  source.value?.images.length ? source.value.images : product.value ? [product.value.image] : [],
)
// 展示选中规格的小计，正式下单金额后续由报价接口确认。
const subtotal = computed(() => (product.value?.price || 0) * quantity.value)
// 当前是否可以继续购买。
const canBuy = computed(
  () =>
    !loading.value &&
    positiveId(productId.value) &&
    positiveId(storeId.value) &&
    positiveId(specId.value) &&
    positiveQuantity(quantity.value) &&
    quantity.value <= 999 &&
    Boolean(product.value && selectedSpec.value) &&
    Boolean(store.value?.open) &&
    stock.value >= quantity.value &&
    Boolean(product.value?.methods.includes(method.value)),
)
const loadProduct = async () => {
  const version = ++loadVersion
  loading.value = true
  failed.value = false
  source.value = undefined
  store.value = undefined
  try {
    const selectedStore = storeId.value ? await getStore(storeId.value) : await getSelectedStore()
    if (version !== loadVersion) return
    if (!selectedStore) return
    const item = await getProduct(selectedStore.id, productId.value)
    if (version !== loadVersion) return
    storeId.value = selectedStore.id
    store.value = selectedStore
    source.value = item
    if (!item.specs.some((spec) => spec.id === specId.value && spec.available > 0))
      specId.value = item.specs.find((spec) => spec.available > 0)?.id || item.specs[0]?.id || ''
    if (!item.methods.includes(method.value)) method.value = item.methods[0] || 'pickup'
    quantity.value = Math.min(quantity.value, maxQuantity.value)
  } catch {
    if (version === loadVersion) failed.value = true
  } finally {
    if (version === loadVersion) loading.value = false
  }
}
const selectSpec = (id: string) => {
  if (!source.value?.specs.some((spec) => spec.id === id)) return
  specId.value = id
  quantity.value = Math.min(quantity.value, maxQuantity.value)
}
// 调整数量，不超过当前规格库存。
const changeQuantity = (step: number) => {
  quantity.value = Math.max(1, Math.min(maxQuantity.value, Number(quantity.value) + step))
}
// 减少一份商品。
const decreaseQuantity = () => {
  changeQuantity(-1)
}
// 增加一份商品。
const increaseQuantity = () => {
  changeQuantity(1)
}
// 直接打开门店列表，并接收确认选择的门店。
const chooseStore = () => {
  uni.navigateTo({
    url: `/pages/stores/index?storeId=${storeId.value}&method=${method.value}`,
    events: {
      // 更新门店并将数量限制在新门店库存内。
      storeSelected: (id: string) => {
        storeId.value = id
        quantity.value = 1
        void loadProduct()
      },
    },
  })
}
// 切换商品支持的收花方式。
const changeMethod = (value: 'pickup' | 'delivery') => {
  if (product.value?.methods.includes(value)) method.value = value
}
// 校验当前商品并同步保存购物车，成功后才允许继续跳转。
const addCurrentProduct = (): boolean => {
  if (!canBuy.value || !product.value || !selectedSpec.value || !store.value) return false
  if (!cart.owner) {
    openAuthPage(
      `/pages/product/index?id=${productId.value}&storeId=${storeId.value}&specId=${specId.value}&quantity=${quantity.value}&method=${method.value}`,
    )
    return false
  }
  // 同一购物车沿用已选择的收花信息。
  const contact = cart.fulfillment
  try {
    cart.add(
      {
        storeId: storeId.value,
        productId: productId.value,
        specId: specId.value,
        storeName: store.value.name,
        productName: product.value.name,
        image: product.value.image,
        specName: selectedSpec.value.name,
        unit: selectedSpec.value.unit,
        unitPrice: Math.round(selectedSpec.value.price * 100),
        quantity: quantity.value,
        method: method.value,
        contactName: contact?.contactName || '',
        contactPhone: contact?.contactPhone || '',
        address: contact?.address || '',
        remark: '',
        couponId: '',
      },
      stock.value,
    )
    return true
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : '加入购物车失败，请重试',
      icon: 'none',
    })
    return false
  }
}
// 加入购物车后停留在详情页。
const addToCart = () => {
  if (addCurrentProduct()) uni.showToast({ title: '已加入购物车', icon: 'success' })
}
// 先加入当前商品，再进入购物车选择商品并结算。
const buyNow = () => {
  if (!addCurrentProduct()) return
  uni.switchTab({ url: '/pages/cart/index' })
}
// 返回下单页继续选花和选择门店。
const goShopping = () => {
  uni.setStorageSync('flower-entry-method', method.value)
  uni.switchTab({ url: '/pages/order/index' })
}
// 根据入口参数初始化商品、门店和收花方式。
onLoad((options) => {
  if (options?.id) productId.value = options.id
  if (options?.storeId) storeId.value = options.storeId
  if (options?.specId && positiveId(options.specId)) specId.value = options.specId
  if (positiveQuantity(Number(options?.quantity)))
    quantity.value = Math.min(999, Number(options?.quantity))
  if (options?.method === 'delivery') method.value = 'delivery'
})
// 返回商品页后刷新可售库存。
onShow(() => {
  void loadProduct()
})
</script>

<template>
  <view v-if="product" class="product-page">
    <view class="product-gallery">
      <image class="product-cover" :src="product.image" mode="aspectFill" />
    </view>
    <view class="content">
      <view class="panel product-summary">
        <view class="title-row">
          <text class="product-title">{{ product.name }}</text>
          <text class="price">
            <text class="currency">¥</text>
            {{ product.price.toFixed(2) }}
          </text>
        </view>
        <text class="subtitle">{{ product.description }}</text>
        <view class="summary-tags">
          <text>门店散花</text>
          <text>{{
            product.methods.map((item) => (item === 'pickup' ? '自取' : '配送')).join(' / ')
          }}</text>
        </view>
      </view>
      <view class="panel">
        <text class="section-title">选一份心意</text>
        <view class="field">
          <text class="field-label">商品规格</text>
          <view class="method-options">
            <button
              v-for="spec in product.specs"
              :key="spec.id"
              :class="{ selected: specId === spec.id }"
              @click="selectSpec(spec.id)"
            >
              {{ spec.name }} · ¥{{ spec.price.toFixed(2) }} / {{ spec.unit
              }}{{ spec.available === 0 ? ' · 售罄' : '' }}
            </button>
          </view>
        </view>
        <view class="quantity-row">
          <view>
            <text class="field-label">购买数量</text>
            <text class="hint">1 {{ product.unit }}为 {{ product.specification }}</text>
          </view>
          <view class="stepper">
            <button
              class="stepper-button"
              :disabled="quantity <= 1"
              aria-label="减少数量"
              @click.stop="decreaseQuantity"
            >
              <view class="minus-icon" />
            </button>
            <text class="quantity-value">{{ quantity }}</text>
            <button
              class="stepper-button"
              :disabled="quantity >= maxQuantity"
              aria-label="增加数量"
              @click.stop="increaseQuantity"
            >
              <text class="iconfont icon-jiahao" />
            </button>
          </view>
        </view>
        <view class="field">
          <text class="field-label">收花方式</text>
          <view class="method-options">
            <button
              :class="{ selected: method === 'pickup' }"
              :disabled="!product.methods.includes('pickup')"
              @click="changeMethod('pickup')"
            >
              <text class="iconfont icon-shouye1" />
              门店自取
            </button>
            <button
              :class="{ selected: method === 'delivery' }"
              :disabled="!product.methods.includes('delivery')"
              @click="changeMethod('delivery')"
            >
              <text class="iconfont icon-address" />
              鲜花到家
            </button>
          </view>
        </view>
        <text class="hint">
          {{
            product.methods.includes('delivery')
              ? '配送范围及费用以所选门店为准'
              : '这款鲜花仅支持到店自取'
          }}
        </text>
      </view>
      <view class="panel store-panel">
        <view class="store-heading">
          <text class="section-title">{{ store ? '当前门店' : '选择收花门店' }}</text>
          <button class="text-button" @click="chooseStore">
            {{ store ? '切换门店' : '去选门店' }}
            <text class="iconfont icon-youjiantou1" />
          </button>
        </view>
        <template v-if="store">
          <text class="store-name">{{ store.name }}</text>
          <text class="subtitle">{{ store.address }}</text>
          <text class="hint">营业时间 {{ store.hours }}</text>
          <text class="hint">
            {{
              !store.open
                ? '门店休息中，暂不可购买'
                : stock === 0
                ? '当前门店已售罄'
                : `当前规格剩余 ${stock} ${product.unit}`
            }}
          </text>
        </template>
        <text v-else class="subtitle">选好门店后，查看这款鲜花的供应与库存</text>
      </view>
      <view class="panel detail-panel">
        <text class="section-title">商品详情</text>
        <view class="detail-images">
          <image
            v-for="image in detailImages"
            :key="image"
            class="detail-image"
            :src="image"
            mode="widthFix"
            lazy-load
          />
        </view>
      </view>
      <view class="panel">
        <text class="section-title">收花小贴士</text>
        <text class="tips">鲜花为自然生长，花型与颜色可能略有差异，以门店实际供应为准。</text>
        <text class="tips">自取请留意门店营业时间；配送地址需在门店服务区域内。</text>
        <text class="tips">优惠券可在确认订单时选择，每单限用一张，不抵配送费。</text>
      </view>
      <text class="demo-note">商品、价格及库存以所选门店当前配置为准</text>
    </view>
    <view class="purchase-bar">
      <view class="purchase-total">
        <text class="total-label">商品合计</text>
        <text class="price">
          <text class="currency">¥</text>
          {{ subtotal.toFixed(2) }}
        </text>
      </view>
      <view
        class="cart-entry"
        role="button"
        :aria-label="`购物车，共${cartQuantity}件商品`"
        @click="openCart"
      >
        <WdBadge :value="cartQuantity" :max="99" :show-zero="false" border>
          <view class="cart-entry-icon">
            <UniIcons type="cart" size="48rpx" color="#4b554f" />
          </view>
        </WdBadge>
      </view>
      <view class="purchase-actions">
        <button class="buy-button cart-button" :disabled="!canBuy" @click="addToCart">
          加入购物车
        </button>
        <button class="buy-button" :disabled="!canBuy" @click="buyNow">立即购买</button>
      </view>
    </view>
  </view>
  <view v-else class="empty-state">
    <text>{{
      loading ? '正在加载商品…' : failed ? '商品加载失败，或本店暂未上架' : '暂无可选门店或商品'
    }}</text>
    <button v-if="failed" @click="loadProduct">重新加载</button>
    <button @click="chooseStore">选择其他门店</button>
    <button @click="goShopping">去挑选其他鲜花</button>
  </view>
</template>

<style lang="scss" scoped>
@use './product.scss' as page;
</style>
