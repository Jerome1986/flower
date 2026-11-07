export type { AddressInput } from './address'
export type { Bouquet } from './bouquet'
export type { SalesQuery, SalesSummary } from './sales'
import type { Coupon, CouponItem } from './coupon'
import type { InviteRecord } from './invite'
import type { OrderQuote } from './order-api'

/** 以下为前端需求模型，不是已确认的后端请求/响应协议。金额注明单位。 */
export interface CouponWallet {
  /** 优惠券列表 */
  coupons: Coupon[]
  /** 使用或活动规则 */
  rules: string
}
/** 新人花礼状态，与后端查询和领取接口保持一致。 */
export interface NewcomerGift {
  /** 营销活动 */
  activity: {
    /** 记录编号 */
    id: number
    /** 名称 */
    name: string
  } | null
  /** 活动是否可用 */
  activityAvailable: boolean
  /** 是否具有领取资格 */
  eligible: boolean
  /** 领取资格截止时间 */
  claimDeadline: string
  /** 是否已经领取 */
  claimed: boolean
  /** 是否允许领取 */
  canClaim: boolean
  /** 原因编码 */
  reasonCode: string | null
  /** 原因说明 */
  reason: string | null
  /** 用户优惠券 */
  coupon: CouponItem | null
  /** 本次是否新领取奖励 */
  newlyClaimed?: boolean
}
/** 当前登录用户邀请活动摘要，对应 GET /user/invitations。 */
export interface InvitationSummary {
  /** 当前用户的邀请码。 */
  code: string
  /** 微信好友分享标题。 */
  shareTitle: string
  /** 携带邀请码的首页落地路径。 */
  sharePath: string
  /** 可选分享图片。 */
  shareImage?: string
  /** 当前服务端活动规则。 */
  rules: string
  /** 实际绑定的好友人数。 */
  invitedCount: number
  /** 实际发出的奖励券总张数，含历史已用和过期券。 */
  rewardCount: number
  /** 本人邀请记录，不包含好友手机号。 */
  records: InviteRecord[]
}
/** 定制选购参数。 */
export interface CustomSelection {
  /** 选择的用户优惠券编号，不传表示不用券。 */
  couponId?: number
  /** 定制花束编号 */
  bouquetId: string
  /** 商品规格编号 */
  specId: string
  /** 商品份数 */
  quantity: number
  /** 地址 */
  address: string
}
/** 定制提交参数。 */
export interface CustomSubmission extends CustomSelection {
  /** 客户端提交幂等键 */
  requestKey: string
  /** 联系人姓名 */
  contactName: string
  /** 联系人手机号 */
  contactPhone: string
  /** 备注 */
  remark: string
  /** 客户端确认的应付金额（分） */
  expectedAmount: number
}
/** 定制报价。 */
export type CustomQuote = OrderQuote // 金额为分，与普通订单报价一致。

/** 优惠券订单输入。 */
export interface CouponOrderInput {
  /** 用户优惠券编号 */
  couponId: string
}
