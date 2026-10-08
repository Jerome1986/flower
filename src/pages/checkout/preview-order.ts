// 前端模拟订单信息，供确认订单和支付结果页传递数据。
export interface PreviewOrder {
  type?: 'ordinary' | 'custom'
  storeId?: string
  userId?: string
  status?: 'pending' | 'preparing' | 'ready' | 'delivering' | 'completed'
  pickupCode?: string
  // 下单时保存券类型，便于区分兑花与现金抵扣。
  couponType?: 'cash' | 'exchange'
  // 优惠券快照保留名称及规则，后续改券不影响订单。
  couponId?: string
  couponTitle?: string
  // 每份花材支数，按规格保存用于赠花数量核对。
  stemsPerUnit?: number
  // 兑换券赠送的商品金额。
  giftAmount?: number
  // 兑换券赠送的份数。
  giftQuantity?: number
  // 完成核销或配送的时间，用于赠送花礼归属统计。
  fulfilledAt?: string
  // 实际完成核销的门店，赠送花礼按此归属。
  redemptionStoreId?: string
  orderNo: string
  productName: string
  // 商品标识用于模拟门店库存，旧快照可为空。
  productId?: string
  image: string
  specification: string
  unit: string
  quantity: number
  storeName: string
  storeAddress: string
  hours: string
  storePhone: string
  method: 'pickup' | 'delivery'
  contactName: string
  phone: string
  address: string
  remark: string
  total: number
  productAmount: number
  deliveryFee: number
  discount: number
  createdAt: string
}
