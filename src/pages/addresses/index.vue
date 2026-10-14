<script setup lang="ts">
import type { Address } from '@/types/address'
import { computed, ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { useResource } from '@/composables/use-resource'
import {
  getAddresses,
  saveAddress as saveRemote,
  deleteAddress as deleteRemote,
  setDefaultAddress,
} from '@/pages/addresses/address-actions'
import { integrationMessage } from '@/utils/integration'
const userStore = useUserStore()
const resource = useResource(getAddresses)
const addresses = computed(() => resource.data.value || [])
const loading = resource.loading
const message = resource.message
const pending = resource.pending
const selectionMode = ref(false)
const selectedId = ref('')
const showEditor = ref(false)
const editingId = ref('')
const name = ref('')
const phone = ref('')
const province = ref('')
const city = ref('')
const district = ref('')
const originalRegionCode = ref<string | null>(null)
let originalRegion = ''
const detail = ref('')
const isDefault = ref(false)
const busy = ref(false)
const mutationError = ref('')
const editorTitle = computed(() => (editingId.value ? '编辑收货地址' : '新增收货地址'))
onLoad((options) => {
  selectionMode.value = options?.select === '1'
  selectedId.value = options?.selectedId || ''
  if (selectionMode.value) uni.setNavigationBarTitle({ title: '选择收货地址' })
})
onShow(resource.load)
watch(
  () => userStore.token,
  () => {
    showEditor.value = false
    busy.value = false
    mutationError.value = ''
    name.value = ''
    phone.value = ''
    province.value = ''
    city.value = ''
    district.value = ''
    originalRegionCode.value = null
    originalRegion = ''
    detail.value = ''
  },
  { flush: 'sync' },
)
function login() {
  uni.navigateTo({
    url:
      '/pages/test-login/index?returnUrl=' +
      encodeURIComponent('/pages/addresses/index' + (selectionMode.value ? '?select=1' : '')),
  })
}
function selectAddress(item: Address) {
  if (!selectionMode.value || !userStore.token || busy.value) return
  const pages = getCurrentPages()
  pages[pages.length - 1].getOpenerEventChannel().emit('addressSelected', item)
  uni.navigateBack()
}
function openEditor(item?: Address) {
  if (!userStore.token) return login()
  if (busy.value || loading.value || pending.value || !resource.data.value) return
  editingId.value = item?.id || ''
  name.value = item?.name || ''
  phone.value = item?.phone || ''
  province.value = item?.province || ''
  city.value = item?.city || ''
  district.value = item?.district || ''
  originalRegion = [province.value, city.value, district.value].join(' ')
  originalRegionCode.value = item?.regionCode || null
  detail.value = item?.detail || ''
  isDefault.value = item?.isDefault || !addresses.value.length
  mutationError.value = ''
  showEditor.value = true
}
function closeEditor() {
  if (!busy.value) showEditor.value = false
}
function toggleDefault() {
  if (!busy.value) isDefault.value = !isDefault.value
}
async function mutate(action: () => Promise<unknown>, close = false) {
  if (busy.value || !userStore.token) return
  const token = userStore.token
  busy.value = true
  mutationError.value = ''
  try {
    await action()
    if (token !== userStore.token) return
    if (close) showEditor.value = false
    uni.showToast({ title: '操作成功', icon: 'success' })
    await resource.load()
  } catch (error) {
    if (token === userStore.token)
      mutationError.value = integrationMessage(error, '保存失败，请重试')
  } finally {
    if (token === userStore.token) busy.value = false
  }
}
async function saveAddress() {
  if (!name.value.trim()) return uni.showToast({ title: '请填写收货人', icon: 'none' })
  if (!/^1\d{10}$/.test(phone.value))
    return uni.showToast({ title: '请填写正确的手机号', icon: 'none' })
  if (![province.value, city.value, district.value, detail.value].every((value) => value.trim()))
    return uni.showToast({ title: '请填写完整地址', icon: 'none' })
  const input = {
    name: name.value.trim(),
    phone: phone.value,
    province: province.value.trim(),
    city: city.value.trim(),
    district: district.value.trim(),
    regionCode:
      [province.value.trim(), city.value.trim(), district.value.trim()].join(' ') === originalRegion
        ? originalRegionCode.value || ''
        : '',
    detail: detail.value.trim(),
    isDefault: isDefault.value,
  }
  await mutate(() => saveRemote(editingId.value, input), true)
}
async function setDefault(id: string) {
  await mutate(() => setDefaultAddress(id))
}
function deleteAddress(id: string) {
  if (busy.value) return
  const token = userStore.token
  uni.showModal({
    title: '删除地址',
    content: '确定删除这个收货地址吗？',
    success: (result) => {
      if (result.confirm && token === userStore.token) void mutate(() => deleteRemote(id))
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
    <view v-if="loading || message" class="empty-state"
      ><text>{{ loading ? '正在加载地址…' : message }}</text
      ><button v-if="!loading && !pending && userStore.token" @click="resource.load">重试</button
      ><button v-if="!userStore.token" @click="login">登录</button></view
    >
    <view v-else-if="addresses.length" class="address-list">
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
    <text class="demo-note">地址保存到当前账户；配送是否可达以门店服务区域为准</text>
    <text v-if="mutationError" class="demo-note">{{ mutationError }}</text>
    <view class="bottom-bar">
      <button
        class="add-button"
        :disabled="loading || pending || busy || (!!userStore.token && !resource.data.value)"
        @click="openEditor()"
      >
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
            <input :disabled="busy" v-model="name" placeholder="请填写收货人姓名" :maxlength="64" />
          </view>
          <view class="form-row">
            <text>手机号</text>
            <input
              :disabled="busy"
              v-model="phone"
              placeholder="请填写联系电话"
              type="number"
              :maxlength="11"
            />
          </view>
          <view class="form-row"
            ><text>省份 / 直辖市</text
            ><input v-model="province" :disabled="busy" placeholder="如：浙江省" :maxlength="64"
          /></view>
          <view class="form-row"
            ><text>城市</text
            ><input
              v-model="city"
              :disabled="busy"
              placeholder="如：杭州市（直辖市填市名）"
              :maxlength="64"
          /></view>
          <view class="form-row"
            ><text>区 / 县</text
            ><input v-model="district" :disabled="busy" placeholder="如：西湖区" :maxlength="64"
          /></view>
          <view class="detail-field">
            <text>详细地址</text>
            <textarea
              :disabled="busy"
              v-model="detail"
              placeholder="街道、楼栋及门牌号"
              :maxlength="500"
            />
          </view>
          <button class="default-toggle" @click="toggleDefault">
            <text>设为默认收货地址</text>
            <view class="toggle-track" :class="{ active: isDefault }"><view /></view>
          </button>
          <text class="form-hint">配送是否可达，以所选门店的服务区域为准</text>
        </scroll-view>
        <text v-if="mutationError" class="form-hint">{{ mutationError }}</text>
        <button class="save-button" :loading="busy" :disabled="busy" @click="saveAddress">
          保存地址
        </button>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@use './addresses.scss';
</style>
