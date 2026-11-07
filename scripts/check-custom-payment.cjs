const { createHarness, assert } = require('./integration-harness.cjs')

async function setup(amount = 5000) {
  let cancel = true
  const calls = []
  const h = createHarness({
    '@/pages/bouquets/bouquet-data': { getBouquet: async () => ({ maxQuantity: 999, specs: [{ id: '11' }] }) },
    '@/pages/custom-checkout/bouquet-checkout': {
      customCheckoutEnabled: true,
      getCustomCoupons: async () => [],
      quoteCustom: async () => ({ productAmount: amount, discountAmount: 0, deliveryFee: 0, payableAmount: amount }),
      submitCustom: async (input) => { calls.push(['create', input]); return { orderNo: 'CUSTOM-1' } },
    },
    '@/pages/addresses/address-actions': { getAddresses: async () => [] },
    '@/api/payment': { orderPayApi: async (no, openid) => {
      calls.push(['pay', no, openid]); return { data: { orderId: no } }
    } },
    '@/pages/order-confirm/payment': {
      canRequestWechatPayment: () => true,
      requestWechatPayment: async () => { calls.push(['native']); if (cancel) throw { errMsg: 'requestPayment:fail cancel' } },
    },
  })
  h.account.setToken('user-a')
  h.account.setProfile({ openId: 'openid' })
  const page = h.page('custom-checkout')
  await page.enter({ id: '1', specId: '11', quantity: '1' })
  page.applyAddress({ name: '花友', phone: '13800000000', region: '浙江', detail: '地址' })
  await page.refreshQuote()
  return { h, page, calls, succeed: () => { cancel = false } }
}

async function main() {
  const f = await setup()
  await f.page.submit()
  assert(f.page.quoteMessage.value.includes('已取消支付'))
  assert.equal(f.page.createdOrderNo.value, 'CUSTOM-1')
  assert.equal(f.page.submitting.value, false)
  f.succeed()
  await f.page.submit()
  assert.equal(f.calls.filter(([name]) => name === 'create').length, 1)
  assert.deepEqual(f.calls.filter(([name]) => name === 'pay').map((row) => row.slice(1)), [
    ['CUSTOM-1', 'openid'], ['CUSTOM-1', 'openid'],
  ])
  assert(f.h.navigation.url.includes('payment-result/index?orderNo=CUSTOM-1'))
  f.h.close()
  const free = await setup(0)
  await free.page.submit()
  assert.equal(free.calls.filter(([name]) => name === 'pay' || name === 'native').length, 0)
  assert(free.h.navigation.url.includes('orderNo=CUSTOM-1'))
  free.h.close()
  console.log('PASS: 定制建单后支付、取消保留订单、原单续付不重复建单、零元不调微信')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
