const { createHarness, assert, deferred, settle } = require('./integration-harness.cjs')
async function main() {
  let stock = 5,
    closed = false,
    fail = false,
    pending
  const h = createHarness({
    '@/pages/addresses/address-actions': {
      getAddresses: async () => [{ id: '1', name: '花友', phone: '13800000000', region: '', detail: '', isDefault: true }],
    },
    '@/pages/stores/shop-data': {
      getStore: async () => ({ name: '花店', open: !closed }),
      getProduct: async () => {
        if (pending) return pending.promise
        if (fail) throw Error('网络失败')
        return {
          name: '玫瑰',
          image: '/rose.png',
          methods: ['pickup', 'delivery'],
          specs: ['11', '12'].map((id) => ({
            id,
            name: '一束',
            unit: '份',
            price: 30,
            available: stock,
          })),
        }
      },
    },
  })
  h.account.setProfile({ id: 1 })
  h.account.setToken('a')
  const cart = h.module('stores/modules/cart.ts').useCartStore()
  const draft = {
    storeId: '2',
    productId: '1',
    specId: '11',
    storeName: '花店',
    productName: '玫瑰',
    image: '/rose.png',
    specName: '一束',
    unit: '份',
    unitPrice: 3000,
    quantity: 2,
    method: 'pickup',
    contactName: '花友',
    contactPhone: '13800000000',
    address: '',
    remark: '轻放',
    couponId: '7',
  }
  cart.add(draft, 5)
  cart.add(draft, 5)
  assert.equal(cart.items[0].quantity, 4)
  assert.throws(() => cart.add(draft, 5), /库存/)
  assert.throws(() => cart.add({ ...draft, address: '地址', method: 'delivery' }, 5), /同一门店/)
  cart.add({ ...draft, specId: '12' }, 5)
  assert.equal(cart.items.length, 2)
  const saved = h.storage.get('flower-cart-v1')
  const restored = createHarness()
  restored.storage.set('flower-cart-v1', saved)
  restored.account.setProfile({ id: 1 })
  restored.account.setToken('a')
  assert.equal(restored.module('stores/modules/cart.ts').useCartStore().items.length, 2)
  restored.close()
  const p = h.page('cart')
  await p.enter()
  assert.equal(p.total.value, 18000)
  p.toggleAll()
  assert.equal(p.total.value, 0)
  p.checkout()
  assert.equal(h.toasts.at(-1), '请选择商品')
  p.toggleAll()
  p.checkout()
  assert(h.navigation.url.includes('/pages/order-confirm/index?id='))
  p.changeQuantity(cart.items[0], 1)
  p.changeQuantity(cart.items[0], 1)
  assert.equal(cart.items[0].quantity, 5)
  stock = 2
  await p.refresh()
  assert(p.reason(cart.items[0]).includes('库存'))
  assert.equal(cart.items[0].selected, false)
  for (let i = 0; i < 5; i++) p.changeQuantity(cart.items[0], -1)
  assert.equal(cart.items[0].quantity, 1)
  p.toggle(cart.items[0])
  assert.equal(cart.items[0].selected, true)
  closed = true
  await p.refresh()
  assert.equal(p.eligible.value.length, 0)
  closed = false
  fail = true
  await p.refresh()
  assert(p.feedback.value)
  fail = false
  await p.refresh()
  assert.equal(p.eligible.value.length, 2)
  const write = h.uni.setStorageSync
  h.uni.setStorageSync = () => {
    throw Error('存储已满')
  }
  assert.throws(() => cart.add({ ...draft, remark: 'new' }, 5))
  assert.equal(cart.items.length, 2)
  p.remove(cart.items[0])
  assert.equal(cart.items.length, 2)
  h.uni.setStorageSync = write
  // 替换购物车是一次写入，失败时完整保留旧商品。
  const oldRows = JSON.stringify(cart.items)
  h.uni.setStorageSync = () => {
    throw Error('存储已满')
  }
  assert.throws(() => cart.add({ ...draft, storeId: '9' }, 5, true))
  assert.equal(JSON.stringify(cart.items), oldRows)
  h.uni.setStorageSync = write
  pending = deferred()
  const refresh = p.refresh()
  h.account.clearProfile()
  h.account.setProfile({ id: 2 })
  h.account.setToken('b')
  assert.equal(cart.items.length, 0)
  cart.add({ ...draft, storeId: '9' }, 5, true)
  assert.equal(cart.items[0].storeId, '9')
  const legacy = createHarness()
  legacy.storage.set(
    'flower-cart-v1',
    JSON.stringify({
      1: [
        { ...draft, id: 'a', selected: true },
        { ...draft, id: 'b', storeId: '9', selected: true },
      ],
    }),
  )
  legacy.account.setProfile({ id: 1 })
  legacy.account.setToken('a')
  const old = legacy.module('stores/modules/cart.ts').useCartStore()
  assert.equal(old.mixed, true)
  assert.throws(() => old.begin(['a', 'b']), /不同门店/)
  old.remove('b')
  assert.equal(old.mixed, false)
  legacy.close()
  pending.resolve({ name: '旧账户', image: '', methods: [], specs: [] })
  await refresh
  await settle()
  assert.equal(cart.items.length, 1)
  assert.equal(cart.items[0].storeId, '9')
  h.account.setProfile({ id: 1 })
  h.account.setToken('a')
  pending = undefined
  await p.refresh()
  assert.equal(cart.items.length, 2)
  p.remove(cart.items[0])
  p.remove(cart.items[0])
  assert.equal(cart.items.length, 0)
  h.close()
  console.log('PASS: 购物车持久化、合并、库存、选择合计、存储失败、账户及异步隔离、删除')
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
