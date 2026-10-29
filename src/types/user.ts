/** 小程序用户身份：店长可管理多家门店，并保留普通用户购买能力。 */
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  STORE_MANAGER = 'STORE_MANAGER',
}

/** 用户接口公共字段，日期通过 JSON 返回为字符串。 */
export interface UserInfo {
  id: number
  /** 平台录入的店长在首次微信授权前为空。 */
  openId: string | null
  phone: string
  role: UserRole
  nickname: string | null
  age?: number | null
  gender?: number
  avatar: string | null
  inviteCode: string
  enabled: boolean
  registeredAt: string
  lastLoginAt: string | null
  updatedAt: string
  /** 关联字段仅在接口加载门店时返回。 */
  managedStores?: { id: number; name: string }[]
}

export interface WxLoginResponse {
  token: string
  user: UserInfo
}
