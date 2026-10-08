// 本地收货地址结构，供地址管理和确认订单共用。
export interface Address {
  id: string
  name: string
  phone: string
  region: string
  detail: string
  isDefault: boolean
}
// 按用户读取地址，兼容原测试用户的旧地址。
export function readAddresses(userId?: string): Address[] {
  if (!userId) return []
  return (
    uni.getStorageSync(`flower-addresses-${userId}`) ||
    (userId === 'test-user' ? uni.getStorageSync('flower-addresses') : []) ||
    []
  )
}
// 地址与用户绑定，切换账户不会覆盖别人的地址。
export function saveAddresses(userId: string, addresses: Address[]) {
  uni.setStorageSync(`flower-addresses-${userId}`, addresses)
}
