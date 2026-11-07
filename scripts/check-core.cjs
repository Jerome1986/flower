// 不连接真实接口或数据库；微信能力和支付结果均使用隔离模拟。
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const scripts = [
  'check-login.cjs', 'check-shopping.cjs', 'check-address-flow.cjs', 'check-address-location.cjs',
  'check-coupon-checkout.cjs', 'check-cart.cjs', 'check-user-orders.cjs',
  'check-custom-flow.cjs', 'check-manager-flow.cjs',
  'check-cart-address.cjs', 'check-invitation.cjs', 'check-custom-coupons.cjs',
  'check-order-confirm-payment.cjs', 'check-custom-payment.cjs',
  'check-failure-recovery.cjs',
]
for (const script of scripts) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit', windowsHide: true })
  if (result.error || result.status !== 0) {
    console.error(`FAIL: ${script}`, result.error?.message || '')
    process.exit(1)
  }
}
console.log(`PASS: ${scripts.length} 组核心流程隔离回归（含用户、店长、邀请及支付）`)
