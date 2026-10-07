<script setup lang="ts"></script>

<template>
  <view class="home">
    <wd-button>主要按钮</wd-button>
    <wd-button type="success">成功按钮</wd-button>
    <wd-button type="info">信息按钮</wd-button>
    <wd-button type="warning">警告按钮</wd-button>
    <wd-button type="danger">危险按钮</wd-button>
  </view>
</template>

<style lang="scss" scoped>
.home {
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
</style>
