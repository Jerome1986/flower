<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getCurrentUserApi, updateCurrentUserApi } from '@/api/user'
import { useUserStore } from '@/stores/modules/user'
import { resolveApiImage } from '@/utils/http'
import { openAuthPage } from '@/utils/login-return'

const userStore = useUserStore()
const form = reactive({ nickname: '', age: '', gender: 0 })
const loading = ref(false)
const saving = ref(false)
const ready = ref(false)
const error = ref('')
const genders = [{ value: 0, label: '保密' }, { value: 1, label: '男' }, { value: 2, label: '女' }]
const avatar = computed(() => resolveApiImage(userStore.profile?.avatar || ''))
async function loadProfile() {
  if (!userStore.token) return openAuthPage('/pages/profile/index')
  const token = userStore.token
  loading.value = true
  ready.value = false
  error.value = ''
  try {
    const { data } = await getCurrentUserApi()
    if (token !== userStore.token) return
    userStore.setProfile(data)
    Object.assign(form, { nickname: data.nickname || '', age: data.age?.toString() || '', gender: data.gender || 0 })
    ready.value = true
  } catch {
    error.value = '资料加载失败，请重试'
  } finally {
    loading.value = false
  }
}
onShow(loadProfile)
async function save() {
  if (!ready.value || saving.value) return
  const nickname = form.nickname.trim()
  if (!nickname || nickname.length > 32) return uni.showToast({ icon: 'none', title: '请输入1至32字昵称' })
  if (form.age && (!/^\d+$/.test(form.age) || Number(form.age) < 1 || Number(form.age) > 120)) {
    return uni.showToast({ icon: 'none', title: '请输入1至120的整数年龄' })
  }
  saving.value = true
  error.value = ''
  const token = userStore.token
  try {
    const { data } = await updateCurrentUserApi({ nickname, age: form.age ? Number(form.age) : null, gender: form.gender })
    if (token !== userStore.token) return
    userStore.setProfile(data)
    uni.showToast({ title: '资料已保存', icon: 'success' })
  } catch {
    error.value = '保存失败，请重试，已填写的内容会保留'
  } finally {
    saving.value = false
  }
}
function logout() {
  if (saving.value) return
  uni.showModal({
    title: '退出登录', content: '确定退出当前账户吗？', confirmColor: '#8a5b14',
    success: ({ confirm }) => {
      if (!confirm) return
      userStore.clearProfile()
      uni.switchTab({ url: '/pages/my/index' })
    },
  })
}
</script>

<template>
  <view class="profile-page">
    <view class="intro"><text class="eyebrow">一花一份心意</text><text class="title">让我们更了解你</text><text class="muted">留下一份专属于你的花礼资料</text></view>
    <view class="form-card">
      <view class="avatar-section">
        <image v-if="avatar" class="avatar" :src="avatar" mode="aspectFill" />
        <view v-else class="avatar placeholder"><text class="iconfont icon-hua" /></view>
        <text class="avatar-name">{{ userStore.profile?.nickname || '爱花的你' }}</text>
      </view>
      <view v-if="loading" class="status muted">正在加载资料…</view>
      <template v-if="ready">
        <view class="form-row"><text class="label">昵称</text><input v-model="form.nickname" :disabled="saving" type="nickname" :maxlength="32" placeholder="请输入昵称" placeholder-class="input-placeholder" /></view>
        <view class="form-row"><text class="label">年龄</text><input v-model="form.age" :disabled="saving" type="number" :maxlength="3" placeholder="选填，请输入年龄" placeholder-class="input-placeholder" /></view>
        <view class="form-row gender-row"><text class="label">性别</text><view class="gender-options"><button v-for="item in genders" :key="item.value" :disabled="saving" :class="{ selected: form.gender === item.value }" @click="form.gender = item.value">{{ item.label }}</button></view></view>
        <button class="save-button" :loading="saving" :disabled="saving" @click="save">{{ saving ? '正在保存' : '保存资料' }}</button>
      </template>
      <view v-if="error" class="error">{{ error }}<button v-if="!ready && !loading" class="retry" @click="loadProfile">重新加载</button></view>
    </view>
    <button class="logout-button" :disabled="saving" @click="logout">退出登录</button>
    <text class="footer">每一次相遇，都值得一束花</text>
  </view>
</template>

<style scoped lang="scss">
.profile-page { padding: 40rpx $qs-page-spacing calc(48rpx + env(safe-area-inset-bottom)); color: $qs-font-body; }
button { margin: 0; border: 0; font-size: 28rpx; &::after { border: 0; } }
.intro { padding: 0 8rpx 32rpx; text { display: block; } }
.eyebrow { color: $qs-warning; font-size: 22rpx; letter-spacing: 3rpx; }
.title { margin: 14rpx 0 10rpx; color: $qs-font-title; font-size: 40rpx; font-weight: 600; }
.muted { color: $qs-font-dec; font-size: 24rpx; }
.form-card { padding: 36rpx 28rpx; border: 1rpx solid $qs-divider; border-radius: 24rpx; background: $qs-card-bg; }
.avatar-section { display: flex; flex-direction: column; align-items: center; gap: 18rpx; margin-bottom: 32rpx; padding: 12rpx 0 32rpx; border-bottom: 1rpx solid $qs-divider; }
.avatar { width: 152rpx; height: 152rpx; border-radius: 50%; border: 6rpx solid $qs-brandColor-light; }
.placeholder { display: flex; align-items: center; justify-content: center; background: $qs-brandColor-light; color: $qs-brandColor; .iconfont { font-size: 100rpx; } }
.avatar-name { max-width: 100%; overflow-wrap: anywhere; color: $qs-font-title; font-size: 28rpx; }
.form-row { display: flex; align-items: center; gap: 20rpx; margin-bottom: 28rpx; }
.label { flex-shrink: 0; width: 80rpx; color: $qs-font-title; font-size: 28rpx; }
input { flex: 1; min-width: 0; height: 84rpx; padding: 0 22rpx; border: 1rpx solid $qs-border; border-radius: 16rpx; background: $qs-input-bg; font-size: 27rpx; }
:deep(.input-placeholder) { color: $qs-font-placeholder; }
.gender-options { display: flex; flex: 1; gap: 12rpx; button { flex: 1; padding: 0; line-height: 80rpx; border: 1rpx solid $qs-border; border-radius: 16rpx; background: $qs-card-bg; color: $qs-font-body; font-size: 26rpx; } .selected { background: $qs-brandColor-light; border-color: $qs-brandColor; color: $qs-font-inverse; font-weight: 600; } }
.save-button { margin-top: 44rpx; border-radius: 44rpx; background: $qs-brandColor; color: $qs-font-inverse; line-height: 88rpx; font-weight: 600; }
.save-button[disabled] { background: $qs-disabled-bg; color: $qs-disabled-font; }
.logout-button { margin-top: 30rpx; background: transparent; color: $qs-font-dec; line-height: 88rpx; }
.footer { display: block; margin-top: 24rpx; text-align: center; color: $qs-font-dec2; font-size: 22rpx; }
.status { text-align: center; padding: 24rpx; }
.error { margin-top: 24rpx; color: $qs-error; font-size: 24rpx; line-height: 1.7; }
.retry { margin-top: 16rpx; background: $qs-brandColor-light; color: $qs-font-inverse; }
</style>
