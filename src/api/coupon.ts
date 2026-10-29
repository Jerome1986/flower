import { request } from '@/utils/http'
import type { CouponItem } from '@/types/coupon'

// 获取当前用户的优惠券。
export const getUserCouponsApi = (userId: number) => {
  return request<CouponItem[]>({
    method: 'GET',
    url: `/coupon/${userId}`,
  })
}
