<script setup lang="ts">
import { orderPayApi } from '@/api/payment'
import OrderProducts from '@/components/order-products.vue'
import { useResource } from '@/composables/use-resource'
import { canRequestWechatPayment, requestWechatPayment } from '@/pages/order-confirm/payment'
import { cancelOrder, getOrder } from '@/pages/orders/order-data'
import {
  canCancelUserOrder,
  orderHint,
  orderPaymentLabel,
  orderStageIndex,
  orderStages,
  orderTitle,
} from '@/pages/orders/order-display'
import { useUserStore } from '@/stores/modules/user'
import { openAuthPage } from '@/utils/login-return'
import { onLoad, onPullDownRefresh, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
// 当前用户账户，店长订单在门店管理页展示。
const userStore = useUserStore()
// 当前需要读取的订单编号。
const orderNo = ref('')
// 当前展示的服务端订单快照。
const resource = useResource(() => {
  if (!orderNo.value) throw new Error('订单编号缺失')
  return getOrder(orderNo.value)
}, true)
const order = computed(() => resource.data.value || null)
const loading = resource.loading
const failed = computed(() => Boolean(resource.message.value))
const paying = ref(false)
const paymentError = ref('')
let paymentVersion = 0
const login = () => {
  openAuthPage('/pages/order-detail/index?orderNo=' + encodeURIComponent(orderNo.value))
}
const loadOrder = async () => {
  await resource.load()
}
const cancel = () => {
  if (paying.value || cancelling.value || !canCancel.value || !order.value) return
  const token = userStore.token
  const no = orderNo.value
  uni.showModal({
    title: '取消订单',
    content:
      order.value.paymentStatus === 'PAID'
        ? '确认取消并申请原路退款？退款成功后返还优惠券。'
        : '确认取消这笔鲜花订单？',
    success: async (result) => {
      if (
        !result.confirm ||
        paying.value ||
        cancelling.value ||
        token !== userStore.token ||
        no !== orderNo.value ||
        !canCancel.value
      )
        return
      cancelling.value = true
      cancelError.value = ''
      try {
        await cancelOrder(no)
        if (token === userStore.token && no === orderNo.value) await loadOrder()
      } catch {
        if (token === userStore.token && no === orderNo.value) {
          cancelError.value = '取消未确认成功，请刷新订单状态后重试'
          await loadOrder()
        }
      } finally {
        if (token === userStore.token && no === orderNo.value) cancelling.value = false
      }
    },
  })
}
// 复制已备货订单的取货码。
const copyPickupCode = () => {
  if (order.value?.method === 'pickup' && order.value.status === 'ready' && order.value.pickupCode)
    uni.setClipboardData({ data: order.value.pickupCode })
}
// 复制订单编号，方便向门店咨询。
const copyOrderNo = () => {
  if (order.value) uni.setClipboardData({ data: order.value.orderNo })
}
// 使用系统电话入口联系履约门店。
const contactStore = () => {
  if (order.value?.storePhone) return uni.makePhoneCall({ phoneNumber: order.value.storePhone })
  uni.showToast({ title: '客服电话暂未配置', icon: 'none' })
}
// 返回下单页继续选购鲜花。
const goShopping = () => {
  if (order.value?.type === 'custom') return uni.redirectTo({ url: '/pages/bouquets/index' })
  uni.switchTab({ url: '/pages/order/index' })
}
const pay = async () => {
  if (paying.value || cancelling.value || order.value?.backendStatus !== 'PENDING_PAYMENT') return
  if (!canRequestWechatPayment())
    return uni.showToast({ title: '请在微信小程序中支付', icon: 'none' })
  const openid = userStore.profile?.openId
  if (!openid) {
    paymentError.value = '微信登录信息缺失，请重新登录'
    return
  }
  const token = userStore.token,
    no = orderNo.value,
    version = ++paymentVersion
  const active = () =>
    version === paymentVersion && token === userStore.token && no === orderNo.value
  paying.value = true
  paymentError.value = ''
  try {
    const { data } = await orderPayApi(no, openid)
    if (!active()) return
    if (data.orderId !== no) throw new Error('支付订单编号异常')
    await requestWechatPayment(data)
    if (active())
      uni.redirectTo({ url: '/pages/payment-result/index?orderNo=' + encodeURIComponent(no) })
  } catch (error) {
    if (!active()) return
    const message =
      typeof error === 'object' && error && 'errMsg' in error ? String(error.errMsg) : ''
    paymentError.value = message.includes('cancel')
      ? '已取消支付，可继续支付当前订单'
      : '支付未确认，请查看最新订单状态后重试'
    await loadOrder()
  } finally {
    if (active()) paying.value = false
  }
}
onUnload(() => {
  paymentVersion++
})
const cancelling = ref(false)
const cancelError = ref('')
const canCancel = computed(() => canCancelUserOrder(order.value))
watch(
  () => userStore.token,
  () => {
    paymentVersion++
    paying.value = false
    paymentError.value = ''
    cancelling.value = false
    cancelError.value = ''
  },
  { flush: 'sync' },
)
// 订单履约进度。
const stages = computed(() => orderStages(order.value))
// 当前履约步骤，与店长页面一致。
const stageIndex = computed(() => orderStageIndex(order.value))
// 当前订单的用户状态标题。
const statusTitle = computed(() => (order.value ? orderTitle(order.value) : ''))
// 不同履约阶段的用户提示。
const statusCopy = computed(() => (order.value ? orderHint(order.value) : ''))
// 当前订单商品金额。
const productAmount = computed(() => order.value?.productAmount ?? order.value?.total ?? 0)
// 当前订单配送费。
const deliveryFee = computed(() => order.value?.deliveryFee ?? 0)
// 当前订单优惠金额。
const discount = computed(() => order.value?.discount ?? 0)
// 数据以当前账户的服务端响应为准。
onLoad((options) => {
  orderNo.value = options?.orderNo || ''
})
// 返回页面时刷新最新状态和取货码。
onShow(() => {
  void loadOrder()
})
onPullDownRefresh(async () => {
  try {
    await loadOrder()
  } finally {
    uni.stopPullDownRefresh()
  }
})
</script>

<template>
  <view v-if="order" class="detail-page">
    <view class="status-section" :class="{ 'status-section-closed': order.status === 'cancelled' }">
      <view class="status-heading">
        <view class="status-heading-copy">
          <text v-if="order.status !== 'cancelled'" class="eyebrow">我的鲜花订单</text>
          <text class="status-title">{{ statusTitle }}</text>
        </view>
        <button
          v-if="!['cancelled', 'completed'].includes(order.status || '')"
          class="refresh-order"
          :disabled="loading || cancelling"
          @click="loadOrder"
        >
          刷新订单状态
        </button>
      </view>
      <text v-if="order.status !== 'cancelled'" class="status-copy">{{ statusCopy }}</text>
      <view v-if="order.status !== 'cancelled'" class="progress">
        <view
          v-for="(stage, index) in stages"
          :key="stage"
          class="progress-step"
          :class="{ active: index <= stageIndex, current: index === stageIndex }"
        >
          <view class="progress-dot" />
          <text>{{ stage }}</text>
        </view>
      </view>
      <view
        v-if="
          order.method === 'pickup' &&
          !['unpaid', 'cancelling', 'cancelled'].includes(order.status || '')
        "
        class="pickup-note"
      >
        <text class="iconfont icon-shouye1" />
        <view>
          <template v-if="order.status === 'ready' && order.pickupCode">
            <text class="note-title">到店出示取货码</text>
            <view class="pickup-code-row">
              <text class="pickup-code">{{ order.pickupCode }}</text>
              <button @click="copyPickupCode">复制</button>
            </view>
            <text class="muted">请向店员出示，由店员核销后领取</text>
          </template>
          <template v-else>
            <text class="note-title">
              {{ order.status === 'completed' ? '已核销领取' : '取货码将在备货完成后显示' }}
            </text>
            <text class="muted">
              {{
                order.status === 'completed'
                  ? '取货码已失效，愿鲜花为你带来好心情'
                  : '请等待门店备货完成，再前往门店自取'
              }}
            </text>
          </template>
        </view>
      </view>
    </view>
    <view class="panel">
      <view class="panel-heading">
        <text class="section-title">{{ order.method === 'pickup' ? '自取信息' : '配送信息' }}</text>
        <text class="tag">{{ order.method === 'pickup' ? '门店自取' : '鲜花到家' }}</text>
      </view>
      <text class="store-name">{{ order.storeName }}</text>
      <text class="muted">{{ order.storeAddress }}</text>
      <text class="muted">营业时间 {{ order.hours }}</text>
      <view class="contact-info">
        <text>{{ order.contactName }} · {{ order.phone }}</text>
        <text v-if="order.method === 'delivery'" class="muted">{{ order.address }}</text>
      </view>
    </view>
    <view class="panel">
      <text class="section-title">鲜花明细</text>
      <OrderProducts :order="order" />
      <view class="amount-row"
        ><text>商品金额</text><text>¥{{ productAmount.toFixed(2) }}</text></view
      >
      <view class="amount-row"
        ><text>配送费</text><text>¥{{ deliveryFee.toFixed(2) }}</text></view
      >
      <view class="amount-row"
        ><text>优惠金额</text><text>−¥{{ discount.toFixed(2) }}</text></view
      >
      <view class="amount-row total-row"
        ><text>订单金额</text><text class="price">¥{{ order.total.toFixed(2) }}</text></view
      >
    </view>
    <view class="panel">
      <text class="section-title">订单信息</text>
      <view class="info-row">
        <text>订单类型</text>
        <text class="info-value">
          {{ order.type === 'custom' ? '平台定制订单' : '门店鲜花订单' }}
        </text>
      </view>
      <view class="info-row">
        <text>订单编号</text>
        <view class="order-number">
          <text>{{ order.orderNo }}</text>
          <button @click="copyOrderNo">复制</button>
        </view>
      </view>
      <view class="info-row">
        <text>下单时间</text>
        <text class="info-value">{{ order.createdAt || '—' }}</text>
      </view>
      <view class="info-row">
        <text>支付状态</text>
        <text class="info-value">{{ orderPaymentLabel(order) }}</text>
      </view>
      <view class="info-row remark-row">
        <text>订单备注</text>
        <text class="info-value">{{ order.remark || '无备注' }}</text>
      </view>
    </view>
    <text v-if="order.status !== 'cancelled'" class="footer-note">
      {{
        canCancel
          ? '可取消订单；已使用优惠券按原有效期返还'
          : ['completed', 'cancelled'].includes(order.status || '')
          ? '订单已结束'
          : order.type === 'custom'
          ? '如需协助，请联系平台客服'
          : '如需协助，请联系门店'
      }}
    </text>
    <view class="action-bar">
      <button v-if="order.status === 'unpaid'" :disabled="paying || cancelling" @click="pay">
        {{ paying ? '支付中…' : '继续支付' }}
      </button>
      <button v-if="canCancel" :disabled="cancelling || paying" @click="cancel">
        {{ cancelling ? '取消中…' : '取消订单' }}
      </button>
      <button class="contact-button" @click="contactStore">
        {{ order.type === 'custom' ? '联系平台' : '联系门店' }}
      </button>
      <button class="shopping-button" @click="goShopping">继续选花</button>
    </view>
    <text v-if="cancelError" class="footer-note">{{ cancelError }}</text>
    <text v-if="paymentError" class="footer-note">{{ paymentError }}</text>
  </view>
  <view v-else class="empty-state">
    <text>{{ loading ? '正在加载订单…' : resource.message.value || '暂无订单信息' }}</text>
    <button v-if="!userStore.token" @click="login">登录查看订单</button>
    <button v-else-if="failed" @click="loadOrder">重新加载</button>
    <button @click="goShopping">去选花</button>
  </view>
</template>

<style lang="scss" scoped>
@use './detail.scss' as page;
.status-section-closed .status-title {
  margin-top: 0;
  font-size: 32rpx;
}
.status-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}
.status-heading-copy {
  flex: 1;
  min-width: 0;
}
.detail-page .refresh-order {
  flex-shrink: 0;
  margin: 0;
  padding: 12rpx 24rpx;
  width: fit-content;
  border: 1rpx solid #eed261;
  border-radius: 16rpx;
  color: $qs-accent-text;
  font-size: 24rpx;
  background: #fff;
  min-height: 72rpx;
  border-color: $qs-border;
}
</style>
