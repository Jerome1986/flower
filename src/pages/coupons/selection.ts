// 跨 tab 传递一次选券意图，不持久化优惠券数据。
let selection: { userId: number; couponId: number } | undefined

export function rememberCoupon(userId: number, couponId: number) {
  selection = { userId, couponId }
}

export function takeCoupon(userId?: number) {
  const couponId = selection?.userId === userId ? selection?.couponId : undefined
  selection = undefined
  return couponId
}
