<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('App Launch')
})
onShow(() => {
  console.log('App Show')
})
onHide(() => {
  console.log('App Hide')
})
</script>
<style lang="scss">
@use '@/style/base.scss' as *;
@use '@/style/iconfont/iconfont.css';

page {
  background-color: $qs-pageBackGroundColor;
  color: $qs-font-body;
  font-size: 28rpx;
}

.base-page {
  min-height: 100vh;
  padding: 32rpx $qs-page-spacing;
}

.base-page__card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280rpx;
  padding: 40rpx;
  background-color: $qs-card-bg;
  border: 1rpx solid $qs-border;
  border-radius: 24rpx;
}

.base-page__title {
  color: $qs-font-title;
  font-size: 36rpx;
  font-weight: 600;
  line-height: 1.5;
}
</style>
