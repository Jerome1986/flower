import type { Address } from '@/types/address'
// 旧版本本地地址缓存的兼容读写工具；当前地址管理页通过接口读写地址。
// 按用户标识读取本地缓存；未传标识时返回空列表，测试用户兼容旧缓存键。
export const readAddresses = (userId?: string): Address[] => {
  if (!userId) return []
  return (
    uni.getStorageSync(`flower-addresses-${userId}`) ||
    (userId === 'test-user' ? uni.getStorageSync('flower-addresses') : []) ||
    []
  )
}
// 按用户标识写入本地地址缓存，避免切换账户时覆盖其他用户的数据。
export const saveAddresses = (userId: string, addresses: Address[]) => {
  uni.setStorageSync(`flower-addresses-${userId}`, addresses)
}
