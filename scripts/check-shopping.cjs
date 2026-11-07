// 使用真实页面脚本和数据映射，隔离网络及数据库。
const { createHarness, settle, deferred, assert } = require('./integration-harness.cjs')

async function main() {
  let unavailable = false
  let closed = false
  let soldOut = false
  let delayedStore
  const quotes = []
  const store = (id) => ({ id: Number(id), name: `门店${id}`, address: '地址', phone: '13800000000', businessHours: '9-18', isOpen: !closed, deliveryArea: '城区', deliveryFee: Number(id) * 100 })
  const product = (id) => ({
    id: 1, storeId: Number(id), storeProductId: Number(id), name: '玫瑰', coverImage: '/rose.jpg', images: [], description: '', category: null,
    pickupEnabled: id === '1', deliveryEnabled: id !== '1',
    specs: [
      { id: 11, name: '小份', unit: '份', price: 1990, available: !soldOut && id === '1' ? 1500 : 0 },
      { id: 12, name: '大份', unit: '份', price: 5990, available: soldOut ? 0 : 2 },
    ],
  })
  const h = createHarness({
    '@/api/shop': {
      getStoreApi: async (id) => delayedStore && id === '3' ? delayedStore.promise : { data: store(id) },
      getStoresApi: async () => ({ data: [store('1'), store('2')] }),
      getProductApi: async (id) => { if (unavailable) throw new Error('下架'); return { data: product(id) } },
      getProductsApi: async (id) => ({ data: [product(id)] }),
    },
    '@/api/coupon': { getUserCouponsApi: async () => ({ data: [] }) },
    '@/pages/addresses/address-actions': { getAddresses: async () => [] },
    '@/pages/checkout/checkout-actions': {
      quoteCheckout: async (input) => {
        quotes.push(input)
        return { data: { productAmount: 5990 * input.quantity, deliveryFee: 200, discountAmount: 0, payableAmount: 5990 * input.quantity + 200 } }
      },
    },
  })
  const catalog = h.page('order')
  soldOut = true
  await catalog.enter()
  let navigationCount = h.navigations.length
  catalog.viewProduct('1')
  assert.equal(h.navigations.length, navigationCount, '售罄商品不能从列表进入详情')
  soldOut = false
  await catalog.show()
  catalog.viewProduct('1')
  assert.match(h.navigation.url, /pages\/product\/index/)
  const p = h.page('product')
  await p.enter({ id: '1', storeId: '1', specId: '11', quantity: '1500', method: 'pickup' })
  assert.equal(p.quantity.value, 999)
  p.increaseQuantity()
  assert.equal(p.quantity.value, 999)
  assert.equal(p.product.value.price, 19.9)
  p.chooseStore()
  h.navigation.events.storeSelected('2')
  assert.equal(p.canBuy.value, false)
  await settle()
  assert.equal(p.storeId.value, '2')
  assert.equal(p.specId.value, '12')
  assert.equal(p.product.value.price, 59.9)
  assert.equal(p.stock.value, 2)
  assert.equal(p.method.value, 'delivery')
  assert.equal(p.quantity.value, 1)
  p.changeMethod('pickup')
  assert.equal(p.method.value, 'delivery')
  const list = await h.module('pages/stores/shop-data.ts').getProducts('2')
  assert.equal(list[0].price, 59.9)
  p.buyNow()
  const target = '/pages/product/index?id=1&storeId=2&specId=12&quantity=1&method=delivery'
  assert.equal(h.navigation.url, '/pages/login/index?returnUrl=' + encodeURIComponent(target))
  h.account.setToken('user')
  h.account.setProfile({ id: 1, phone: '13800000000' })
  const cart = h.module('stores/modules/cart.ts').useCartStore()
  const saveStorage = h.uni.setStorageSync
  h.uni.setStorageSync = () => { throw new Error('存储失败') }
  navigationCount = h.navigations.length
  p.buyNow()
  assert.equal(h.navigations.length, navigationCount, '保存失败不能跳转到空购物车')
  assert.equal(cart.items.length, 0)
  assert.match(h.toasts.at(-1), /存储失败/)
  h.uni.setStorageSync = saveStorage
  p.buyNow()
  assert.equal(h.navigation.url, '/pages/cart/index')
  assert.equal(cart.items.length, 1)
  assert.equal(cart.items[0].quantity, 1)
  assert.equal(cart.items[0].productId, '1')
  assert.equal(cart.items[0].specId, '12')
  assert.equal(cart.items[0].selected, true)
  assert.equal(JSON.parse(h.storage.get('flower-cart-v1')).accounts[cart.owner][0].quantity, 1)
  p.addToCart()
  assert.equal(cart.items[0].quantity, 2)
  p.addToCart()
  assert.equal(cart.items[0].quantity, 2)
  assert.match(h.toasts.at(-1), /库存/)
  navigationCount = h.navigations.length
  p.buyNow()
  assert.equal(h.navigations.length, navigationCount, '加购超库存时不能跳转')
  assert.equal(cart.items[0].quantity, 2)
  const cartPage = h.page('cart')
  await cartPage.enter()
  assert.equal(cartPage.cart.items.length, 1, '购物车页面读取立即购买加入的商品')
  cartPage.checkout()
  assert.match(h.toasts.at(-1), /收花地址/)
  cartPage.chooseAddress()
  assert.equal(h.navigation.url, '/pages/addresses/index?select=1')
  h.navigation.events.addressSelected({ name: '花友', phone: '13800000000', region: '浙江省 杭州市 西湖区', detail: '一号楼' })
  assert.equal(cart.items[0].address, '浙江省 杭州市 西湖区 一号楼')
  cartPage.checkout()
  assert(h.navigation.url.startsWith('/pages/order-confirm/index?id='))
  cartPage.chooseAddress()
  h.navigation.events.addressSelected({ name: '新联系人', phone: '13900000000', region: '浙江省 杭州市 西湖区', detail: '二号楼' })
  assert.equal(cart.confirmation, undefined)
  assert.equal(cart.items[0].contactName, '新联系人')
  assert.equal(cart.items[0].address, '浙江省 杭州市 西湖区 二号楼')
  const checkout = h.page('checkout')
  await checkout.enter({ id: '1', storeId: '2', specId: '12', quantity: '1', method: 'delivery' })
  assert.equal(checkout.failed.value, false)
  assert.equal(quotes.at(-1).storeId, 2)
  assert.equal(quotes.at(-1).specId, 12)
  assert.equal(quotes.at(-1).quantity, 1)
  assert.equal(quotes.at(-1).method, 'delivery')
  assert.equal(checkout.quote.value.payableAmount, 6190)
  const bad = h.page('checkout')
  const before = quotes.length
  await bad.enter({ id: '1', storeId: '2', specId: '12', quantity: '1000', method: 'delivery' })
  assert.equal(bad.invalidRoute.value, true)
  assert.equal(quotes.length, before)
  delayedStore = deferred()
  p.chooseStore()
  h.navigation.events.storeSelected('3')
  h.navigation.events.storeSelected('2')
  await settle()
  delayedStore.resolve({ data: store('3') })
  await settle()
  assert.equal(p.store.value.id, '2')
  assert.equal(p.product.value.storeId, '2')
  p.selectSpec('11')
  assert.equal(p.canBuy.value, false)
  navigationCount = h.navigations.length
  p.buyNow()
  p.addToCart()
  assert.equal(h.navigations.length, navigationCount, '售罄规格不能购买')
  assert.equal(cart.items[0].quantity, 2)
  soldOut = true
  await p.show()
  assert.equal(p.canBuy.value, false)
  p.buyNow()
  assert.equal(h.navigations.length, navigationCount, '直接进入售罄详情也不能购买')
  soldOut = false
  closed = true
  await p.show()
  assert.equal(p.canBuy.value, false)
  p.buyNow()
  assert.equal(h.navigations.length, navigationCount, '停业门店不能购买')
  await catalog.show()
  catalog.viewProduct('1')
  assert.equal(h.navigations.length, navigationCount, '停业门店商品不能从列表进入详情')
  unavailable = true
  await p.show()
  assert.equal(p.failed.value, true)
  assert.equal(p.product.value, undefined)
  assert.equal(p.canBuy.value, false)
  p.buyNow()
  assert.equal(h.navigations.length, navigationCount, '下架商品不能购买')
  h.close()
  console.log('PASS: 售罄/停业列表拦截、立即购买登录及持久化加购、保存失败/超库存不跳转、购物车可见、切店竞态、售罄/停业/下架禁买')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
