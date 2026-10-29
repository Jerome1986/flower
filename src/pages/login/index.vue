<script setup lang="ts">
import { wxLogin } from '@/api/user'
import { useUserStore } from '@/stores'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import pages from '@/pages.json'
import { safeReturnUrl } from '@/utils/login-return'

const userStore = useUserStore()
const agreed = ref(false)
const loading = ref(false)
const returnUrl = ref('')
function checkAgreement() {
  if (!agreed.value) uni.showToast({ icon: 'none', title: '请先阅读并勾选用户协议' })
}

function showAgreement(type: 'terms' | 'privacy') {
  uni.navigateTo({ url: `/pages/agreement/${type}` })
}

// 获取手机号凭证返回类型
type GetPhoneNumberEvent = {
  detail: {
    code?: string // 用于获取手机号的凭证
    errMsg?: string // 错误信息
    iv?: string // 加密算法的初始向量（已废弃）
    encryptedData?: string // 加密数据（已废弃）
  }
}

// 页面刷新获取最新CODE
const inviterCode = ref('')
onLoad((options) => {
  returnUrl.value = safeReturnUrl(options?.returnUrl) ||
    (options?.from === 'coupon' ? '/pages/coupons/index' : '/pages/my/index')
  inviterCode.value = String(uni.getStorageSync('flower-pending-invite-code') || '')
})

// 手机登录
const handleLogin = async (e: GetPhoneNumberEvent) => {
  if (loading.value) return

  if (!agreed.value) {
    uni.showToast({ icon: 'none', title: '请先阅读并勾选用户协议' })
    return
  }

  const phoneCode = e.detail.code

  if (!phoneCode) {
    uni.showToast({ icon: 'none', title: '未获取到手机号授权凭证' })
    return
  }

  loading.value = true
  try {
    const loginRes = await uni.login()
    if (!loginRes.code) throw new Error('获取微信登录凭证失败')
    const wxRes = await wxLogin(loginRes.code, phoneCode, inviterCode.value)

    if (wxRes.code === 200 && wxRes.data) {
      const userRes = wxRes.data
      userStore.clearProfile()
      userStore.setProfile(userRes.user)
      userStore.setToken(userRes.token)
      uni.removeStorageSync('flower-pending-invite-code')

      uni.showToast({
        icon: 'success',
        title: '登录成功',
        duration: 1000,
      })

      const target = returnUrl.value
      const path = target.split('?')[0]
      if (pages.tabBar.list.some((item) => '/' + item.pagePath === path)) {
        uni.switchTab({ url: path })
      } else {
        uni.redirectTo({ url: target })
      }
    } else {
      uni.showToast({
        icon: 'none',
        title: wxRes.message || '登录失败，请稍后重试',
      })
    }
  } catch (err) {
    uni.showToast({ icon: 'none', title: '请求异常，请检查网络' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="login-page">
    <view class="brand">
      <image class="brand-logo" src="/static/LOGO.jpg" mode="aspectFit" aria-label="品牌 LOGO" />
      <text class="brand-title">让鲜花走进日常</text>
      <text class="brand-slogan">每一次相遇，都值得一束花</text>
    </view>

    <view class="login-actions">
      <button class="login-button" :loading="loading" :disabled="loading" :open-type="agreed ? 'getPhoneNumber' : undefined" @click="checkAgreement" @getphonenumber="handleLogin">一键登录</button>
      <view class="privacy-row">
        <checkbox-group @change="agreed = $event.detail.value.includes('agree')">
          <label class="privacy-check">
            <checkbox value="agree" :checked="agreed" color="#756322" />
            <text>我已阅读并同意</text>
          </label>
        </checkbox-group>
        <button class="privacy-link" @click="showAgreement('terms')">《服务条款》</button>
        <text>和</text>
        <button class="privacy-link" @click="showAgreement('privacy')">《隐私协议》</button>
      </view>
    </view>

    <text class="footer">一花一份心意</text>
  </view>
</template>

<style scoped lang="scss">
.login-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  min-height: calc(100vh - var(--window-top, 0px));
  padding: 0 56rpx calc(40rpx + env(safe-area-inset-bottom));
  background: #fcfaf4;
  color: #343b35;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: clamp(100rpx, 16vh, 240rpx);
  text-align: center;
}

.brand-logo {
  display: block;
  width: 156rpx;
  height: 156rpx;
  border-radius: 36rpx;
  background: #eed261;
}

.brand-title {
  margin-top: 48rpx;
  font-size: 40rpx;
  font-weight: 600;
  letter-spacing: 4rpx;
  line-height: 1.5;
}

.brand-slogan {
  margin-top: 18rpx;
  color: #85877d;
  font-size: 25rpx;
  line-height: 1.8;
  letter-spacing: 2rpx;
}

.login-actions {
  width: 100%;
  max-width: 620rpx;
  margin-top: 120rpx;
  margin-bottom: 80rpx;
}

.login-button {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100rpx;
  border-radius: 50rpx;
  background: #eed261;
  color: #453d20;
  font-size: 30rpx;
  font-weight: 600;
  letter-spacing: 3rpx;
}

.login-button::after,
.privacy-link::after {
  border: 0;
}

.privacy-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  margin-top: 28rpx;
  color: #85877d;
  font-size: 23rpx;
}

.privacy-check {
  display: flex;
  align-items: center;
  min-height: 72rpx;
}

.privacy-check checkbox {
  transform: scale(0.7);
  margin-right: 2rpx;
}

.privacy-link {
  margin: 0;
  padding: 0;
  min-height: 72rpx;
  background: transparent;
  color: #756322;
  font-size: inherit;
  line-height: 72rpx;
}

.footer {
  margin-top: auto;
  color: #a8a89c;
  font-size: 22rpx;
  letter-spacing: 6rpx;
}
</style>
