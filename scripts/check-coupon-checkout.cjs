const { createHarness, settle, deferred, assert } = require('./integration-harness.cjs')
async function main() {
  const coupon = {
    id: 7,
    name: '新人券',
    type: 'CASH',
    status: 'AVAILABLE',
    cashAmount: 10,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  }
  let available = [coupon],
    failSubmit = false,
    rejectSubmit = false,
    delayedQuote
  const submissions = []
  const payment = { orderId: 'ORD-test', timeStamp: '123', nonceStr: 'nonce', packageValue: 'prepay_id=test', signType: 'RSA', paySign: 'signature' }
  const quote = (input) => ({
    data: {
      productAmount: 3000 * (input.items?.reduce((s, i) => s + i.quantity, 0) || input.quantity),
      discountAmount: input.couponId ? 1000 : 0,
      deliveryFee: 500,
      payableAmount:
        3000 * (input.items?.reduce((s, i) => s + i.quantity, 0) || input.quantity) +
        500 -
        (input.couponId ? 1000 : 0),
    },
  })
  const h = createHarness({
    '@/pages/order-confirm/payment': {
      canRequestWechatPayment: () => true,
      requestWechatPayment: async () => {},
    },
    '@/utils/http': {
      resolveApiImage: (v) => v,
      request: async (options) => {
        if (options.url.endsWith('available-coupons')) return { data: available }
        if (options.url.endsWith('quote'))
          return delayedQuote ? delayedQuote.promise : quote(options.data)
        if (options.url === '/pay/orderPay') return { data: payment }
        if (options.url === '/pay/commonPay') {
          submissions.push(JSON.parse(JSON.stringify(options.data)))
          if (rejectSubmit) throw { statusCode: 409 }
          if (failSubmit) throw Error('lost response')
          return {
            data: payment,
          }
        }
        throw Error(options.url)
      },
    },
    '@/pages/stores/shop-data': {
      getStore: async () => ({ id: '2', name: '花店', open: true }),
      getProduct: async () => ({
        name: '玫瑰',
        image: '/rose.png',
        specs: [{ id: '11', name: '一束', unit: '份', price: 30, available: 10 }],
        methods: ['pickup', 'delivery'],
      }),
    },
    '@/pages/addresses/address-actions': { getAddresses: async () => [] },
  })
  h.account.setToken('user')
  h.account.setProfile({ id: 1, phone: '13800000000', openId: 'wx-user' })
  const p = h.page('checkout')
  await p.enter({ id: '1', storeId: '2', specId: '11', quantity: '1', method: 'delivery' })
  p.name.value = '花友'
  p.address.value = '花园路'
  await Promise.all([p.submit(), p.submit()])
  assert.equal(submissions.length, 0)
  const cart = h.module('stores/modules/cart.ts').useCartStore()
  const first = { ...cart.items[0], couponId: '7' }
  cart.clear()
  cart.add(first, 10)
  cart.add({ ...first, remark: '另一束', couponId: '' }, 10)
  const different = h.page('checkout')
  await different.enter({ id: '1', storeId: '2', specId: '11', quantity: '1', method: 'pickup' })
  different.name.value = '花友'
  const modal = h.uni.showModal
  h.uni.showModal = (options) => options.success({ confirm: false })
  await different.submit()
  assert.equal(cart.items.length, 2)
  assert.equal(cart.items[0].method, 'delivery')
  h.uni.showModal = modal
  const id = cart.begin([cart.items[0].id])
  const confirm = h.page('order-confirm')
  await confirm.enter({ id })
  assert.equal(confirm.couponId.value, '7')
  assert.equal(confirm.quote.value.payableAmount, 2500)
  confirm.showCoupons.value = true
  confirm.chooseCoupon('')
  assert.equal(confirm.showCoupons.value, false)
  await settle()
  assert.equal(confirm.quote.value.payableAmount, 3500)
  confirm.chooseCoupon('7')
  await settle()
  available = []
  await confirm.load()
  assert.equal(confirm.couponId.value, '')
  available = [coupon]
  await confirm.load()
  confirm.chooseCoupon('7')
  await settle()
  failSubmit = true
  await Promise.all([confirm.submit(), confirm.submit()])
  assert.equal(submissions.length, 1)
  assert(cart.confirmation.submission)
  assert.equal(cart.items.length, 2)
  assert.throws(() => cart.remove(cart.items[0].id), /上次提交/)
  const persisted = h.storage.get('flower-cart-v1')
  assert(persisted.includes(submissions[0].requestKey))
  failSubmit = false
  await confirm.submit()
  assert.deepEqual(submissions[0], submissions[1])
  assert.equal(submissions[1].couponId, 7)
  assert.equal(submissions[1].items.length, 1)
  assert.equal(cart.items.length, 1)
  assert.equal(cart.items[0].remark, '另一束')
  await confirm.submit()
  assert.equal(submissions.length, 2)
  assert(h.navigation.url.includes('ORD-test'))
  const nextId = cart.begin(cart.items.map((i) => i.id))
  const next = h.page('order-confirm')
  await next.enter({ id: nextId })
  rejectSubmit = true
  await next.submit()
  assert.equal(cart.confirmation.submission, undefined)
  assert(next.quote.value)
  delayedQuote = deferred()
  const pending = next.load()
  await settle()
  h.account.clearProfile()
  delayedQuote.resolve(quote({ quantity: 1 }))
  await pending
  assert.equal(next.quote.value, undefined)
  assert.equal(next.session.value, undefined)
  h.close()
  console.log(
    'PASS: 选购不建单、确认页选券与报价、提交快照、幂等重试、指定商品移除、409重新确认、账户隔离',
  )
}
main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
