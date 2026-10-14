import { ref, shallowRef, watch } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { integrationMessage, isIntegrationPending } from '@/utils/integration'

/** 账户隔离、最后一次请求生效，未接入与失败/空数据分别展示。 */
export function useResource<T>(fetcher: () => Promise<T>, authenticated = true) {
  const user = useUserStore()
  const data = shallowRef<T>()
  const loading = ref(false)
  const message = ref('')
  const pending = ref(false)
  let version = 0
  function reset() {
    version++
    data.value = undefined
    loading.value = false
    message.value = ''
    pending.value = false
  }
  function fail(error: unknown) {
    pending.value = isIntegrationPending(error)
    message.value = integrationMessage(error)
  }
  async function load() {
    const current = ++version
    const token = user.token
    data.value = undefined
    message.value = ''
    pending.value = false
    loading.value = false
    if (authenticated && !token) {
      message.value = '请先登录'
      return
    }
    loading.value = true
    try {
      const result = await fetcher()
      if (current === version && token === user.token) data.value = result
    } catch (error) {
      if (current === version && token === user.token) fail(error)
    } finally {
      if (current === version) loading.value = false
    }
  }
  watch(() => user.token, reset, { flush: 'sync' })
  onUnload(reset)
  return { data, loading, message, pending, load, reset, fail }
}
