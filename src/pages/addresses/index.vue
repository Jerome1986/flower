<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { readAddresses, saveAddresses, type Address } from './address-data'
import { useUserStore } from '@/stores/modules/user'

// 当前用户账户，地址按账户保存。
const userStore = useUserStore()
// 是否从确认订单进入地址选择模式。
const selectionMode = ref(false)
// 当前订单已选地址的标识。
const selectedId = ref('')
// 已保存的本地地址列表。
const addresses = ref<Address[]>([])
// 是否展示地址编辑表单。
const showEditor = ref(false)
// 当前编辑地址的标识，空值表示新增。
const editingId = ref('')
// 收货人姓名。
const name = ref('')
// 收货手机号。
const phone = ref('')
// 收货省、市、区。
const region = ref('')
// 街道、楼栋和门牌号。
const detail = ref('')
// 当前表单是否设为默认地址。
const isDefault = ref(false)
// 编辑表单标题。
const editorTitle = computed(() => (editingId.value ? '编辑收货地址' : '新增收货地址'))

// 读取本地地址，刷新后仍保留编辑结果。
// 读取来源页面的地址选择参数。
onLoad((options) => {
  selectionMode.value = options?.select === '1'
  selectedId.value = options?.selectedId || ''
  if (selectionMode.value) uni.setNavigationBarTitle({ title: '选择收货地址' })
})

onShow(() => {
  addresses.value = readAddresses(
    userStore.profile?.role === 'user' ? userStore.profile.id : undefined,
  )
})
// 将所选地址传回确认订单页面。
function selectAddress(address: Address) {
  // 当前地址页面与来源页面的通信通道。
  const page = getCurrentPages()[getCurrentPages().length - 1]
  page.getOpenerEventChannel().emit('addressSelected', address)
  uni.navigateBack()
}
// 保存地址列表到本地，后续替换为接口。
function persistAddresses() {
  if (userStore.profile?.role === 'user') saveAddresses(userStore.profile.id, addresses.value)
}
// 打开新增或编辑表单。
function openEditor(address?: Address) {
  if (userStore.profile?.role !== 'user')
    return uni.navigateTo({ url: '/pages/test-login/index?returnUrl=%2Fpages%2Faddresses%2Findex' })
  editingId.value = address?.id || ''
  name.value = address?.name || ''
  phone.value = address?.phone || ''
  region.value = address?.region || ''
  detail.value = address?.detail || ''
  isDefault.value = address?.isDefault || !addresses.value.length
  showEditor.value = true
}
// 关闭表单，不保存本次修改。
function closeEditor() {
  showEditor.value = false
}
// 切换表单默认地址选项。
function toggleDefault() {
  isDefault.value = !isDefault.value
}
// 校验输入并保存本地地址。
function saveAddress() {
  if (!name.value.trim()) return uni.showToast({ title: '请填写收货人', icon: 'none' })
  if (!/^1\d{10}$/.test(phone.value))
    return uni.showToast({ title: '请填写正确的手机号', icon: 'none' })
  if (!region.value.trim() || !detail.value.trim())
    return uni.showToast({ title: '请填写完整地址', icon: 'none' })
  // 当前需要保存的地址快照。
  const address: Address = {
    id: editingId.value || `address-${Date.now()}`,
    name: name.value.trim(),
    phone: phone.value,
    region: region.value.trim(),
    detail: detail.value.trim(),
    isDefault: isDefault.value,
  }
  // 更新已有地址或追加新增地址。
  const next = addresses.value
    .filter((item) => item.id !== address.id)
    .map((item) => ({ ...item, isDefault: address.isDefault ? false : item.isDefault }))
  next.push(address)
  if (!next.some((item) => item.isDefault)) next[0].isDefault = true
  addresses.value = next
  persistAddresses()
  closeEditor()
  uni.showToast({ title: '地址已保存', icon: 'success' })
}
// 将指定地址设置为唯一默认地址。
function setDefault(id: string) {
  addresses.value = addresses.value.map((item) => ({ ...item, isDefault: item.id === id }))
  persistAddresses()
}
// 确认后删除指定地址，并保留一个默认地址。
function deleteAddress(id: string) {
  uni.showModal({
    title: '删除地址',
    content: '确定删除这个收货地址吗？',
    confirmText: '删除',
    confirmColor: '#32845b',
    success: (result) => {
      if (!result.confirm) return
      addresses.value = addresses.value.filter((item) => item.id !== id)
      if (addresses.value.length && !addresses.value.some((item) => item.isDefault))
        addresses.value[0].isDefault = true
      persistAddresses()
    },
  })
}
</script>

