<script setup lang="ts">
import { computed } from 'vue'
import { openAuthPage } from '@/utils/login-return'
import { onShow, onShareAppMessage } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { getInvitationApi as getInvitation } from '@/api/marketing'
import { useResource } from '@/composables/use-resource'
const userStore = useUserStore()
// 请求工具返回包装对象，页面只使用业务数据。
const resource = useResource(async () => (await getInvitation()).data)
const invitation = resource.data
const loading = resource.loading
const message = resource.message
const inviteCode = computed(() => invitation.value?.code || '')
const records = computed(() => invitation.value?.records || [])
const steps = [
  { title: '分享给好友', copy: '把喜欢的花店分享给微信好友' },
  { title: '好友打开小程序', copy: '一起发现喜欢的鲜花' },
  { title: '各自挑选心意', copy: '为日常添一束花，也为彼此送份心意' },
]
onShow(resource.load)
onShareAppMessage(() =>
  invitation.value
    ? {
        title: invitation.value.shareTitle,
        path: invitation.value.sharePath,
        imageUrl: invitation.value.shareImage,
      }
    : { title: '一花一份心意', path: '/pages/index/index' },
)
const login = () => {
  uni.navigateTo({ url: '/pages/login/index?returnUrl=%2Fpages%2Finvite%2Findex' })
}
const copyCode = () => {
  if (!userStore.token) return login()
  if (!inviteCode.value) return
  uni.setClipboardData({ data: inviteCode.value })
}
const viewCoupons = () => {
  openAuthPage('/pages/coupons/index')
}
const shareTip = () => {
  if (!userStore.token) return login()
  uni.showToast({
    title: inviteCode.value ? '请在微信小程序内分享，或复制邀请码' : '请在微信小程序内分享给好友',
    icon: 'none',
  })
}
const showRules = () => {
  if (!invitation.value?.rules) return
  uni.showModal({
    title: '邀请活动规则',
    content: invitation.value.rules,
    showCancel: false,
    confirmColor: '#8a5b14',
  })
}
</script>

<template>
  <view class="invite-page">
    <view v-if="loading || message" class="panel status-panel">
      <text>{{ loading ? '正在加载邀请信息…' : message }}</text>
      <button v-if="!loading && !userStore.token" @click="login">登录查看我的邀请</button>
      <button v-else-if="!loading" @click="resource.load">重新加载</button>
    </view>
    <view class="panel">
      <text class="section-title">美好分享，轻松三步</text>
      <view class="steps">
        <view v-for="(step, index) in steps" :key="step.title" class="step">
          <text class="step-number">0{{ index + 1 }}</text>
          <view class="step-copy"
            ><text class="step-title">{{ step.title }}</text
            ><text class="hint">{{ step.copy }}</text></view
          >
        </view>
      </view>
    </view>
    <view class="panel invitation-card">
      <view class="panel-heading">
        <text class="eyebrow">好花，值得分享</text>
        <button v-if="invitation?.rules" class="text-link" @click="showRules">
          活动规则 <text class="iconfont icon-youjiantou1" />
        </button>
      </view>
      <view class="invitation-heading">
        <text class="hero-title">邀好友，一起收花</text>
        <text class="subtitle">把喜欢分享给朋友<text>让鲜花成为你们日常的小美好</text></text>
      </view>
      <view class="invitation-message">
        <text class="flower-mark iconfont icon-hua" />
        <view class="message-copy">
          <text class="message-title">送你一份关于鲜花的邀请</text>
          <text class="hint">一起选花，把心意带回家</text>
        </view>
      </view>
      <!-- #ifdef MP-WEIXIN -->
      <button class="share-button" open-type="share">分享给微信好友</button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <button class="share-button" @click="shareTip">分享给微信好友</button>
      <!-- #endif -->
      <view v-if="inviteCode" class="code-row">
        <view class="code-copy"
          ><text class="hint">我的邀请码</text
          ><text class="invite-code">{{ inviteCode }}</text></view
        >
        <button class="copy-button" @click="copyCode">复制</button>
      </view>
      <text v-else class="share-note">分享一份喜欢，从一束花开始</text>
    </view>
    <view v-if="invitation" class="panel">
      <view class="panel-heading">
        <text class="section-title">我的邀请</text>
        <button v-if="invitation" class="text-link" @click="viewCoupons">
          查看花礼券 <text class="iconfont icon-youjiantou1" />
        </button>
      </view>
      <template v-if="invitation">
        <view class="statistics">
          <view
            ><text class="stat-value">{{ invitation.invitedCount }}<text>人</text></text
            ><text class="hint">成功邀请</text></view
          >
          <view
            ><text class="stat-value">{{ invitation.rewardCount }}<text>张</text></text
            ><text class="hint">已获奖励券</text></view
          >
        </view>
        <text class="reward-note">奖励及发放条件以活动规则为准</text>
        <view class="records">
          <text class="record-heading">邀请记录</text>
          <view v-for="record in records" :key="record.id" class="record-row">
            <view class="record-copy"
              ><text class="record-name">{{ record.name }}</text
              ><text class="hint">{{ record.date.slice(0, 10) }} 注册</text></view
            >
            <text class="record-reward">{{ record.reward }}</text>
          </view>
          <text v-if="!records.length" class="empty-copy"
            >还没有邀请记录，和好友分享第一份美好吧</text
          >
        </view>
      </template>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@use './invite.scss';
</style>
