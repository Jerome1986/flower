<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/modules/user'
import { registerUser } from '../invite/invite-data'
import { onLoad } from '@dcloudio/uni-app'

// 当前账户状态，复用项目现有持久化用户仓库。
const userStore = useUserStore()
// 是否由首页新人领券入口进入。
const claimEntry = ref(false)
// 用户登录后返回原先的下单或地址页面。
const returnUrl = ref('')
// 读取登录后的返回目标。
onLoad((options) => {
  claimEntry.value = options?.from === 'coupon'
  returnUrl.value = options?.returnUrl ? decodeURIComponent(options.returnUrl) : ''
})
// 当前模拟登录角色的展示名称。
const currentRole = computed(() =>
  userStore.profile?.role === 'manager'
    ? '店长'
    : userStore.profile?.role === 'user'
    ? '用户'
    : '未选择',
)

// 写入对应角色的模拟账户，再返回我的页面。
function loginAs(role: 'manager' | 'user') {
  userStore.setProfile({
    id: role === 'manager' ? 'test-manager' : 'test-user',
    nickname: role === 'manager' ? '中心店店长' : '爱花的你',
    phone: role === 'manager' ? '13800000001' : '13800000008',
    role,
    isTest: true,
    storeId: role === 'manager' ? 'store-1' : null,
  })
  if (role === 'user') registerUser('test-user', '13800000008')
  if (role === 'user' && returnUrl.value.startsWith('/pages/')) {
    uni.redirectTo({ url: returnUrl.value })
    return
  }
  if (claimEntry.value && role === 'user') {
    uni.redirectTo({ url: '/pages/coupons/index' })
    return
  }
  uni.switchTab({ url: '/pages/my/index' })
}
</script>

<template>
  <view class="test-login-page">
    <text class="eyebrow">前端体验</text>
    <text class="page-title">选择一个身份</text>
    <text class="subtitle">快速切换角色，预览不同身份的页面</text>
    <view class="role-panel">
      <text class="current-role">当前身份：{{ currentRole }}</text>
      <button class="role-button manager-button" @click="loginAs('manager')">
        <text class="iconfont icon-shouye1" />
        <view>
          <text class="button-title">店长登录</text>
          <text class="button-description">花间 · 中心店</text>
        </view>
        <text class="iconfont icon-youjiantou1" />
      </button>
      <button class="role-button user-button" @click="loginAs('user')">
        <text class="iconfont icon-hua" />
        <view>
          <text class="button-title">用户登录</text>
          <text class="button-description">以爱花用户的身份体验</text>
        </view>
        <text class="iconfont icon-youjiantou1" />
      </button>
    </view>
    <text class="test-note">仅用于前端测试，点击后切换模拟账户</text>
  </view>
</template>

<style lang="scss" scoped>
// 测试身份页面沿用品牌绿色与圆角卡片。
.test-login-page {
  padding: 48rpx $qs-page-spacing;
  color: $qs-font-body;
}
.eyebrow {
  display: block;
  color: $qs-brandColor;
  font-size: 21rpx;
  letter-spacing: 2rpx;
}
.page-title {
  display: block;
  margin-top: 16rpx;
  color: $qs-font-title;
  font-size: 40rpx;
  font-weight: 600;
}
.subtitle {
  display: block;
  margin-top: 14rpx;
  color: $qs-font-dec;
  font-size: 24rpx;
  line-height: 1.8;
}
.role-panel {
  margin-top: 36rpx;
  padding: 28rpx;
  border: 1rpx solid $qs-divider;
  border-radius: 24rpx;
  background: $qs-card-bg;
}
.current-role {
  display: block;
  margin-bottom: 24rpx;
  font-size: 23rpx;
  color: $qs-font-dec;
}
.role-panel .role-button {
  display: flex;
  align-items: center;
  gap: 20rpx;
  width: 100%;
  margin: 0;
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  line-height: 1.5;
  text-align: left;
  > view {
    flex: 1;
  }
  > .iconfont {
    font-size: 38rpx;
  }
  > .iconfont:last-child {
    font-size: 24rpx;
  }
}
.manager-button {
  background: $qs-brandColor;
  color: $qs-font-inverse;
}
.role-panel .user-button {
  margin-top: 20rpx;
  background: $qs-brandColor-light;
  color: $qs-brandColor;
}
.button-title {
  display: block;
  font-size: 29rpx;
  font-weight: 600;
}
.button-description {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
}
.test-note {
  display: block;
  margin-top: 28rpx;
  color: $qs-font-dec2;
  text-align: center;
  font-size: 22rpx;
}
</style>
