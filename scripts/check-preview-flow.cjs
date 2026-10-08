// Run page scripts with isolated local storage and mocked uni APIs; no device data is changed.
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const ts = require('typescript')
const vue = require('vue')
const assert = require('assert/strict')
const root = path.resolve(__dirname, '..')
const storage = new Map()
const cache = new Map()
const account = vue.reactive({ profile: undefined, setProfile(value) { this.profile = value } })
const routes = JSON.parse(fs.readFileSync(path.join(root, 'src/pages.json'), 'utf8')).pages.map(page => '/' + page.path)
let navigation
let modalInput = ''
const uni = {
  getStorageSync: key => storage.has(key) ? structuredClone(storage.get(key)) : '',
  setStorageSync: (key, value) => storage.set(key, JSON.parse(JSON.stringify(value))),
  removeStorageSync: key => storage.delete(key),
  navigateTo: options => navigate(options), redirectTo: options => navigate(options), switchTab: options => navigate(options),
  navigateBack() {}, showToast() {}, setClipboardData() {}, makePhoneCall() {}, setNavigationBarTitle() {},
  showModal(options) { options.success?.({ confirm: true, content: modalInput }) },
}
function navigate(options) {
  assert(routes.includes(options.url.split('?')[0]), `Unregistered route: ${options.url}`)
  navigation = options
}
function load(file, isPage = false) {
  if (!isPage && cache.has(file)) return cache.get(file)
  const hooks = { load: [], show: [] }
  let code = fs.readFileSync(file, 'utf8')
  if (isPage) {
    code = code.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)[1]
    const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
    const names = []
    for (const statement of ast.statements) {
      if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text)
      if (ts.isFunctionDeclaration(statement) && statement.name) names.push(statement.name.text)
    }
    code += '\nexport { ' + names.join(',') + ' }'
  }
  const module = { exports: {} }
  const requireLocal = name => {
    if (name === 'vue') return vue
    if (name.endsWith('.vue')) return {}
    if (name === '@dcloudio/uni-app') return { onLoad: fn => hooks.load.push(fn), onShow: fn => hooks.show.push(fn), onHide() {}, onUnload() {}, onShareAppMessage() {} }
    if (name === '@/stores/modules/user') return { useUserStore: () => account }
    let target = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(file), name)
    if (!fs.existsSync(target)) target += '.ts'
    return load(target)
  }
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  vm.runInNewContext(js, { module, exports: module.exports, require: requireLocal, uni, console, Date, setInterval, clearInterval, getCurrentPages: () => [{ getOpenerEventChannel: () => ({ emit: (name, value) => navigation?.events?.[name]?.(value) }) }] }, { filename: file })
  if (isPage) return { ...module.exports, hooks, enter(options = {}) { hooks.load.forEach(fn => fn(options)); hooks.show.forEach(fn => fn()) } }
  cache.set(file, module.exports)
  return module.exports
}
const page = name => load(path.join(root, 'src/pages', name, 'index.vue'), true)
const check = (name, fn) => { fn(); console.log('PASS ' + name) }
// 固定日期验证统计金额、范围及门店隔离。
const salesData = load(path.join(root, 'src/pages/store-stats/sales-data.ts'))
const salesNow = new Date(2026, 9, 8, 18)
const salesFixtures = [
  { storeId: 'store-1', createdAt: '2026/10/8 10:00:00', total: 35.9, deliveryFee: 6, status: 'pending' },
  { storeId: 'store-1', createdAt: '2026/10/7 10:00:00', total: 20, deliveryFee: 0, status: 'completed' },
  { storeId: 'store-1', createdAt: '2026/10/1 10:00:00', total: 10, deliveryFee: 0, status: 'ready' },
  { storeId: 'store-2', createdAt: '2026/10/8 10:00:00', total: 100, deliveryFee: 0 },
  { type: 'custom', storeId: 'store-1', createdAt: '2026/10/8 10:00:00', total: 199, deliveryFee: 10 },
]
check('sales exclude delivery fees, other stores and custom orders', () => { const result = salesData.summarizeSales(salesFixtures, 'store-1', 'today', salesNow); assert.equal(result.amount, 29.9); assert.equal(result.count, 1); assert.equal(result.pending, 1) })
check('sales periods include correct dates and completed status', () => { const week = salesData.summarizeSales(salesFixtures, 'store-1', 'week', salesNow); assert.equal(week.count, 2); assert.equal(week.completed, 1); assert.equal(salesData.summarizeSales(salesFixtures, 'store-1', 'month', salesNow).count, 3) })
check('empty sales have zero average', () => assert.equal(salesData.summarizeSales([], 'store-1', 'today', salesNow).average, 0))
// 跨店核销按实际核销门店和完成日期归属赠送。
check('gift redemption belongs to completing store and completion date', () => {
  const gift = { storeId: 'store-2', redemptionStoreId: 'store-1', couponType: 'exchange', createdAt: '2026/10/1 10:00:00', fulfilledAt: new Date(2026, 9, 8, 10).toISOString(), status: 'completed', giftQuantity: 1, giftAmount: 39.9, total: 0, deliveryFee: 0 }
  const result = salesData.summarizeSales([gift], 'store-1', 'today', salesNow)
  assert.equal(result.giftQuantity, 1); assert.equal(result.giftAmount, 39.9); assert.equal(result.amount, 0)
  assert.equal(salesData.summarizeSales([gift], 'store-2', 'today', salesNow).giftQuantity, 0)
  assert.equal(salesData.summarizeSales([{ ...gift, status: 'ready' }], 'store-1', 'today', salesNow).giftQuantity, 0)
})
// 用户直接访问统计页时不会得到门店数据。
const unauthorizedSales = page('store-stats'); unauthorizedSales.enter()
check('sales page restricts user role', () => { assert.equal(unauthorizedSales.isManager.value, false); assert.equal(unauthorizedSales.orders.value.length, 0) })
const login = page('test-login')
login.enter()
login.loginAs('user')
const coupons = load(path.join(root, 'src/pages/coupons/coupon-data.ts'))
const addressData = load(path.join(root, 'src/pages/addresses/address-data.ts'))
const newcomer = load(path.join(root, 'src/pages/coupons/new-user-coupon.ts'))
check('new-user reward is idempotent', () => assert.equal(newcomer.grantNewUserCoupon('test-user').expiresAt, newcomer.grantNewUserCoupon('test-user').expiresAt))
const addressPage = page('addresses')
addressPage.enter(); addressPage.openEditor(); addressPage.name.value = '测试收花人'; addressPage.phone.value = '13800000008'; addressPage.region.value = '市区'; addressPage.detail.value = '花园路18号'; addressPage.saveAddress()
check('address persists with a default', () => assert.equal(addressData.readAddresses('test-user')[0].isDefault, true))
const checkout = (id, method, type) => { const p = page('checkout'); p.enter({ id, storeId: type ? '' : 'store-2', quantity: '1', method, type }); p.contactName.value = '测试用户'; p.phone.value = '13800000008'; return p }
const pickup = checkout('rose', 'pickup')
pickup.chooseCoupon(pickup.coupons.value.find(c => c.id === 'invite'))
check('exchange coupon produces zero pickup total', () => assert.equal(pickup.total.value, 0))
pickup.submitOrder()
const pickupNo = uni.getStorageSync('flower-preview-order').orderNo
check('used exchange coupon is not available again', () => assert.equal(coupons.readCoupons('test-user').find(c => c.id === 'invite').status, 'used'))
login.loginAs('manager')
const manager = page('store-orders'); manager.enter()
check('manager sees other-store ordinary order', () => assert.equal(manager.storeOrders.value.length, 1))
manager.advanceOrder(manager.storeOrders.value[0]); manager.advanceOrder(manager.storeOrders.value[0])
login.loginAs('user')
const detail = page('order-detail'); detail.enter({ orderNo: pickupNo })
check('user sees ready status and pickup code', () => { assert.equal(detail.order.value.status, 'ready'); assert(detail.order.value.pickupCode) })
login.loginAs('manager'); manager.hooks.show.forEach(fn => fn())
modalInput = 'wrong'; manager.advanceOrder(manager.storeOrders.value[0])
check('wrong pickup code does not complete order', () => assert.equal(manager.storeOrders.value[0].status, 'ready'))
modalInput = manager.storeOrders.value[0].pickupCode; manager.advanceOrder(manager.storeOrders.value[0])
check('correct pickup code completes order', () => assert.equal(manager.storeOrders.value[0].status, 'completed'))
check('exchange order saves coupon snapshot and actual redemption store', () => { const order = uni.getStorageSync('flower-preview-orders').find(item => item.orderNo === pickupNo); assert.equal(order.couponType, 'exchange'); assert.equal(order.giftQuantity, 1); assert.equal(order.redemptionStoreId, 'store-1'); assert(order.fulfilledAt); assert.equal(salesData.summarizeSales([order], 'store-1', 'today').giftQuantity, 1) })
login.loginAs('user')
const delivery = checkout('rose', 'delivery'); delivery.chooseCoupon(delivery.coupons.value.find(c => c.id.startsWith('new-user-')))
check('cash coupon leaves delivery fee payable', () => assert.equal(delivery.total.value, 35.9))
delivery.submitOrder()
const deliveryNo = uni.getStorageSync('flower-preview-order').orderNo
login.loginAs('manager')
const managerDetail = page('store-order-detail'); managerDetail.enter({ orderNo: deliveryNo }); managerDetail.advanceOrder(); managerDetail.advanceOrder(); managerDetail.advanceOrder(); managerDetail.advanceOrder()
check('delivery completes from manager detail', () => assert.equal(managerDetail.order.value.status, 'completed'))
login.loginAs('user')
const custom = checkout('chenyu', 'delivery', 'custom')
check('custom order uses platform delivery without store', () => { assert.equal(custom.total.value, 209); assert.equal(custom.availableCouponCount.value, 0) })
custom.submitOrder()
const customNo = uni.getStorageSync('flower-preview-order').orderNo
login.loginAs('manager'); manager.hooks.show.forEach(fn => fn())
check('custom order is excluded from manager list', () => assert(!manager.storeOrders.value.some(o => o.orderNo === customNo)))
check('manager detail refuses custom order', () => { const p = page('store-order-detail'); p.enter({ orderNo: customNo }); assert.equal(p.order.value, null) })
login.loginAs('user')
const list = page('orders'); list.enter({ status: 'completed' })
check('user completed list includes fulfilled ordinary orders', () => assert.equal(list.visibleOrders.value.length, 2))
check('repeat submit creates only one order', () => { const before = uni.getStorageSync('flower-preview-orders').length; custom.submitOrder(); assert.equal(uni.getStorageSync('flower-preview-orders').length, before) })
check('all registered pages and static images exist', () => {
  for (const route of routes) {
    const file = path.join(root, 'src', route + '.vue')
    assert(fs.existsSync(file), route)
    const source = fs.readFileSync(file, 'utf8')
    for (const match of source.matchAll(/(?:url:\s*['"`])((?:\/pages\/)[\w/-]+)/g)) if (match[1] !== '/pages/') assert(routes.includes(match[1]), match[1])
    for (const match of source.matchAll(/src="(\/static\/[^"]+)"/g)) assert(fs.existsSync(path.join(root, 'src', match[1])), match[1])
  }
})
check('quantity buttons change the subtotal', () => {
  const product = page('product'); product.enter({ id: 'rose', storeId: 'store-1' }); product.increaseQuantity(); assert.equal(product.quantity.value, 2); assert.equal(product.subtotal.value, 79.8); product.decreaseQuantity(); assert.equal(product.quantity.value, 1)
})
check('saved address returns through event channel', () => {
  const p = checkout('rose', 'delivery'); p.chooseAddress(); const addresses = page('addresses'); addresses.enter({ select: '1' }); addresses.selectAddress(addressData.readAddresses('test-user')[0]); assert.equal(p.address.value, '市区 花园路18号'); assert.equal(p.contactName.value, '测试收花人')
})
check('expired and wrong-spec coupons are rejected', () => {
  const coupon = { id: 'test', type: 'exchange', status: 'available', expiresAt: Date.now() + 10000 }
  assert(coupons.couponReason(coupon, 'tulip', '5支', 1, false)); assert(coupons.couponReason({ ...coupon, expiresAt: 1 }, 'rose', '8支', 1, false))
})
check('invalid contact cannot submit', () => {
  const p = checkout('rose', 'pickup'); p.phone.value = '123'; const before = uni.getStorageSync('flower-preview-orders').length; p.submitOrder(); assert.equal(uni.getStorageSync('flower-preview-orders').length, before)
})
check('other users cannot read existing orders', () => {
  account.setProfile({ id: 'other-user', role: 'user' }); const p = page('orders'); p.enter(); assert.equal(p.orders.value.length, 0); const d = page('order-detail'); d.enter({ orderNo: pickupNo }); assert.equal(d.order.value, null)
})
check('address and coupon storage are isolated per account', () => {
  assert.equal(addressData.readAddresses('other-user').length, 0)
  assert.equal(coupons.readCoupons('other-user').find(coupon => coupon.id === 'invite').status, 'available')
  assert.equal(coupons.readCoupons('test-user').find(coupon => coupon.id === 'invite').status, 'used')
  assert.equal(coupons.readCoupons().length, 0)
})
login.loginAs('user')
check('checkout defaults to login phone', () => { const p = page('checkout'); p.enter({ id: 'rose', storeId: 'store-1' }); assert.equal(p.phone.value, '13800000008') })
check('checkout rejects closed stores, sold-out goods and excess quantities', () => {
  const before = uni.getStorageSync('flower-preview-orders').length
  for (const options of [{ id: 'rose', storeId: 'store-3' }, { id: 'tulip', storeId: 'store-2' }, { id: 'rose', storeId: 'store-2', quantity: '99' }]) {
    const p = page('checkout'); p.enter(options); p.contactName.value = '测试用户'; p.submitOrder()
  }
  assert.equal(uni.getStorageSync('flower-preview-orders').length, before)
})
check('catalog shows sold-out products for selected store', () => {
  uni.setStorageSync('flower-selected-store', 'store-2')
  const p = page('order'); p.enter(); assert.equal(p.currentProducts.value.find(product => product.id === 'tulip').soldOut, true)
})
check('exchange rules support configured product, specification and quantities', () => {
  const p = checkout('rose', 'pickup'); p.quantity.value = 3
  const coupon = { id: 'multiple', type: 'exchange', status: 'available', expiresAt: Date.now() + 10000, productId: 'rose', specification: '8支', exchangeQuantity: 2 }
  p.coupons.value = [coupon]; p.chooseCoupon(coupon); assert.equal(p.discount.value, 79.8); assert.equal(Number(p.total.value.toFixed(2)), 39.9)
  assert(coupons.couponReason(coupon, 'rose', '8支', 1, false))
  assert.equal(coupons.couponReason({ ...coupon, productId: 'tulip', specification: '5支', exchangeQuantity: 1 }, 'tulip', '5 支', 1, false), '')
})
check('gift stems exclude additionally purchased quantities', () => {
  const order = { storeId: 'store-1', couponType: 'exchange', status: 'completed', createdAt: '2026/10/8 10:00:00', quantity: 12, giftQuantity: 10, stemsPerUnit: 8, giftAmount: 399, total: 79.8, deliveryFee: 0 }
  const result = salesData.summarizeSales([order], 'store-1', 'today', salesNow)
  assert.equal(result.giftStems, 80); assert.equal(result.giftQuantity, 10)
  assert.equal(salesData.summarizeSales([{ ...order, couponType: 'cash' }], 'store-1', 'today', salesNow).giftQuantity, 0)
})
check('delivery progress matches between user and manager', () => {
  const state = load(path.join(root, 'src/services/preview-orders.ts'))
  const order = { method: 'delivery', status: 'ready' }; assert.equal(state.orderStages(order)[state.orderStageIndex(order)], '待配送')
  assert.equal(state.orderStatus({ type: 'custom', status: 'preparing' }), '已派单')
})
check('manager updates preserve newer orders and cannot repeat completion', () => {
  const state = load(path.join(root, 'src/services/preview-orders.ts'))
  const before = uni.getStorageSync('flower-preview-orders').length
  state.advanceOrder(pickupNo, 'store-2', () => { throw new Error('Repeated completion') })
  assert.equal(uni.getStorageSync('flower-preview-orders').length, before)
  assert(state.findOrder(customNo))
})
check('invitations reward first registration only and reject self-invites', () => {
  const invitations = load(path.join(root, 'src/pages/invite/invite-data.ts'))
  const code = invitations.getInviteCode('test-user')
  invitations.rememberInvitation(code); assert.equal(invitations.readInvites('test-user').length, 0)
  invitations.registerUser('new-friend', '13800000009')
  assert.equal(invitations.readInvites('test-user').length, 1)
  const reward = coupons.readCoupons('test-user').find(coupon => coupon.id === 'invite-new-friend')
  assert(reward); assert(reward.expiresAt > Date.now() + 119 * 3600000); assert(newcomer.getNewUserCoupon('new-friend'))
  invitations.rememberInvitation(code); invitations.registerUser('new-friend', '13800000009')
  invitations.rememberInvitation(code); invitations.registerUser('test-user', '13800000008')
  assert.equal(invitations.readInvites('test-user').length, 1)
  invitations.rememberInvitation(invitations.getInviteCode('self-new')); invitations.registerUser('self-new', '13800000010')
  assert.equal(invitations.readInvites('self-new').length, 0)
})
check('mock stock deducts only the ordering store and blocks repeat purchases', () => {
  const inventory = load(path.join(root, 'src/services/preview-stock.ts'))
  const before = inventory.readStock()
  const p = page('checkout'); p.enter({ id: 'sunflower', storeId: 'store-1', quantity: '8' }); p.contactName.value = '测试用户'; p.submitOrder()
  assert.equal(inventory.readStock()['store-1'].sunflower, 0)
  assert.equal(inventory.readStock()['store-2'].sunflower, before['store-2'].sunflower)
  assert.equal(inventory.readStock()['store-1'].sunflower, 0)
  const count = uni.getStorageSync('flower-preview-orders').length
  const second = page('checkout'); second.enter({ id: 'sunflower', storeId: 'store-1' }); second.contactName.value = '测试用户'; second.submitOrder()
  assert.equal(uni.getStorageSync('flower-preview-orders').length, count)
})
check('invitation page updates actual mock records and rewards', () => {
  const p = page('invite'); p.enter(); const count = p.records.value.length; p.simulateRegistration(); assert.equal(p.records.value.length, count + 1)
  assert(coupons.readCoupons('test-user').some(coupon => coupon.id.startsWith('invite-mock-friend-')))
})
check('home and my page entries navigate to registered pages for each role', () => {
  const home = page('index'); home.enter(); home.goShopping('delivery'); assert.equal(navigation.url, '/pages/order/index'); home.viewProduct('rose'); assert(navigation.url.includes('/pages/product/index')); home.goBouquets(); assert.equal(navigation.url, '/pages/bouquets/index')
  const my = page('my'); my.enter(); assert.equal(my.isManager.value, false); my.openOrders(); assert(navigation.url.startsWith('/pages/orders/index')); my.openEntry('地址管理'); assert.equal(navigation.url, '/pages/addresses/index')
  login.loginAs('manager'); my.hooks.show.forEach(fn => fn()); assert.equal(my.isManager.value, true); my.openOrders(); assert.equal(navigation.url, '/pages/store-orders/index'); my.openSales(); assert.equal(navigation.url, '/pages/store-stats/index')
  const stats = page('store-stats'); stats.enter(); assert.equal(stats.isManager.value, true); assert.equal(stats.sales.value.giftQuantity, 1)
  login.loginAs('user')
})
check('anonymous users cannot submit or read orders and login returns to checkout', () => {
  account.setProfile(undefined)
  const p = checkout('rose', 'pickup'); const before = uni.getStorageSync('flower-preview-orders').length; p.submitOrder()
  assert.equal(uni.getStorageSync('flower-preview-orders').length, before); assert(navigation.url.includes('returnUrl='))
  const returnUrl = navigation.url.split('returnUrl=')[1]
  const l = page('test-login'); l.enter({ returnUrl }); l.loginAs('user'); assert(navigation.url.startsWith('/pages/checkout/index'))
  account.setProfile(undefined); const d = page('order-detail'); d.enter({ orderNo: pickupNo }); assert.equal(d.order.value, null)
  const r = page('payment-result'); r.enter(); assert.equal(r.order.value, null)
})
