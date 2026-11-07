/** 用户资料更新输入，只包含允许编辑的字段。 */
export interface UpdateProfileInput {
  /** 用户昵称。 */
  nickname: string
  /** 年龄，未填写时为空。 */
  age: number | null
  /** 性别编码，沿用服务端字段。 */
  gender: number
}

/** 小程序用户身份：店长可管理多家门店，并保留普通用户购买能力。 */
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  STORE_MANAGER = 'STORE_MANAGER',
}

/** 用户接口公共字段，日期通过 JSON 返回为字符串。 */
export interface UserInfo {
  /** 记录编号 */
  id: number
  /** 平台录入的店长在首次微信授权前为空。 */
  openId: string | null
  /** 联系电话 */
  phone: string
  /** 账号角色 */
  role: UserRole
  /** 昵称 */
  nickname: string | null
  /** 年龄 */
  age?: number | null
  /** 性别 */
  gender?: number
  /** 头像地址 */
  avatar: string | null
  /** 邀请码 */
  inviteCode: string
  /** 是否启用 */
  enabled: boolean
  /** 注册时间 */
  registeredAt: string
  /** 最近登录时间 */
  lastLoginAt: string | null
  /** 最近更新时间 */
  updatedAt: string
  /** 关联字段仅在接口加载门店时返回。 */
  managedStores?: {
    /** 记录编号 */
    id: number
    /** 名称 */
    name: string
  }[]
}

/** 微信登录响应。 */
export interface WxLoginResponse {
  /** 登录令牌 */
  token: string
  /** 用户资料 */
  user: UserInfo
}
