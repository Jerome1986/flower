import type { UserInfo, UserProfile } from '@/types/user'

// 兼容现有页面角色命名，身份只取自后端返回值。
export const toProfile = (user: UserInfo): UserProfile => ({
  ...user,
  backendRole: user.role,
  role: user.role === 'STORE_MANAGER' ? 'manager' : 'user',
  storeId: user.managedStores[0]?.id ?? null,
  isTest: true,
})
