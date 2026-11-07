const { createHarness, assert, deferred, settle } = require('./integration-harness.cjs')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const pay = { orderId: 'F001', timeStamp: '123', nonceStr: 'nonce', packageValue: 'prepay_id=test', signType: 'RSA', paySign: 'signature' }

async function setup(amount = 3000) {
  const calls = []
  let payment = async () => {}, common = async () => ({ data: pay }), supported = true
  const h = createHarness({
    '@/api/orders': { quoteOrderApi: async () => ({ data: { productAmount: 3000, discountAmount: 3000 - amount, deliveryFee: 0, payableAmount: amount } }) },
    '@/api/marketing': { getAvailableCouponsApi: async () => ({ data: [] }) },
    '@/api/payment': {
      commonPayApi: async input => { calls.push(['create', input]); return common() },
      orderPayApi: async (id, openid) => { calls.push(['retry', id, openid]); return { data: pay } },
      createOrderFreeApi: async input => { calls.push(['free', input]); return { data: { orderId: 'FREE001' } } },
    },
    '@/pages/order-confirm/payment': {
      canRequestWechatPayment: () => supported,
      requestWechatPayment: async data => { calls.push(['native', data]); return payment() },
    },
  })
  h.account.setProfile({ id: 1, openId: 'wx-user' })
  h.account.setToken('a')
  const cart = h.module('stores/modules/cart.ts').useCartStore()
  cart.add({ storeId: '2', productId: '1', specId: '11', storeName: '花店', productName: '玫瑰', image: '', specName: '一束', unit: '份', unitPrice: 3000, quantity: 1, method: 'pickup', contactName: '花友', contactPhone: '13800000000', address: '', remark: '', couponId: '' }, 5)
  const id = cart.begin([cart.items[0].id])
  const p = h.page('order-confirm')
  await p.enter({ id })
  return { h, p, cart, calls, set payment(fn) { payment = fn }, set common(fn) { common = fn }, set supported(value) { supported = value } }
}
async function main() {
  // 独立核验原生参数映射、成功/取消回调和缺失参数拦截。
  const mod = { exports: {} }
  let native
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/pages/order-confirm/payment.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { module: mod, exports: mod.exports, wx: { requestPayment: options => { native = options } }, Error })
  assert.equal(mod.exports.canRequestWechatPayment(), true)
  const nativeSuccess = mod.exports.requestWechatPayment(pay)
  assert.equal(native.package, pay.packageValue)
  for (const key of ['timeStamp', 'nonceStr', 'signType', 'paySign']) assert.equal(native[key], pay[key])
  native.success()
  await nativeSuccess
  const nativeCancel = mod.exports.requestWechatPayment(pay)
  native.fail({ errMsg: 'requestPayment:fail cancel' })
  await assert.rejects(nativeCancel)
  await assert.rejects(mod.exports.requestWechatPayment({ ...pay, paySign: '' }))

  const a = await setup()
  a.payment = async () => { throw { errMsg: 'requestPayment:fail cancel' } }
  await a.p.submit()
  assert.equal(a.cart.confirmation.orderNo, 'F001')
  assert.equal(a.cart.items.length, 0)
  assert.equal(a.h.navigation, undefined)
  assert.match(a.p.error.value, /取消支付/)
  assert.equal(a.calls[0][1].openid, 'wx-user')
  a.payment = async () => {}
  await a.p.submit()
  assert.equal(a.calls.filter(c => c[0] === 'create').length, 1)
  assert.equal(a.calls.filter(c => c[0] === 'retry').length, 1)
  assert(a.h.navigation.url.endsWith('orderNo=F001'))
  a.h.close()

  const b = await setup(0)
  await b.p.submit()
  assert.deepEqual(b.calls.map(c => c[0]), ['free'])
  assert(b.h.navigation.url.endsWith('orderNo=FREE001'))
  b.h.close()

  const c = await setup()
  c.common = async () => { throw new Error('timeout') }
  await c.p.submit()
  const key = c.cart.confirmation.submission.requestKey
  c.common = async () => ({ data: pay })
  await c.p.submit()
  assert.equal(c.calls.filter(v => v[0] === 'create')[1][1].requestKey, key)
  c.h.close()

  const d = await setup()
  const slow = deferred()
  d.payment = () => slow.promise
  const waiting = d.p.submit()
  await settle()
  await d.p.submit()
  assert.equal(d.calls.filter(v => v[0] === 'native').length, 1)
  d.h.account.setToken('other')
  slow.resolve()
  await waiting
  assert.equal(d.h.navigation, undefined)
  d.h.close()

  const e = await setup()
  e.supported = false
  await e.p.submit()
  assert.equal(e.calls.length, 0)
  e.supported = true
  e.h.account.setProfile({ id: 1, openId: null })
  await e.p.submit()
  assert.equal(e.calls.length, 0)
  e.h.close()
  console.log('PASS: 旧项目支付参数映射、取消后续付、零元订单、幂等重试、重复点击、账号隔离及微信登录校验')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
