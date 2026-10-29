import type { CouponItem } from '@/types/coupon'
import type { OrderQuote } from '@/types/order-api'

// 页面金额预览，统一以分计算；优惠仅抵扣商品金额。
export function couponAmount(quote: OrderQuote, coupon?: CouponItem, unitPrice = 0) {
  const remaining = Math.max(0, quote.productAmount - quote.discountAmount)
  const amount = coupon
    ? coupon.type === 'CASH'
      ? Math.round(Number(coupon.cashAmount) * 100)
      : Math.round(unitPrice * 100) * (coupon.exchangeQuantity || 1)
    : 0
  const discount = Math.min(remaining, Number.isFinite(amount) ? Math.max(0, amount) : 0)
  return {
    discountAmount: quote.discountAmount + discount,
    payableAmount: Math.max(0, quote.payableAmount - discount),
  }
}
