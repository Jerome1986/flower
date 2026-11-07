<script setup lang="ts">
import { useResource } from '@/composables/use-resource'
import {
  deleteAddress as deleteRemote,
  getAddresses,
  saveAddress as saveRemote,
  setDefaultAddress,
} from '@/pages/addresses/address-actions'
import { useUserStore } from '@/stores/modules/user'
import type { Address } from '@/types/address'
import { integrationMessage } from '@/utils/integration'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
import { resolveLocalAddress } from './address-location'
// 当前用户登录状态，用于地址归属校验和账号切换隔离。
const userStore = useUserStore()
// 地址列表资源，统一管理加载、错误提示及接口待接入状态。
const resource = useResource(getAddresses)
// 当前账户的地址列表，未加载时使用空数组展示。
const addresses = computed(() => resource.data.value || [])
// 地址列表是否正在加载。
const loading = resource.loading
// 地址列表的加载失败或登录提示。
const message = resource.message
// 地址接口是否处于待接入状态。
const pending = resource.pending
// 是否从结算等页面进入地址选择模式。
const selectionMode = ref(false)
// 调用页面传入的已选地址标识，用于高亮当前地址。
const selectedId = ref('')
// 新增或编辑地址弹窗是否可见。
const showEditor = ref(false)
// 当前编辑的地址标识，空字符串表示新增。
const editingId = ref('')
// 表单中的收货人姓名。
const name = ref('')
// 表单中的收货人手机号。
const phone = ref('')
// 表单中的省份或直辖市名称。
const province = ref('')
// 表单中的城市名称，直辖市同样填写市名。
const city = ref('')
// 表单中的区县名称。
const district = ref('')
// 原地址或本地区划匹配得到的行政编码，手动修改地区后清空。
const originalRegionCode = ref<string | null>(null)
// 与行政区划编码对应的省市区快照，用于保存前核对地区是否变化。
let originalRegion = ''
// 街道、小区及用户补充的楼栋、门牌信息。
const detail = ref('')
// 保存时是否将此地址设为默认地址。
const isDefault = ref(false)
// 是否正在执行地址保存、删除或设置默认地址操作。
const busy = ref(false)
// 是否正在选址、解析地区或等待地址覆盖确认。
const locating = ref(false)
// 地图选址或地址解析的失败提示。
const locationError = ref('')
// 选址操作版本号，用于忽略关闭弹窗或切换账号后的过期结果。
let locationVersion = 0
// 表单是否需要禁用输入和保存，防止写入期间发生冲突。
const formBusy = computed(() => busy.value || locating.value)
// 地址写入失败时展示的操作提示。
const mutationError = ref('')
// 根据当前是否编辑已有地址生成弹窗标题。
const editorTitle = computed(() => (editingId.value ? '编辑收货地址' : '新增收货地址'))
// 前往登录页，并保留返回地址页时所需的选择模式参数。
const login = () => {
  uni.navigateTo({
    url:
      '/pages/login/index?returnUrl=' +
      encodeURIComponent('/pages/addresses/index' + (selectionMode.value ? '?select=1' : '')),
  })
}
// 将所选地址回传给打开本页的页面，然后返回。
const selectAddress = (item: Address) => {
  if (!selectionMode.value || !userStore.token || busy.value) return
  // 当前页面栈，用于取得本页与调用页面之间的事件通道。
  const pages = getCurrentPages()
  pages[pages.length - 1].getOpenerEventChannel().emit('addressSelected', item)
  uni.navigateBack()
}
// 打开地址弹窗；传入地址时回显编辑信息，否则初始化新增表单。
const openEditor = (item?: Address) => {
  if (!userStore.token) return login()
  if (busy.value || loading.value || pending.value || !resource.data.value) return
  invalidateLocation()
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
// 非写入期间允许关闭弹窗，同时废弃尚未结束的地图选址结果。
const closeEditor = () => {
  if (!busy.value) {
    showEditor.value = false
    invalidateLocation()
  }
}
// 递增选址版本并重置选址状态，使旧异步回调无法继续回填。
const invalidateLocation = () => {
  locationVersion++
  locating.value = false
  locationError.value = ''
}
// 与旧项目一致直接使用微信原生选址，本地匹配省市区并确认覆盖后回填。
const searchAddress = async () => {
  if (formBusy.value || !showEditor.value || !userStore.token) return
  // 本次选址版本，用于识别被新操作替代的异步结果。
  const version = ++locationVersion
  // 选址开始时的登录凭证，用于验证结果仍属于当前账户。
  const token = userStore.token
  // 判断本次操作是否仍可更新当前打开的表单。
  const active = () => version === locationVersion && showEditor.value && token === userStore.token
  locating.value = true
  locationError.value = ''
  try {
    // 用户在地图中确认的地点名称、文字地址及 GCJ-02 经纬度。
    const selected = await new Promise<UniApp.ChooseLocationSuccess>((resolve, reject) => {
      uni.chooseLocation({ success: resolve, fail: reject })
    })
    if (!active()) return
    // 直接读取地图文字地址，不调用后端逆地址解析，也不依赖地图 Key。
    const {
      region,
      detail: nextDetail,
      complete,
    } = resolveLocalAddress(selected.address || '', selected.name || '')
    if (!nextDetail) throw new Error('未获取到地点地址，请重新选址或手动填写')
    if (nextDetail.length > 500) throw new Error('所选地址过长，请重新选址或手动填写')
    if (detail.value.trim()) {
      // 用户是否同意替换已有详细地址，包括之前手动补充的门牌。
      const confirmed = await new Promise<boolean>((resolve) => {
        uni.showModal({
          title: '替换当前地址？',
          content: '将替换省市区和详细地址，已填写的楼栋、门牌需要重新补充。',
          success: (result) => resolve(result.confirm),
          fail: () => resolve(false),
        })
      })
      if (!confirmed || !active()) return
    }
    province.value = region.province
    city.value = region.city
    district.value = region.district
    originalRegion = [region.province, region.city, region.district].join(' ')
    originalRegionCode.value = region.regionCode
    detail.value = nextDetail
    if (!complete) locationError.value = '已填入地图地址，请核对并补齐省市区及门牌信息'
  } catch (error) {
    if (!active()) return
    // 地图原生错误信息，用于区分主动取消、授权失败和其他异常。
    const message =
      (
        error as {
          errMsg?: string
        }
      )?.errMsg || ''
    if (/cancel/i.test(message)) return
    locationError.value = /auth|deny|denied|permission|privacy/i.test(message)
      ? '未获得位置权限，请允许使用位置信息后重试，或手动填写地址'
      : integrationMessage(error, '选址失败，请重试或手动填写地址')
  } finally {
    if (active()) locating.value = false
  }
}
// 切换表单中的默认地址标记，保存后才提交到服务端。
const toggleDefault = () => {
  if (!busy.value) isDefault.value = !isDefault.value
}
// 统一执行地址写入操作；成功后刷新列表，close 控制是否关闭编辑弹窗。
const mutate = async (action: () => Promise<unknown>, close = false) => {
  if (busy.value || !userStore.token) return
  // 操作开始时的登录凭证，防止结果更新到切换后的账户界面。
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
// 校验完整地址表单，并根据编辑标识执行新增或更新。
const saveAddress = async () => {
  if (formBusy.value) return
  if (!name.value.trim()) return uni.showToast({ title: '请填写收货人', icon: 'none' })
  if (!/^1\d{10}$/.test(phone.value))
    return uni.showToast({ title: '请填写正确的手机号', icon: 'none' })
  if (![province.value, city.value, district.value, detail.value].every((value) => value.trim()))
    return uni.showToast({ title: '请填写完整地址', icon: 'none' })
  // 提交给服务端的地址字段，仅在地区仍匹配时保留行政区划编码。
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
// 将列表中的指定地址设为默认地址，并刷新列表状态。
const setDefault = async (id: string) => {
  await mutate(() => setDefaultAddress(id))
}
// 用户确认后删除指定地址，确认期间切换账号则不再执行。
const deleteAddress = (id: string) => {
  if (busy.value) return
  // 弹出确认框时的登录凭证，用于删除前再次核验账户。
  const token = userStore.token
  uni.showModal({
    title: '删除地址',
    content: '确定删除这个收货地址吗？',
    success: (result) => {
      if (result.confirm && token === userStore.token) void mutate(() => deleteRemote(id))
    },
  })
}
// 读取入口参数，并在地址选择模式下调整导航标题。
onLoad((options) => {
  selectionMode.value = options?.select === '1'
  selectedId.value = options?.selectedId || ''
  if (selectionMode.value) uni.setNavigationBarTitle({ title: '选择收货地址' })
})
// 每次页面显示时重新获取当前账户的地址列表。
onShow(resource.load)
// 页面卸载后使尚未结束的选址操作失效。
onUnload(invalidateLocation)
// 地区发生变化时同步清空旧编码，避免保存不匹配的行政区划信息。
watch(
  [province, city, district],
  () => {
    if (
      [province.value.trim(), city.value.trim(), district.value.trim()].join(' ') !== originalRegion
    )
      originalRegionCode.value = null
  },
  { flush: 'sync' },
)
// 账号切换时清空表单、选择状态和操作提示，避免跨账户残留。
watch(
  () => userStore.token,
  () => {
    invalidateLocation()
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
    editingId.value = ''
    selectedId.value = ''
    isDefault.value = false
  },
  { flush: 'sync' },
)
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
            <input
              :disabled="formBusy"
              v-model="name"
              placeholder="请填写收货人姓名"
              :maxlength="64"
            />
          </view>
          <view class="form-row">
            <text>手机号</text>
            <input
              :disabled="formBusy"
              v-model="phone"
              placeholder="请填写联系电话"
              type="number"
              :maxlength="11"
            />
          </view>
          <!-- #ifdef MP-WEIXIN -->
          <button
            class="search-address-button"
            :loading="locating"
            :disabled="formBusy"
            @click="searchAddress"
          >
            {{ locating ? '正在获取地址…' : '搜索地址' }}
          </button>
          <text class="form-hint">地图选址自动填写省市区和街道小区，再补充楼栋及门牌</text>
          <text v-if="locationError" class="form-hint location-error">{{ locationError }}</text>
          <!-- #endif -->
          <view class="form-row"
            ><text>省份 / 直辖市</text
            ><input
              v-model="province"
              :disabled="formBusy"
              placeholder="如：浙江省"
              :maxlength="64"
          /></view>
          <view class="form-row"
            ><text>城市</text
            ><input
              v-model="city"
              :disabled="formBusy"
              placeholder="如：杭州市（直辖市填市名）"
              :maxlength="64"
          /></view>
          <view class="form-row"
            ><text>区 / 县</text
            ><input
              v-model="district"
              :disabled="formBusy"
              placeholder="如：西湖区"
              :maxlength="64"
          /></view>
          <view class="detail-field">
            <text>详细地址</text>
            <textarea
              :disabled="formBusy"
              v-model="detail"
              placeholder="请补充街道、楼栋、单元及门牌号"
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
        <button class="save-button" :loading="busy" :disabled="formBusy" @click="saveAddress">
          保存地址
        </button>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@use './addresses.scss' as page;
</style>
