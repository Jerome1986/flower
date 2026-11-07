import type { RequestFailure } from '@/types/http'

/** 从网络或微信回调异常中读取可安全判断的状态和提示。 */
export const getRequestFailure = (error: unknown): RequestFailure => {
  if (!error || typeof error !== 'object') return { statusCode: 0 }
  const statusCode =
    'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 0
  const errMsg = 'errMsg' in error && typeof error.errMsg === 'string' ? error.errMsg : undefined
  return { statusCode, errMsg }
}
