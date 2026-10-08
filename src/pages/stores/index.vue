<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { mockStores, type FlowerStore } from '../index/mock-data'

// 当前选择的门店标识。
const selectedId = ref(mockStores[0].id)
// 门店名称或地址的搜索关键词。
const keyword = ref('')
// 当前收花方式，用于展示配送区域和费用。
const method = ref('pickup')
// 各门店的模拟距离，仅用于前端结构预览。
const storeDistances: Record<string, string> = {
  'store-1': '1.7km',
  'store-2': '3.2km',
  'store-3': '5.6km',
}
// 按关键词筛选的模拟门店列表。
const visibleStores = computed(() =>
  mockStores.filter((store) => `${store.name}${store.address}`.includes(keyword.value.trim())),
)

// 读取下单页传入的门店和收花方式。
onLoad((options) => {
  if (options?.storeId) selectedId.value = options.storeId
  if (options?.method === 'delivery') method.value = 'delivery'
})
// 保存选择的模拟门店并返回下单页。
function selectStore(store: FlowerStore) {
  if (!store.open) return
  uni.setStorageSync('flower-selected-store', store.id)
  // 当前页面向来源详情页传递门店选择结果。
  const page = getCurrentPages()[getCurrentPages().length - 1]
  page.getOpenerEventChannel().emit('storeSelected', store.id)
  uni.navigateBack()
}
// 点击卡片切换高亮，确认按钮才提交门店选择。
function highlightStore(store: FlowerStore) {
  selectedId.value = store.id
}
// 复制门店地址，方便查看或转发。
function copyAddress(address: string) {
  uni.setClipboardData({ data: address })
}
// 调用系统拨号入口联系门店。
function callStore(phone: string) {
  uni.makePhoneCall({ phoneNumber: phone })
}
// 清空搜索条件并恢复全部门店。
function clearSearch() {
  keyword.value = ''
}
</script>

<template>
  <view class="stores-page">
    <view class="page-intro">
      <text class="eyebrow">一花一份心意</text>
      <text class="page-title">选一家喜欢的花店</text>
      <text class="subtitle">
        {{
          method === 'pickup' ? '找一家顺路的门店，把鲜花带回家' : '选择配送门店，让鲜花来到你身边'
        }}
      </text>
    </view>
    <view class="search-box">
      <UniIcons type="search" size="21" color="#707b74" />
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索门店名称或地址"
        placeholder-class="search-placeholder"
        confirm-type="search"
        maxlength="50"
      />
      <button v-if="keyword" class="clear-button" aria-label="清空搜索" @click="clearSearch">
        ×
      </button>
    </view>
    <view class="list-heading">
      <text>全部门店</text>
      <text class="muted">
        {{ visibleStores.length }} 家门店 · {{ method === 'pickup' ? '门店自取' : '鲜花到家' }}
      </text>
    </view>
    <view class="store-list">
      <view
        v-for="store in visibleStores"
        :key="store.id"
        class="store-card"
        :class="{ selected: selectedId === store.id, resting: !store.open }"
        @click="highlightStore(store)"
      >
        <view class="store-main">
          <view class="store-mark">
            <text class="iconfont icon-hua" />
            <text>花间</text>
          </view>
          <view class="store-copy">
            <view class="name-row">
              <text class="store-name">{{ store.name }}</text>
              <text v-if="selectedId === store.id" class="current-tag">已选中</text>
            </view>
            <text class="address">{{ store.address }}</text>
            <view class="hours-row">
              <text class="status" :class="{ closed: !store.open }">
                {{ store.open ? '营业中' : '休息中' }}
              </text>
              <text>{{ store.hours }}</text>
            </view>
            <view class="distance-row">
              <text class="iconfont icon-address" />
              <text>距您 {{ storeDistances[store.id] }}</text>
            </view>
          </view>
        </view>
        <view v-if="method === 'delivery'" class="delivery-note">
          <text class="iconfont icon-address" />
          <text>{{ store.deliveryArea }} · 配送费 ¥{{ store.deliveryFee.toFixed(2) }}</text>
        </view>
        <view class="contact-row">
          <text class="muted">联系电话：{{ store.phone }}</text>
          <view class="contact-actions">
            <button @click.stop="copyAddress(store.address)">复制地址</button>
            <button :aria-label="'联系' + store.name" @click.stop="callStore(store.phone)">
              联系门店
            </button>
          </view>
        </view>
        <view class="card-bottom">
          <text class="bottom-note">
            {{
              !store.open
                ? '门店休息中，暂不可下单'
                : selectedId === store.id
                ? '已选中，确认后继续选花'
                : '点击卡片选中这家门店'
            }}
          </text>
          <button
            v-if="selectedId === store.id"
            class="select-button"
            :disabled="!store.open"
            @click.stop="selectStore(store)"
          >
            {{ !store.open ? '休息中' : '选择门店' }}
          </button>
        </view>
      </view>
    </view>
    <view v-if="!visibleStores.length" class="empty-state">
      <text class="iconfont icon-address" />
      <text class="empty-title">暂未找到这家花店</text>
      <text class="muted">换个门店名称或地址试试</text>
      <button @click="clearSearch">查看全部门店</button>
    </view>
    <view class="page-footer">
      <text>每一次相遇，都值得一束花</text>
      <text class="muted">门店信息为演示素材</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@use './stores.scss';
</style>
