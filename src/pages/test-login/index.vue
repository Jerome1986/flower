<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/modules/user'
import { testLoginApi as testLogin } from '@/api/user'
import { toProfile } from '@/pages/test-login/user-profile'
import { onLoad } from '@dcloudio/uni-app'

// 当前账户状态，复用项目现有持久化用户仓库。
import { bindPendingInvitation, invitationBindingEnabled } from '@/pages/invite/invitation-actions'
import { safeReturnUrl } from '@/utils/login-return'
const userStore = useUserStore()
// 是否由首页新人领券入口进入。
const claimEntry = ref(false)
// 用户登录后返回原先的下单或地址页面。
const returnUrl = ref('')
const loading = ref(false)
// 读取登录后的返回目标。
onLoad((options) => {
  claimEntry.value = options?.from === 'coupon'
  returnUrl.value = safeReturnUrl(options?.returnUrl)
})
// 当前模拟登录角色的展示名称。
const currentRole = computed(() =>
  userStore.profile?.role === 'manager'
    ? '店长'
    : userStore.profile?.role === 'user'
    ? '用户'
    : '未选择',
)

// 保存服务器返回的身份，再返回原页面。
async function loginAs(phone: string) {
  if (loading.value) return
  loading.value = true
  try {
    const { data } = await testLogin(phone)
    userStore.clearProfile()
    userStore.setProfile(toProfile(data.userInfo))
    userStore.setToken(data.token)
    if (invitationBindingEnabled) {
      try {
        await bindPendingInvitation()
      } catch {
        /* 绑定失败不阻断登录，保留来源待重试。 */
      }
    }
  } catch {
    return
  } finally {
    loading.value = false
  }
  if (returnUrl.value.startsWith('/pages/')) {
    if (
      ['/pages/index/index', '/pages/order/index', '/pages/my/index'].includes(
        returnUrl.value.split('?')[0],
      )
    ) {
      uni.switchTab({ url: returnUrl.value.split('?')[0] })
      return
    }
    uni.redirectTo({ url: returnUrl.value })
    return
  }
  if (claimEntry.value) {
    uni.redirectTo({ url: '/pages/coupons/index' })
    return
  }
  uni.switchTab({ url: '/pages/my/index' })
}
</script>

<template>
  <view class="test-login-page">
    <text class="eyebrow">测试登录</text>
    <text class="page-title">选择手机号登录</text>
    <text class="subtitle">首次登录自动注册，身份由服务器返回</text>
    <view class="role-panel">
      <text class="current-role">当前身份：{{ currentRole }}</text>
      <button
        class="role-button manager-button"
        :disabled="loading"
        :loading="loading"
        @click="loginAs('15527650094')"
      >
        <text class="iconfont icon-shouye1" />
        <view>
          <text class="button-title">15527650094</text>
          <text class="button-description">测试手机号一</text>
        </view>
        <text class="iconfont icon-youjiantou1" />
      </button>
      <button class="role-button user-button" :disabled="loading" @click="loginAs('17502175260')">
        <text class="iconfont icon-hua" />
        <view>
          <text class="button-title">17502175260</text>
          <text class="button-description">测试手机号二</text>
        </view>
        <text class="iconfont icon-youjiantou1" />
      </button>
    </view>
    <text class="test-note">仅用于测试，登录信息保存到服务器</text>
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
