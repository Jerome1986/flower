import type { CouponItem } from '@/types/coupon'
import type { OrderQuote } from '@/types/order-api'
// 页面金额预览，统一以分计算；优惠仅抵扣商品金额。
export const couponAmount = (quote: OrderQuote, coupon?: CouponItem, unitPrice = 0) => {
  // 扣除已有优惠后可继续抵扣的商品金额（分）。
  const remaining = Math.max(0, quote.productAmount - quote.discountAmount)
  // 按券类型计算的可抵扣金额（分）。
  const amount = coupon
    ? coupon.type === 'CASH'
      ? Math.round(Number(coupon.cashAmount) * 100)
      : Math.round(unitPrice * 100) * (coupon.exchangeQuantity || 1)
    : 0
  // 限制在剩余商品金额内的本次实际优惠（分）。
  const discount = Math.min(remaining, Number.isFinite(amount) ? Math.max(0, amount) : 0)
  return {
    discountAmount: quote.discountAmount + discount,
    payableAmount: Math.max(0, quote.payableAmount - discount),
  }
}