<template>
  <view class="addresses-page">
    <view class="page-intro">
      <text class="eyebrow">让心意准确送达</text>
      <text class="page-title">我的收花地址</text>
      <text class="subtitle">存好常用地址，下一次收花更轻松</text>
    </view>
    <view v-if="addresses.length" class="address-list">
      <view
        v-for="address in addresses"
        :key="address.id"
        class="address-card"
        :class="{ selected: selectionMode && selectedId === address.id }"
      >
        <view class="contact-row">
          <text class="contact-name">{{ address.name }}</text>
          <text class="contact-phone">{{ address.phone }}</text>
          <text v-if="address.isDefault" class="default-tag">默认</text>
        </view>
        <text class="region-text">{{ address.region }}</text>
        <text class="detail-text">{{ address.detail }}</text>
        <view class="card-footer">
          <button class="default-button" @click="setDefault(address.id)">
            <view class="selection-dot" :class="{ checked: address.isDefault }" />
            <text>{{ address.isDefault ? '默认地址' : '设为默认' }}</text>
          </button>
          <view class="address-actions">
            <button @click="openEditor(address)">编辑</button>
            <button @click="deleteAddress(address.id)">删除</button>
          </view>
        </view>
        <button v-if="selectionMode" class="select-address-button" @click="selectAddress(address)">
          {{ selectedId === address.id ? '使用当前地址' : '选择此地址' }}
        </button>
      </view>
    </view>
    <view v-else class="empty-state">
      <view class="empty-icon"><text class="iconfont icon-address" /></view>
      <text class="empty-title">还没有收花地址</text>
      <text class="subtitle">添加一个地址，让鲜花来到你身边</text>
    </view>
    <text class="demo-note">地址保存在本地，供前端交互预览</text>
    <view class="bottom-bar">
      <button class="add-button" @click="openEditor()">
        <text class="iconfont icon-jiahao" />
        新增收货地址
      </button>
    </view>
    <view v-if="showEditor" class="editor-mask" @click="closeEditor">
      <view class="editor-panel" @click.stop>
        <view class="editor-heading">
          <text class="section-title">{{ editorTitle }}</text>
          <button aria-label="关闭编辑" @click="closeEditor">×</button>
        </view>
        <scroll-view class="editor-body" scroll-y>
          <view class="form-row">
            <text>收货人</text>
            <input v-model="name" placeholder="请填写收货人姓名" maxlength="20" />
          </view>
          <view class="form-row">
            <text>手机号</text>
            <input v-model="phone" placeholder="请填写联系电话" type="number" maxlength="11" />
          </view>
          <view class="form-row">
            <text>省市区</text>
            <input v-model="region" placeholder="如：浙江省 杭州市 西湖区" maxlength="60" />
          </view>
          <view class="detail-field">
            <text>详细地址</text>
            <textarea v-model="detail" placeholder="街道、楼栋及门牌号" maxlength="150" />
          </view>
          <button class="default-toggle" @click="toggleDefault">
            <text>设为默认收货地址</text>
            <view class="toggle-track" :class="{ active: isDefault }"><view /></view>
          </button>
          <text class="form-hint">配送是否可达，以所选门店的服务区域为准</text>
        </scroll-view>
        <button class="save-button" @click="saveAddress">保存地址</button>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@use './addresses.scss';
</style>
