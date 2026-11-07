import type { PayResult } from '@/api/payment'
// 微信小程序支付能力检查，其他端不发送下单支付请求。
export const canRequestWechatPayment = () => {
  let supported = false
  // #ifdef MP-WEIXIN
  supported = typeof wx !== 'undefined' && typeof wx.requestPayment === 'function'
  // #endif
  return supported
}
// 与 qiansu-wx 保持一致，将后端 packageValue 映射为微信要求的 package 字段。
export const requestWechatPayment = (payment: PayResult): Promise<void> => {
  if (
    ![payment.timeStamp, payment.nonceStr, payment.packageValue, payment.paySign].every(
      (value) => typeof value === 'string' && value.trim(),
    ) ||
    payment.signType !== 'RSA'
  ) {
    return Promise.reject(new Error('支付参数不完整，请重试'))
  }
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    return wx.requestPayment({
      timeStamp: payment.timeStamp,
      nonceStr: payment.nonceStr,
      package: payment.packageValue,
      signType: payment.signType,
      paySign: payment.paySign,
      success: () => resolve(),
      fail: reject,
    })
    // #endif
    reject(new Error('请在微信小程序中支付'))
  })
}
