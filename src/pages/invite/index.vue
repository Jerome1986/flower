<script setup lang="ts">
import { computed } from 'vue'
import { onShow, onShareAppMessage } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { getInvitationApi as getInvitation } from '@/api/marketing'
import { useResource } from '@/composables/use-resource'
const userStore = useUserStore()
const resource = useResource(getInvitation)
const invitation = resource.data
const inviteCode = computed(() => invitation.value?.code || '')
const records = computed(() => invitation.value?.records || [])
const loading = resource.loading
const message = resource.message
const pending = resource.pending
const steps = ['分享给好友', '好友首次注册', '查看活动奖励']
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
function login() {
  uni.navigateTo({ url: '/pages/test-login/index?returnUrl=%2Fpages%2Finvite%2Findex' })
}
function copyCode() {
  if (inviteCode.value) uni.setClipboardData({ data: inviteCode.value })
}
function viewCoupons() {
  uni.navigateTo({ url: '/pages/coupons/index' })
}
function shareTip() {
  if (invitation.value) uni.showToast({ title: '请在微信小程序内分享，或复制邀请码', icon: 'none' })
}
function showRules() {
  uni.showModal({
    title: '邀请活动规则',
    content: invitation.value?.rules || '邀请活动暂未开放，奖励规则将在开放后展示。',
    showCancel: false,
    confirmColor: '#eed261',
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
    <view v-if="loading || message" class="panel"
      ><text>{{ loading ? '正在加载邀请活动…' : message }}</text
      ><button v-if="!loading && !pending && userStore.token" @click="resource.load">重试</button
      ><button v-if="!userStore.token" @click="login">登录</button></view
    >
    <template v-if="invitation">
      <view class="panel reward-panel">
        <text class="section-title">你送出邀请，我们送上花礼</text>
        <text class="subtitle">{{ invitation.rules }}</text>
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
            <text class="hint">以活动规则为准</text>
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
        <text class="hint">具体奖励及发放条件以活动规则为准</text>
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
              {{ invitation.invitedCount }}
              <text>人</text>
            </text>
            <text class="hint">成功邀请</text>
          </view>
          <view>
            <text class="stat-value">
              {{ invitation.rewardCount }}
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
    </template>
  </view>
</template>

<style lang="scss" scoped>
@use './invite.scss';
</style>
