<script setup lang="ts">
import { ref } from 'vue'
import { onShow, onShareAppMessage } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import {
  getInviteCode,
  readInvites,
  rememberInvitation,
  registerUser,
  type InviteRecord,
} from './invite-data'

// 当前模拟登录账户。
const userStore = useUserStore()
// 当前账户的模拟个人邀请码。
const inviteCode = ref('')
// 成功注册产生的邀请记录，按账户读取。
const records = ref<InviteRecord[]>([])
// 活动参与步骤，好友首次注册即触发奖励。
const steps = ['分享给好友', '好友首次注册', '双方获得花礼券']

// 进入页面时刷新邀请码和真实的本地模拟记录。
onShow(() => {
  if (userStore.profile?.role !== 'user')
    return uni.redirectTo({ url: '/pages/test-login/index?returnUrl=%2Fpages%2Finvite%2Findex' })
  inviteCode.value = getInviteCode(userStore.profile.id)
  records.value = readInvites(userStore.profile.id)
})
// 微信分享携带邀请码，首次注册后建立模拟关系。
onShareAppMessage(() => ({
  title: '邀你一起收花，新人注册可获花礼券',
  path: `/pages/index/index?inviteCode=${encodeURIComponent(inviteCode.value)}`,
  imageUrl: '/static/home/tulip.jpg',
}))
// 测试账户可直接模拟一位好友首次注册，验证发券闭环。
function simulateRegistration() {
  if (userStore.profile?.role !== 'user') return
  // 模拟一个独立的新好友浏览会话。
  uni.removeStorageSync('flower-pending-inviter')
  rememberInvitation(inviteCode.value)
  registerUser(`mock-friend-${userStore.profile.id}-${records.value.length + 1}`, '13800000009')
  records.value = readInvites(userStore.profile.id)
  uni.showToast({ title: '模拟奖励已发放', icon: 'success' })
}
// 复制邀请码供用户分享。
function copyCode() {
  uni.setClipboardData({ data: inviteCode.value })
}
// 打开卡包查看演示奖励券。
function viewCoupons() {
  uni.navigateTo({ url: '/pages/coupons/index' })
}
// 非微信端展示分享入口提示。
function shareTip() {
  uni.showToast({ title: '请在微信小程序内分享，或复制邀请码', icon: 'none' })
}
// 展示邀请活动规则。
function showRules() {
  uni.showModal({
    title: '邀请活动规则',
    content:
      '好友通过邀请首次注册才算有效邀请，仅打开分享、老用户登录或自己邀请自己均不计入。有效邀请后，新用户获得新人券，邀请者获得奖励券。奖励券发放后5天有效，每单限用一张，不抵配送费、不找零、不兑现。当前关系和奖励保存在本地，正式邀请归因由后端处理。',
    showCancel: false,
    confirmColor: '#32845b',
  })
}
</script>

<template>
  <view class="invite-page">
    <view class="intro">
      <text class="eyebrow">花礼，与你分享</text>
      <button class="rules-link" @click="showRules">
        活动规则
        <text class="iconfont icon-youjiantou1" />
      </button>
    </view>
    <view class="hero">
      <view class="hero-copy">
        <text class="hero-title">
          邀好友，
          <text>一起收花</text>
        </text>
        <text class="hero-subtitle">
          分享一份美好
          <text>让心意在鲜花里相遇</text>
        </text>
      </view>
      <image class="hero-image" src="/static/home/tulip.jpg" mode="aspectFill" />
    </view>
    <view class="panel reward-panel">
      <text class="section-title">你送出邀请，我们送上花礼</text>
      <text class="subtitle">好友首次注册，你也可获得一张奖励券</text>
      <view class="reward-row">
        <view>
          <text class="iconfont icon-hua" />
          <text class="reward-title">好友领新人券</text>
          <text class="hint">从第一束花开始</text>
        </view>
        <text class="reward-plus">＋</text>
        <view>
          <text class="iconfont icon-liwuhe" />
          <text class="reward-title">你领奖励券</text>
          <text class="hint">每次有效邀请均可获券</text>
        </view>
      </view>
      <!-- 微信端使用原生分享按钮。 -->
      <!-- #ifdef MP-WEIXIN -->
      <button class="share-button" open-type="share">分享给微信好友</button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <button class="share-button" @click="shareTip">分享给微信好友</button>
      <!-- #endif -->
      <view class="code-row">
        <text class="hint">
          我的邀请码
          <text class="invite-code">{{ inviteCode }}</text>
        </text>
        <button @click="copyCode">复制</button>
      </view>
    </view>
    <view class="panel">
      <text class="section-title">把美好分享，只需三步</text>
      <view class="steps">
        <view v-for="(step, index) in steps" :key="step" class="step">
          <text class="step-number">{{ index + 1 }}</text>
          <text>{{ step }}</text>
        </view>
      </view>
      <text class="hint">奖励按好友首次注册发放，无需等待好友购买</text>
    </view>
    <view class="panel">
      <view class="panel-heading">
        <text class="section-title">我的邀请成果</text>
        <button class="text-link" @click="viewCoupons">
          查看花礼券
          <text class="iconfont icon-youjiantou1" />
        </button>
      </view>
      <view class="statistics">
        <view>
          <text class="stat-value">
            {{ records.length }}
            <text>人</text>
          </text>
          <text class="hint">成功邀请</text>
        </view>
        <view>
          <text class="stat-value">
            {{ records.length }}
            <text>张</text>
          </text>
          <text class="hint">已获奖励券</text>
        </view>
      </view>
    </view>
    <view class="panel">
      <text class="section-title">邀请记录</text>
      <view v-for="record in records" :key="record.id" class="record-row">
        <view class="record-avatar"><text class="iconfont icon-hua" /></view>
        <view class="record-copy">
          <text class="record-name">{{ record.name }}</text>
          <text class="hint">{{ record.date }} 注册</text>
        </view>
        <text class="record-reward">{{ record.reward }}</text>
      </view>
      <text class="record-end">
        {{ records.length ? '已经看到全部邀请啦' : '还没有成功邀请，分享给好友试试' }}
      </text>
    </view>
    <button v-if="userStore.profile?.isTest" class="text-link" @click="simulateRegistration">
      模拟好友首次注册
    </button>
    <text class="demo-note">当前为本地模拟邀请，真实跨设备邀请待接入后端</text>
  </view>
</template>

<style lang="scss" scoped>
@use './invite.scss';
</style>
