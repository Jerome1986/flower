<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { mockFlowers, mockStores } from '../index/mock-data'
import { readStock } from '@/services/preview-stock'

// 当前查看的普通鲜花标识。
const productId = ref(mockFlowers[0].id)
// 用户选择的购买份数。
const quantity = ref(1)
// 当前收花方式。
const method = ref<'pickup' | 'delivery'>('pickup')
// 当前展示的模拟商品。
const product = computed(() => mockFlowers.find((item) => item.id === productId.value))
// 当前门店信息，首页直接进入时尚未选择门店。
const storeId = ref('')
// 当前选择的模拟门店。
const store = computed(() => mockStores.find((item) => item.id === storeId.value))
// 当前规格的模拟可售数量，未选门店时不展示库存。
const stocks = ref<Record<string, Record<string, number>>>({})
// 当前门店当前商品的可售数量。
const stock = computed(() => stocks.value[storeId.value]?.[productId.value])
// 数量上限，未选门店时最多预选99份。
const maxQuantity = computed(() => Math.max(1, stock.value ?? 99))
// 商品详情图预览，暂复用商品素材，后续替换为后台详情图。
const detailImages = computed(() => (product.value ? [product.value.image] : []))
// 商品金额，仅用于前端预览。
const subtotal = computed(() => (product.value?.price || 0) * quantity.value)
// 当前是否可以继续购买。
const canBuy = computed(
  () =>
    Boolean(product.value) &&
    (!store.value || (store.value.open && (stock.value || 0) >= quantity.value)),
)

// 根据入口参数初始化商品、门店和收花方式。
onLoad((options) => {
  if (options?.id) productId.value = options.id
  if (options?.storeId) storeId.value = options.storeId
  if (options?.method === 'delivery' && product.value?.methods.includes('delivery'))
    method.value = 'delivery'
})
// 返回商品页后刷新可售库存。
onShow(() => {
  stocks.value = readStock()
})
// 调整数量，不超过当前模拟库存。
function changeQuantity(step: number) {
  quantity.value = Math.max(1, Math.min(maxQuantity.value, Number(quantity.value) + step))
}
// 减少一份商品。
function decreaseQuantity() {
  changeQuantity(-1)
}
// 增加一份商品。
function increaseQuantity() {
  changeQuantity(1)
}
// 直接打开门店列表，并接收确认选择的门店。
function chooseStore() {
  uni.navigateTo({
    url: `/pages/stores/index?storeId=${storeId.value}&method=${method.value}`,
    events: {
      // 更新门店并将数量限制在新门店库存内。
      storeSelected: (id: string) => {
        storeId.value = id
        quantity.value = Math.min(quantity.value, maxQuantity.value)
      },
    },
  })
}
// 切换商品支持的收花方式。
function changeMethod(value: 'pickup' | 'delivery') {
  if (product.value?.methods.includes(value)) method.value = value
}
// 携带商品、数量和门店进入确认订单页。
function buyNow() {
  if (!canBuy.value) return
  if (!store.value) return chooseStore()
  uni.navigateTo({
    url: `/pages/checkout/index?id=${productId.value}&storeId=${storeId.value}&quantity=${quantity.value}&method=${method.value}`,
  })
}
// 返回下单页继续选花和选择门店。
function goShopping() {
  uni.setStorageSync('flower-entry-method', method.value)
  uni.switchTab({ url: '/pages/order/index' })
}
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
          <text>{{ product.methods.includes('delivery') ? '自取 / 配送' : '仅支持自取' }}</text>
        </view>
      </view>
      <view class="panel">
        <text class="section-title">选一份心意</text>
        <view class="field">
          <text class="field-label">商品规格</text>
          <view class="specification selected">
            <text>{{ product.specification }}</text>
            <text class="spec-unit">每{{ product.unit }}</text>
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
            <button :class="{ selected: method === 'pickup' }" @click="changeMethod('pickup')">
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
      <text class="demo-note">图片、价格及库存均为演示素材</text>
    </view>
    <view class="purchase-bar">
      <view>
        <text class="total-label">商品合计</text>
        <text class="price">
          <text class="currency">¥</text>
          {{ subtotal.toFixed(2) }}
        </text>
      </view>
      <button class="buy-button" :disabled="!canBuy" @click="buyNow">
        {{ !canBuy ? '暂不可购买' : '立即购买' }}
      </button>
    </view>
  </view>
  <view v-else class="empty-state">
    <text>暂未找到这款鲜花</text>
    <button @click="goShopping">去挑选其他鲜花</button>
  </view>
</template>

<style lang="scss" scoped>
@use './product.scss';
</style>
