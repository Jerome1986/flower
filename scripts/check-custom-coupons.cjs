const { createHarness, assert, deferred } = require('./integration-harness.cjs')

async function main() {
  const coupon = { id: 7, name: '花束券', type: 'CASH', cashAmount: '10', expiresAt: '2026-12-01' }
  let list = [coupon], fail = false, pending
  const bodies = []
  const h = createHarness({
    '@/api/bouquets': {
      getBouquetApi: async () => ({ data: { id: 1, name: '花束', maxQuantity: 999, images: [],
        specs: [{ id: 11, name: '大束', unit: '束', price: 5000 }] } }),
      getCustomCouponsApi: async () => ({ data: list }),
      quoteCustomApi: async (input) => {
        if (fail) throw Error('报价失败')
        return pending ? pending.promise : { data: { productAmount: 5000, deliveryFee: 500,
          discountAmount: input.couponId ? 1000 : 0, payableAmount: input.couponId ? 4500 : 5500 } }
      },
      submitCustomApi: async (input) => { bodies.push({ ...input }); throw Error('结果未知') },
    },
    '@/pages/addresses/address-actions': { getAddresses: async () => [] },
  })
  h.account.setToken('user-a')
  const p = h.page('custom-checkout')
  await p.enter({ id: '1', specId: '11', quantity: '1' })
  p.applyAddress({ name: '花友', phone: '13800000000', region: '浙江 杭州', detail: '花园路' })
  await p.chooseCoupon()
  assert.equal(p.showCoupons.value, true)
  await p.selectCoupon(7)
  assert.equal(p.quote.value.payableAmount, 4500)
  assert.equal(p.couponLabel.value, '花束券')
  await p.selectCoupon()
  assert.equal(p.quote.value.payableAmount, 5500)
  await p.selectCoupon(7)
  list = []
  await p.refreshQuote()
  assert.equal(p.couponId.value, undefined)
  assert.equal(p.quote.value.payableAmount, 5500)
  assert(p.quoteMessage.value.includes('已不可用'))
  list = [coupon]
  fail = true
  await p.selectCoupon(7)
  assert.equal(p.quote.value, undefined)
  fail = false
  await p.refreshQuote()
  await p.submit()
  assert.equal(bodies[0].couponId, 7)
  assert.equal(bodies[0].expectedAmount, 4500)
  await p.selectCoupon()
  assert.equal(p.couponId.value, 7)
  await p.submit()
  assert.deepEqual(bodies[0], bodies[1])
  h.account.setToken('user-b')
  assert.equal(p.couponId.value, undefined)
  assert.equal(p.coupons.value.length, 0)
  assert.equal(p.submission.value, undefined)
  p.applyAddress({ name: '花友', phone: '13800000000', region: '浙江', detail: '新地址' })
  pending = deferred()
  const old = p.selectCoupon(7)
  h.account.setToken('user-c')
  pending.resolve({ data: { payableAmount: 1 } })
  await old
  assert.equal(p.quote.value, undefined)
  assert.equal(p.couponId.value, undefined)
  h.close()
  console.log('PASS: 定制选券/不用券、服务端报价、失效券回退、报价失败、提交锁定与幂等、账号隔离')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
