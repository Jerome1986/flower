const { createHarness, deferred, settle, assert } = require('./integration-harness.cjs')

async function main() {
  let maxQuantity = 3
  let disabled = false
  let quotes = 0
  let delayedQuote
  let failSubmit = true
  const bodies = []
  const item = () => ({ id: 1, name: '花束', coverImage: '', images: [], description: '', deliveryFee: 500, businessHours: '9-18', servicePhone: '13800000001', maxQuantity,
    specs: [{ id: 11, name: '大束', unit: '束', price: 9000 }, { id: 12, name: '小束', unit: '束', price: 5000 }] })
  const h = createHarness({
    '@/api/payment': { orderPayApi: async () => ({ data: { orderId: 'CUSTOM-1' } }) },
    '@/pages/order-confirm/payment': { canRequestWechatPayment: () => true, requestWechatPayment: async () => {} },
    '@/api/bouquets': {
      getCustomCouponsApi: async () => ({ data: [] }),
      getBouquetsApi: async () => ({ data: [item()] }),
      getBouquetApi: async () => { if (disabled) throw new Error('下架'); return { data: item() } },
      quoteCustomApi: async (input) => {
        quotes++
        assert.equal(input.bouquetId, 1)
        assert.equal(input.specId, 12)
        return delayedQuote ? delayedQuote.promise : { data: { productAmount: 5000, deliveryFee: 500, discountAmount: 0, payableAmount: 5500 } }
      },
      submitCustomApi: async (input) => {
        bodies.push(JSON.parse(JSON.stringify(input)))
        assert.equal(input.storeId, undefined)
        if (failSubmit) throw new Error('网络中断')
        return { data: { orderNo: 'CUSTOM-1', type: 'CUSTOM', method: 'DELIVERY', status: 'PENDING_DISPATCH', paymentStatus: 'NOT_REQUIRED', payableAmount: input.expectedAmount, productAmount: 5000, deliveryFee: 500, discountAmount: 0 } }
      },
    },
    '@/pages/addresses/address-actions': { getAddresses: async () => [] },
  })
  const list = h.page('bouquets')
  await list.enter()
  assert.equal(list.bouquets.value[0].price, 50)
  assert.equal(list.bouquets.value[0].specification, '小束')
  const detail = h.page('bouquet-detail')
  await detail.enter({ id: '1', specId: '12' })
  detail.increaseQuantity(); detail.increaseQuantity(); detail.increaseQuantity()
  assert.equal(detail.quantity.value, 3)
  maxQuantity = 1
  await detail.show()
  assert.equal(detail.quantity.value, 1)
  detail.buyNow()
  assert(h.navigation.url.includes('/pages/login/index?returnUrl='))
  h.account.setToken('user')
  h.account.setProfile({ phone: '13800000000', openId: 'test-openid' })
  await detail.show()
  detail.buyNow()
  assert.equal(h.navigation.url, '/pages/custom-checkout/index?id=1&specId=12&quantity=1')
  const checkout = h.page('custom-checkout')
  await checkout.enter({ id: '1', specId: '12', quantity: '1' })
  assert.equal(quotes, 0)
  checkout.applyAddress({ name: '花友', phone: '13800000000', region: '浙江 杭州 西湖', detail: '花园路' })
  await checkout.refreshQuote()
  assert.equal(checkout.quote.value.payableAmount, 5500)
  delayedQuote = deferred()
  const old = checkout.refreshQuote()
  checkout.address.value = '新地址'
  delayedQuote.resolve({ data: { payableAmount: 1 } })
  await old
  assert.equal(checkout.quote.value, undefined)
  delayedQuote = undefined
  await checkout.refreshQuote()
  await checkout.submit()
  assert.equal(checkout.locked.value, true)
  failSubmit = false
  await checkout.submit()
  assert.equal(JSON.stringify(bodies[0]), JSON.stringify(bodies[1]))
  assert.equal(bodies[1].address, '新地址')
  assert(h.navigation.url.includes('orderNo=CUSTOM-1'))
  const invalid = h.page('custom-checkout')
  await invalid.enter({ id: 'abc', specId: '12', quantity: '1' })
  assert.equal(invalid.invalidRoute.value, true)
  await invalid.enter({ id: '1', specId: '12', quantity: '1000' })
  assert.equal(invalid.invalidRoute.value, true)
  const missingSpec = h.page('custom-checkout')
  await missingSpec.enter({ id: '1', specId: '99', quantity: '1' })
  assert(missingSpec.message.value.includes('规格不可用'))
  const display = h.module('pages/orders/order-display.ts')
  const mapping = h.module('pages/orders/order-data.ts')
  for (const [status, index] of [['PENDING_DISPATCH', 0], ['DISPATCHED', 1], ['DELIVERING', 2], ['COMPLETED', 3]]) {
    assert.equal(display.orderStageIndex(mapping.mapOrder({ type: 'CUSTOM', method: 'DELIVERY', status, payableAmount: 0, productAmount: 0, deliveryFee: 0, discountAmount: 0 })), index)
  }
  disabled = true
  await detail.show()
  assert.equal(detail.canBuy.value, false)
  assert.equal(detail.bouquet.value, undefined)
  h.close()
  console.log('PASS: 花束起售价/规格、数量刷新、登录参数、地址与报价失效、创建参数和幂等重试、非法路由、下架及派单进度')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
