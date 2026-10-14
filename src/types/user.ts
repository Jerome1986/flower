export interface UserInfo {
  id: number
  phone: string
  nickname: string | null
  role: 'CUSTOMER' | 'STORE_MANAGER'
  managedStores: { id: number; name: string }[]
}

export interface UserProfile extends Omit<UserInfo, 'role'> {
  role: 'user' | 'manager'
  backendRole: UserInfo['role']
  storeId: number | null
  isTest: boolean
}
