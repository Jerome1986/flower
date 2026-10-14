<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getBouquetsApi as getBouquets } from '@/api/bouquets'
import { useResource } from '@/composables/use-resource'

// 专区数据来自独立花束服务。
const resource = useResource(getBouquets, false)
const bouquets = computed(() => resource.data.value || [])
const loading = resource.loading
const message = resource.message
const pending = resource.pending
onShow(resource.load)

// 统一展示花束价格。
function formatPrice(amount: number) {
  return amount.toFixed(2)
}
// 打开所选成品花束的详情页面。
function viewBouquet(id: string) {
  uni.navigateTo({ url: `/pages/bouquet-detail/index?id=${id}` })
}
</script>

<template>
  <view class="bouquets-page">
    <view class="page-intro">
      <text class="eyebrow">送给特别的人</text>
      <text class="page-title">定制一束鲜花</text>
      <text class="subtitle">把想说的话，交给一束用心准备的花</text>
    </view>
    <view class="service-note">
      <view class="service-icon"><text class="iconfont icon-liwuhe" /></view>
      <view>
        <text class="service-title">精选成品花束 · 平台安排配送</text>
        <text class="service-copy">无需选择门店，为重要的时刻送上心意</text>
      </view>
    </view>
    <view v-if="loading || message" class="tips-panel"
      ><text>{{ loading ? '正在加载花束…' : message }}</text
      ><button v-if="!loading && !pending" @click="resource.load">重试</button></view
    >
    <view v-else-if="!bouquets.length" class="tips-panel"><text>暂无上架花束</text></view>
    <view class="bouquet-list">
      <view
        v-for="(bouquet, index) in bouquets"
        :key="bouquet.id"
        class="bouquet-card"
        @click="viewBouquet(bouquet.id)"
      >
        <view class="cover"><image :src="bouquet.image" mode="aspectFill" lazy-load /></view>
        <view class="card-body">
          <view class="card-heading">
            <view class="name-row">
              <text class="collection-number">0{{ index + 1 }}</text>
              <text class="bouquet-name">{{ bouquet.name }}</text>
            </view>
            <text class="delivery-tag">仅配送</text>
          </view>
          <text class="description">{{ bouquet.description }}</text>
          <view class="card-bottom">
            <view>
              <text class="specification">{{ bouquet.specification }} / {{ bouquet.unit }}</text>
              <text class="price">
                <text class="currency">¥</text>
                {{ formatPrice(bouquet.price) }}
              </text>
            </view>
            <button
              class="choose-button"
              :aria-label="'查看' + bouquet.name"
              @click.stop="viewBouquet(bouquet.id)"
            >
              挑选这一束
              <text class="iconfont icon-youjiantou1" />
            </button>
          </view>
        </view>
      </view>
    </view>
    <view class="tips-panel">
      <text class="section-title">关于这份花礼</text>
      <text class="tip">专区为精选固定成品款式，暂不支持自由搭配花材或在线改款。</text>
      <text class="tip">
        花束由平台统一安排制作配送，仅支持配送，服务区域和费用以确认订单页为准。
      </text>
      <text class="tip">鲜花的花型与颜色可能略有差异，具体商品说明请查看花束详情。</text>
    </view>
    <view class="page-footer">
      <text>一束鲜花，一份特别的心意</text>
      <text class="demo-note">商品、价格及配送信息以开放后展示为准</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@use './bouquets.scss';
</style>
