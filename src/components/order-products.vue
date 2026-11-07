<script setup lang="ts">
import { computed } from 'vue'
import type { PreviewOrder } from '@/types/order'
const props = defineProps<{ order: PreviewOrder }>()
const items = computed(() => (props.order.items?.length ? props.order.items : [props.order]))
</script>
<template>
  <view v-for="(item, index) in items" :key="index" class="order-product">
    <image :src="item.image" mode="aspectFill" />
    <view
      ><text class="name">{{ item.productName }}</text
      ><text>{{ item.specification }} / {{ item.unit }} × {{ item.quantity }}</text
      ><text v-if="item.remark">备注：{{ item.remark }}</text></view
    >
  </view>
</template>
<style scoped lang="scss">
.order-product {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid $qs-divider;
  image {
    width: 144rpx;
    height: 160rpx;
    flex: none;
    border-radius: 16rpx;
  }
  view {
    flex: 1;
    min-width: 0;
  }
  text {
    display: block;
    font-size: 24rpx;
    color: $qs-font-dec;
    line-height: 1.7;
    margin-top: 8rpx;
    overflow-wrap: anywhere;
  }
  .name {
    font-size: 28rpx;
    color: $qs-font-title;
    font-weight: 600;
  }
}
</style>
