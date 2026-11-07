import type { CartOrderSubmission } from '@/types/order-api'

/** 沿用 qiansu-wx 的支付参数；orderId 在本项目须为可用于订单详情查询的订单编号。 */
export interface PayResult {
  /** 微信支付秒级时间戳字符串 */
  timeStamp: string
  /** 微信支付随机字符串 */
  nonceStr: string
  /** 微信预支付会话参数，前端映射为 package */
  packageValue: string
  /** 支付签名算法 */
  signType: 'RSA'
  /** 微信支付 RSA 签名 */
  paySign: string
  /** 业务订单标识 */
  orderId: string
}

/** 保留鲜花购物车的完整订单及幂等参数，openid 来自当前用户的 openId。 */
export type PaymentSubmission = CartOrderSubmission & {
  /** 付款人的微信 OpenID */
  openid: string
}
