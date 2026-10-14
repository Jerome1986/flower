/** 缺少后端协议时显式拒绝，不猜测 URL，也不回退到本地业务数据。 */
export class IntegrationPendingError extends Error {
  readonly code = 'INTEGRATION_PENDING'
  constructor(feature: string) {
    super(`${feature}暂未开放`)
  }
}
export function pendingIntegration<T>(feature: string): Promise<T> {
  return Promise.reject(new IntegrationPendingError(feature))
}
export function integrationMessage(error: unknown, fallback = '加载失败，请重试') {
  return error instanceof IntegrationPendingError ? error.message : fallback
}
export function isIntegrationPending(error: unknown) {
  return error instanceof IntegrationPendingError
}
