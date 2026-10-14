import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserProfile } from '@/types/user'

// 定义 Store
export const useUserStore = defineStore(
  'user',
  () => {
    // 会员信息
    const profile = ref<UserProfile>()
    const token = ref('')
    const setToken = (value: string) => {
      token.value = value
    }

    // 保存会员信息，登录时使用
    const setProfile = (val: UserProfile) => {
      profile.value = val
    }

    // 清理会员信息，退出时使用
    const clearProfile = () => {
      profile.value = undefined
      token.value = ''
    }

    // 记得 return
    return {
      profile,
      token,
      setToken,
      setProfile,
      clearProfile,
    }
  },
  {
    // 网页端配置
    // persist: true,
    // 小程序端配置
    persist: {
      storage: {
        getItem(key) {
          return uni.getStorageSync(key)
        },
        setItem(key, value) {
          uni.setStorageSync(key, value)
        },
      },
    },
  },
)
