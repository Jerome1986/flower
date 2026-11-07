const { createHarness, assert, deferred } = require('./integration-harness.cjs')
async function main() {
  const first = { id: '1', name: '甲', phone: '13800000000', region: '浙江 杭州', detail: '一号' }
  const second = { ...first, id: '2', name: '乙', detail: '二号' }
  let addresses = [first, second], pending, fail = false
  const h = createHarness({
    '@/pages/addresses/address-actions': { getAddresses: async () => {
      if (pending) return pending.promise
      if (fail) throw Error('network')
      return addresses
    } },
  })
  h.account.setProfile({ id: 1 })
  h.account.setToken('a')
  const cart = h.module('stores/modules/cart.ts').useCartStore()
  const draft = { storeId: '1', productId: '1', specId: '1', storeName: '店', productName: '花', image: '', specName: '束', unit: '束', unitPrice: 100, quantity: 1, method: 'pickup', contactName: '', contactPhone: '', address: '', remark: '', couponId: '' }
  cart.add(draft, 9)
  const p = h.page('cart')
  await p.refreshAddress()
  assert.equal(cart.fulfillment.contactName, '甲')
  assert.equal(cart.fulfillment.address, '浙江 杭州 一号')
  p.chooseAddress()
  h.navigation.events.addressSelected(second)
  await p.refreshAddress()
  assert.equal(cart.fulfillment.contactName, '乙')
  addresses = [first]
  await p.refreshAddress()
  assert.equal(cart.fulfillment.contactName, '甲')
  addresses = []
  await p.refreshAddress()
  assert.equal(p.addressEmpty.value, true)
  assert.equal(cart.fulfillment.contactName, '')
  addresses = [second]
  await p.refreshAddress()
  assert.equal(cart.fulfillment.contactName, '乙')
  fail = true
  await p.refreshAddress()
  assert.equal(p.addressError.value, true)
  assert.equal(p.addressEmpty.value, false)
  assert.equal(cart.fulfillment.contactName, '乙')
  pending = deferred()
  const request = p.refreshAddress()
  h.account.clearProfile()
  h.account.setProfile({ id: 2 })
  h.account.setToken('b')
  cart.add(draft, 9)
  pending.resolve([first])
  await request
  assert.equal(cart.fulfillment.contactName, '')
  h.close()
  console.log('PASS: 首地址匹配、手动选择保留、删除回退、空地址、新增地址、网络失败与账号隔离')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
