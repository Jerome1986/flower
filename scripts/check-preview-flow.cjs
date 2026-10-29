// Isolated asynchronous page/service regression checks. No live server or device data.
const { createHarness, settle, deferred, assert } = require('./integration-harness.cjs')
const checks = []
const check = (name, fn) => checks.push({ name, fn })
const base = { id: '1', storeId: '1', specId: '11', quantity: '1', method: 'pickup' }
const store = {
  id: 1,
  name: '花店',
  address: '花园路',
  phone: '13800000000',
  businessHours: '9-18',
  isOpen: true,
  deliveryArea: '市区',
  deliveryFee: 600,
}
const product = {
  id: 1,
  storeId: 1,
  storeProductId: 1,
  name: '玫瑰',
  coverImage: '/rose.jpg',
  images: [],
  description: '',
  category: null,
  pickupEnabled: true,
  deliveryEnabled: true,
  specs: [{ id: 11, name: '8支', unit: '份', price: 3990, available: 5 }],
}
const emptySales = {
  store: { id: 1, name: '花店' },
  period: 'today',
  timezone: 'Asia/Shanghai',
  start: '2026-10-10T16:00:00Z',
  end: '2026-10-11T16:00:00Z',
  amount: 0,
  deliveryAmount: 0,
  receivedAmount: 0,
  salesCount: 0,
  count: 0,
  pending: 0,
  completed: 0,
  average: 0,
  giftQuantity: 0,
  giftStems: 0,
  giftUnknownStemsCount: 0,
  giftAmount: 0,
  giftExceptionCount: 0,
  states: [],
}
function fixture(extra = {}) {
  const orders = new Map(),
    keys = new Map(),
    submissions = [],
    quotes = []
  const customer = {
    id: 1,
    phone: '13800000000',
    nickname: '客户',
    role: 'CUSTOMER',
    managedStores: [],
  }
  const manager = {
    ...customer,
    id: 2,
    role: 'STORE_MANAGER',
    managedStores: [{ id: 1, name: '花店' }],
  }
  const userApi = {
    getCurrentUserApi: async () => ({ data: h.account.token === 'manager' ? manager : customer }),
  }
  const orderApi = {
    quoteOrderApi: async (input) => {
      quotes.push(input)
      return {
        data: {
          productAmount: 3990 * input.quantity,
          discountAmount: 0,
          deliveryFee: input.method === 'delivery' ? 600 : 0,
          payableAmount: 3990 * input.quantity + (input.method === 'delivery' ? 600 : 0),
        },
      }
    },
    submitOrderApi: async (input) => {
      submissions.push(JSON.parse(JSON.stringify(input)))
      if (keys.has(input.requestKey)) return { data: orders.get(keys.get(input.requestKey)) }
      const no = 'order-' + (orders.size + 1)
      const order = {
        orderNo: no,
        userId: 1,
        storeId: 1,
        type: 'ORDINARY',
        method: input.method.toUpperCase(),
        status: 'PENDING_ACCEPTANCE',
        paymentStatus: 'NOT_REQUIRED',
        version: 1,
        logs: [],
        createdAt: new Date().toISOString(),
        pickupCode: '123456',
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        remark: input.remark,
        payableAmount: input.expectedAmount,
        productAmount: 3990,
        discountAmount: 0,
        deliveryFee: input.method === 'delivery' ? 600 : 0,
        storeSnapshot: { name: '花店' },
        addressSnapshot: { detail: input.address },
        item: {
          productName: '玫瑰',
          coverImage: '',
          specName: '8支',
          unit: '份',
          quantity: input.quantity,
        },
      }
      orders.set(no, order)
      keys.set(input.requestKey, no)
      return { data: order }
    },
    getOrdersApi: async () => ({ data: [...orders.values()] }),
    getOrderApi: async (no) => ({ data: orders.get(no) }),
    cancelOrderApi: async (no) => {
      const order = orders.get(no)
      order.status = 'CANCELLED'
      return { data: order }
    },
  }
  const manageApi = {
    getManagedStoresApi: async () => ({ data: [{ id: 1, name: '花店' }] }),
    getManageOrdersApi: async () => ({ data: { list: [...orders.values()], total: orders.size } }),
    getManageOrderApi: async (no) => ({ data: orders.get(no) }),
    performOrderActionApi: async (no, input) => {
      const order = orders.get(no)
      if (input.version !== order.version) throw { statusCode: 409 }
      if (input.action === 'complete' && order.method === 'PICKUP' && input.pickupCode !== '123456')
        throw { statusCode: 400 }
      order.status = {
        accept: 'ACCEPTED',
        ready: 'READY',
        deliver: 'DELIVERING',
        complete: 'COMPLETED',
        cancel: 'CANCELLED',
      }[input.action]
      order.version++
      return { data: order }
    },
  }
  const h = createHarness({
    '@/api/user': userApi,
    '@/api/shop': {
      getStoresApi: async () => ({ data: [store] }),
      getStoreApi: async () => ({ data: store }),
      getProductApi: async () => ({ data: product }),
      getProductsApi: async () => ({ data: [product] }),
    },
    '@/api/addresses': { listAddressesApi: async () => ({ data: [] }) },
    '@/api/sales': { getSalesApi: async () => ({ data: emptySales }) },
    '@/api/orders': orderApi,
    '@/api/manage-orders': manageApi,
    ...extra,
  })
  return Object.assign(h, {
    orders,
    submissions,
    quotes,
    orderApi,
    manageApi,
    async login(role = 'customer') {
      h.account.clearProfile()
      h.account.setProfile(role === 'manager' ? manager : customer)
      h.account.setToken(role)
    },
    async checkout(options = {}) {
      const p = h.page('checkout')
      await p.enter({ ...base, ...options })
      p.name.value = '收花人'
      return p
    },
  })
}
check('ordinary pickup and delivery complete through API-backed pages', async () => {
  const h = fixture()
  await h.login()
  const p = await h.checkout()
  await Promise.all([p.submit(), p.submit()])
  assert.equal(h.orders.size, 1)
  const no = p.createdOrderNo.value
  assert(no)
  assert.equal(h.submissions.length, 1)
  const result = h.page('payment-result')
  await result.enter({ orderNo: no })
  assert.equal(result.order.value.orderNo, no)
  const userDetail = h.page('order-detail')
  await userDetail.enter({ orderNo: no })
  assert.equal(userDetail.order.value.status, 'pending')
  await h.login('manager')
  const manager = h.page('store-order-detail')
  await manager.enter({ orderNo: no })
  for (let i = 0; i < 2; i++) await manager.advanceOrder()
  assert.equal(manager.order.value.status, 'ready')
  h.modalInput = 'wrong'
  await manager.advanceOrder()
  assert.equal(manager.order.value.status, 'ready')
  h.modalInput = '123456'
  await manager.advanceOrder()
  assert.equal(manager.order.value.status, 'completed')
  await h.login()
  const delivery = await h.checkout({ method: 'delivery' })
  assert.equal(delivery.addressMessage.value, '')
  delivery.address.value = '市区 花园路'
  await delivery.submit()
  await h.login('manager')
  await manager.enter({ orderNo: delivery.createdOrderNo.value || 'order-2' })
  for (let i = 0; i < 4; i++) await manager.advanceOrder()
  assert.equal(manager.order.value.status, 'completed')
  h.close()
})
check('invalid checkout parameters never request product or quote', async () => {
  let requests = 0
  const h = fixture({
    '@/api/shop': {
      getStoreApi: async () => {
        requests++
        throw Error()
      },
      getProductApi: async () => {
        requests++
        throw Error()
      },
    },
  })
  await h.login()
  for (const options of [
    { specId: '' },
    { storeId: '' },
    { id: 'rose' },
    { quantity: '0' },
    { quantity: '1.5' },
    { quantity: 'NaN' },
    { method: 'other' },
    { type: 'custom' },
  ]) {
    const p = await h.checkout(options)
    assert(p.invalidRoute.value)
    await p.submit()
  }
  assert.equal(requests, 0)
  assert.equal(h.submissions.length, 0)
  h.close()
})
check(
  'uncertain submission retry preserves key and body; definitive rejection unlocks',
  async () => {
    const h = fixture()
    await h.login()
    const original = h.orderApi.submitOrderApi
    let fail = true
    h.orderApi.submitOrderApi = async (input) => {
      const result = await original(input)
      if (fail) {
        fail = false
        throw Error('lost response')
      }
      return result
    }
    const p = await h.checkout()
    await p.submit()
    assert(p.locked.value)
    await p.submit()
    assert.equal(h.orders.size, 1)
    assert.deepEqual(h.submissions[0], h.submissions[1])
    h.orderApi.submitOrderApi = async () => {
      throw { statusCode: 409 }
    }
    const next = await h.checkout()
    await next.submit()
    assert.equal(next.locked.value, false)
    assert(next.quote.value)
    h.close()
  },
)
check(
  'latest quote wins, failure clears amount, session change clears contacts and stale responses',
  async () => {
    const h = fixture()
    await h.login()
    const p = await h.checkout()
    const old = deferred()
    h.orderApi.quoteOrderApi = () => old.promise
    const first = p.refreshQuote()
    h.orderApi.quoteOrderApi = async () => ({ data: { payableAmount: 6000 } })
    await p.refreshQuote()
    old.resolve({ data: { payableAmount: 1 } })
    await first
    assert.equal(p.quote.value.payableAmount, 6000)
    h.orderApi.quoteOrderApi = async () => {
      throw Error()
    }
    await p.refreshQuote()
    assert.equal(p.quote.value, undefined)
    assert(p.quoteFailed.value)
    const delayed = deferred()
    h.orderApi.quoteOrderApi = () => delayed.promise
    const pending = p.refreshQuote()
    h.account.setToken('other')
    delayed.resolve({ data: { payableAmount: 1 } })
    await pending
    assert.equal(p.quote.value, undefined)
    assert.equal(p.name.value, '')
    h.close()
  },
)
check(
  'stock and contact validation block invalid submissions; cancel refreshes server state',
  async () => {
    const h = fixture()
    await h.login()
    const excess = await h.checkout({ quantity: '99' })
    assert(excess.failed.value)
    await excess.submit()
    assert.equal(h.orders.size, 0)
    const p = await h.checkout()
    p.phone.value = '123'
    await p.submit()
    assert.equal(h.orders.size, 0)
    p.phone.value = '13800000000'
    await p.submit()
    const detail = h.page('order-detail')
    await detail.enter({ orderNo: p.createdOrderNo.value })
    detail.cancel()
    await settle()
    assert.equal(detail.order.value.status, 'cancelled')
    h.close()
  },
)
check(
  'pending adapters reject explicitly and never call request or write local business records',
  async () => {
    const h = fixture()
    await h.login()
    const pending = h.module('utils/integration.ts')
    for (const [module, fn, args] of [
      ['api/marketing.ts', 'getWalletApi', []],
      ['api/marketing.ts', 'claimNewcomerGiftApi', []],
      ['api/marketing.ts', 'getInvitationApi', []],
      ['api/production-access.ts', 'payOrderApi', ['1']],
    ])
      await assert.rejects(h.module(module)[fn](...args), (error) =>
        pending.isIntegrationPending(error),
      )
    assert.equal(h.calls.length, 0)
    assert.equal(h.storage.size, 0)
    h.close()
  },
)
check(
  'address save failure preserves form; server success and selection update checkout',
  async () => {
    let list = []
    let reject = true
    const address = {
      id: 8,
      name: '花友',
      phone: '13800000008',
      province: '浙江省',
      city: '杭州市',
      district: '西湖区',
      regionCode: null,
      detail: '花园路8号',
      isDefault: true,
    }
    const h = fixture({
      '@/api/addresses': {
        listAddressesApi: async () => ({ data: list }),
        createAddressApi: async () => {
          if (reject) throw Error()
          list = [address]
          return { data: address }
        },
        updateAddressApi: async () => ({ data: address }),
        deleteAddressApi: async () => {
          list = []
        },
        setDefaultAddressApi: async () => {},
      },
    })
    await h.login()
    const p = h.page('addresses')
    await p.enter()
    p.openEditor()
    p.name.value = address.name
    p.phone.value = address.phone
    p.province.value = address.province
    p.city.value = address.city
    p.district.value = address.district
    p.detail.value = address.detail
    await p.saveAddress()
    assert(p.showEditor.value)
    assert.equal(p.name.value, address.name)
    assert.equal(p.addresses.value.length, 0)
    reject = false
    await p.saveAddress()
    assert.equal(p.showEditor.value, false)
    assert.equal(p.addresses.value.length, 1)
    const checkout = await h.checkout({ method: 'delivery' })
    checkout.chooseAddress()
    const selection = h.page('addresses')
    await selection.enter({ select: '1' })
    selection.selectAddress(selection.addresses.value[0])
    assert.equal(checkout.address.value, '浙江省 杭州市 西湖区 花园路8号')
    assert.equal(checkout.phone.value, address.phone)
    checkout.name.value = '已修改'
    checkout.address.value = '手动地址'
    await checkout.loadDefaultAddress()
    assert.equal(checkout.name.value, '已修改')
    assert.equal(checkout.address.value, '手动地址')
    h.close()
  },
)
check('older order list response and previous account data are discarded', async () => {
  const h = fixture()
  await h.login()
  const first = deferred()
  h.orderApi.getOrdersApi = () => first.promise
  const p = h.page('orders')
  const one = p.loadOrders()
  h.orderApi.getOrdersApi = async () => ({ data: [] })
  await p.loadOrders()
  first.resolve({ data: [] })
  await one
  assert.equal(p.orders.value.length, 0)
  const last = deferred()
  h.orderApi.getOrdersApi = () => last.promise
  const waiting = p.loadOrders()
  h.account.setToken('other')
  last.resolve({ data: [] })
  await waiting
  assert.equal(p.orders.value.length, 0)
  h.close()
})

check(
  'pending pages distinguish unavailable from empty and never load local fixtures',
  async () => {
    const h = fixture()
    await h.login()
    for (const name of ['coupons', 'invite']) {
      const p = h.page(name)
      await p.enter({ id: '1' })
      assert(p.pending.value, name)
      assert(p.message.value.includes('暂未开放'), name)
    }
    const home = h.page('index')
    await home.enter()
    assert.equal(home.gift.value, undefined)
    await home.claimNewUserCoupon()
    assert.equal(h.storage.has('flower-demo-coupons-1'), false)
    const custom = h.page('custom-checkout')
    await custom.enter({ id: '1', specId: '11', quantity: '1' })
    await custom.submit()
    assert.equal(h.orders.size, 0)
    await h.login('manager')
    const stats = h.page('store-stats')
    await stats.enter()
    assert.equal(stats.sales.value.amount, 0)
    assert.equal(stats.message.value, '')
    const my = h.page('my')
    await my.enter()
    assert.equal(my.managerStore.value.name, '花店')
    assert.equal(my.todaySales.value.amount, 0)
    assert.equal(my.salesMessage.value, '')
    h.close()
  },
)
check(
  'stats only use selected backend store and period, stale results do not overwrite',
  async () => {
    const queries = []
    const old = deferred()
    let count = 0
    const summary = {
      ...emptySales,
      amount: 2500,
      count: 1,
      pending: 0,
      completed: 1,
      average: 2500,
      giftQuantity: 0,
      giftStems: 0,
      giftAmount: 0,
      states: [],
    }
    const h = fixture({
      '@/api/sales': {
        getSalesApi: async (query) => {
          queries.push({ ...query })
          if (++count === 2) return old.promise
          return { data: { ...summary, amount: query.storeId === 2 ? 9000 : 2500 } }
        },
      },
    })
    h.manageApi.getManagedStoresApi = async () => ({
      data: [
        { id: 1, name: '一店' },
        { id: 2, name: '二店' },
      ],
    })
    await h.login('manager')
    const p = h.page('store-stats')
    await p.enter()
    assert.equal(p.sales.value.amount, 25)
    p.period.value = 'week'
    await settle()
    p.chooseStore({ detail: { value: 1 } })
    await settle()
    assert.equal(p.sales.value.amount, 90)
    old.resolve({ data: { ...summary, amount: 99900 } })
    await settle()
    assert.equal(p.sales.value.amount, 90)
    assert.deepEqual(queries.at(-1), { storeId: 2, period: 'week' })
    h.close()
  },
)
check('coupon switching quotes with backend amounts and failure disables checkout', async () => {
  const quoteA = deferred()
  let submitted
  const h = fixture({
    '@/pages/checkout/coupon-config': {
      couponCheckoutEnabled: true,
    },
    '@/api/marketing': {
      getAvailableCouponsApi: async () => [
        { id: 'A', title: 'A', status: 'available' },
        { id: 'B', title: 'B', status: 'available' },
      ],
      quoteCouponOrderApi: async (input, id) => {
        if (id === 'A') return quoteA.promise
        if (id === 'bad') throw Error()
        return { productAmount: 3990, discountAmount: 1000, deliveryFee: 0, payableAmount: 2990 }
      },
      submitCouponOrderApi: async (input, id) => {
        submitted = id
        return (await h.orderApi.submitOrderApi(input)).data
      },
    },
  })
  await h.login()
  const p = await h.checkout()
  p.chooseCoupon('A')
  p.chooseCoupon('B')
  await settle()
  assert.equal(p.quote.value.payableAmount, 2990)
  quoteA.resolve({ payableAmount: 1 })
  await settle()
  assert.equal(p.quote.value.payableAmount, 2990)
  p.chooseCoupon('bad')
  await settle()
  assert.equal(p.quote.value, undefined)
  await p.submit()
  assert.equal(h.orders.size, 0)
  p.chooseCoupon('B')
  await settle()
  await p.submit()
  assert.equal(submitted, 'B')
  assert.equal(h.submissions[0].expectedAmount, 2990)
  h.close()
})
check(
  'invitation counters and rules come from service, failed binding retains source',
  async () => {
    const data = {
      code: 'server-code',
      shareTitle: '分享',
      sharePath: '/pages/index/index?inviteCode=server-code',
      rules: '服务端规则',
      invitedCount: 9,
      rewardCount: 3,
      records: [],
    }
    const api = {
      getInvitationApi: async () => data,
      bindInvitationApi: async () => {
        throw Error()
      },
    }
    const h = fixture({ '@/api/marketing': api })
    await h.login()
    const p = h.page('invite')
    await p.enter()
    assert.equal(p.invitation.value.invitedCount, 9)
    assert.equal(p.invitation.value.rewardCount, 3)
    assert.equal(p.inviteCode.value, 'server-code')
    const marketing = h.module('pages/invite/invitation-actions.ts')
    marketing.rememberInvitation('first')
    marketing.rememberInvitation('second')
    await assert.rejects(marketing.bindPendingInvitation())
    assert.equal(h.storage.get('flower-pending-invite-code'), 'first')
    api.bindInvitationApi = async () => {}
    await marketing.bindPendingInvitation()
    assert.equal(h.storage.has('flower-pending-invite-code'), false)
    h.close()
  },
)
check('custom checkout uses independent quote and submission, never ordinary create', async () => {
  let payload,
    created = 0
  const bouquet = {
    id: 1,
    name: '花束',
    coverImage: '',
    description: '',
    price: 99,
    unit: '束',
    specification: '标准',
    methods: ['delivery'],
    images: [],

    deliveryFee: 1000,
    maxQuantity: 3,
    specs: [{ id: 11, name: '标准', unit: '束', price: 9900 }],
  }
  const h = fixture({
    '@/pages/custom-checkout/bouquet-checkout': {
      customCheckoutEnabled: true,
      quoteCustom: async () => ({
        productAmount: 9900,
        discountAmount: 0,
        deliveryFee: 1000,
        payableAmount: 10900,
      }),
      submitCustom: async (input) => {
        created++
        payload = { ...input }
        return { orderNo: 'custom-1' }
      },
    },
    '@/api/bouquets': {
      getBouquetApi: async () => ({ data: bouquet }),
      quoteCustomApi: async () => ({
        productAmount: 9900,
        discountAmount: 0,
        deliveryFee: 1000,
        payableAmount: 10900,
      }),
    },
  })
  await h.login()
  const p = h.page('custom-checkout')
  await p.enter({ id: '1', specId: '11', quantity: '1' })
  p.name.value = '收花人'
  p.phone.value = '13800000000'
  p.address.value = '市区花园路'
  await p.refreshQuote()
  assert.equal(p.quote.value.payableAmount, 10900)
  p.address.value = '新地址'
  assert.equal(p.quote.value, undefined)
  await p.submit()
  assert.equal(created, 0)
  await p.refreshQuote()
  await Promise.all([p.submit(), p.submit()])
  assert.equal(created, 1)
  assert.equal(payload.bouquetId, '1')
  assert.equal(payload.storeId, undefined)
  assert.equal(h.submissions.length, 0)
  h.close()
})
check(
  'login return only accepts registered pages, manager never operates custom orders',
  async () => {
    const h = fixture()
    const urls = h.module('utils/login-return.ts')
    assert.equal(urls.safeReturnUrl('https://example.com'), '')
    assert.equal(urls.safeReturnUrl('%E0%A4%A'), '')
    assert.equal(urls.safeReturnUrl('/pages/missing/index'), '')
    assert.equal(urls.safeReturnUrl('/pages/login/index'), '')
    const back = '/pages/checkout/index?id=1&storeId=1&specId=11&quantity=1&method=pickup'
    assert.equal(urls.safeReturnUrl(encodeURIComponent(back)), back)
    const manage = h.module('pages/store-orders/order-actions.ts')
    assert.equal(manage.manageAction({ type: 'custom', status: 'pending' }), undefined)
    assert.equal(await manage.performAction({ type: 'custom', status: 'pending' }, true), undefined)
    h.close()
  },
)
check('registered runtime import graph has no legacy mock business modules', async () => {
  const fs = require('fs'),
    path = require('path'),
    ts = require('typescript'),
    { root } = require('./integration-harness.cjs')
  const routes = JSON.parse(fs.readFileSync(path.join(root, 'src/pages.json'), 'utf8')).pages
  const seen = new Set()
  function visit(file) {
    if (seen.has(file) || !fs.existsSync(file)) return
    seen.add(file)
    assert(
      !/(mock-data|preview-orders|preview-stock|coupon-data|new-user-coupon|invite-data|address-data|sales-data)\.ts$/.test(
        file,
      ),
      file,
    )
    let source = fs.readFileSync(file, 'utf8')
    if (file.endsWith('.vue'))
      source = source.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)?.[1] || ''
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    for (const node of ast.statements) {
      if (
        !(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) ||
        !node.moduleSpecifier ||
        node.importClause?.isTypeOnly ||
        node.isTypeOnly
      )
        continue
      const name = node.moduleSpecifier.text
      if (!name.startsWith('@/') && !name.startsWith('.')) continue
      let target = name.startsWith('@/')
        ? path.join(root, 'src', name.slice(2))
        : path.resolve(path.dirname(file), name)
      if (!path.extname(target)) target += fs.existsSync(target + '.ts') ? '.ts' : '/index.ts'
      if (/\.(ts|vue)$/.test(target)) visit(target)
    }
  }
  routes.forEach((page) => visit(path.join(root, 'src', page.path + '.vue')))
  assert(seen.size > 30)
})

check(
  '401 redirects once with return route; old-session 401 cannot clear a new login',
  async () => {
    const h = fixture()
    await h.login()
    const http = h.module('utils/http.ts')
    const requests = []
    h.uni.request = (options) => requests.push(options)
    const rejected = (p) =>
      p.then(
        () => assert.fail('must reject'),
        () => {},
      )
    const one = rejected(http.request({ url: '/user/orders' }))
    const two = rejected(http.request({ url: '/user/orders' }))
    const before = h.navigations.length
    requests[0].success({ statusCode: 401, data: { message: 'expired' } })
    requests[1].success({ statusCode: 401, data: { message: 'expired' } })
    await Promise.all([one, two])
    assert.equal(h.account.token, '')
    assert.equal(h.navigations.length, before + 1)
    assert(h.navigation.url.includes('returnUrl='))
    h.account.setToken('old')
    const stale = rejected(http.request({ url: '/user/orders' }))
    h.account.setToken('new')
    requests[2].success({ statusCode: 401, data: { message: 'old' } })
    await stale
    assert.equal(h.account.token, 'new')
    assert.equal(h.navigations.length, before + 1)
    h.close()
  },
)
check('closed store blocks quote and submit; manager conflict refreshes server order', async () => {
  const h = fixture({
    '@/api/shop': {
      getStoreApi: async () => ({ data: { ...store, isOpen: false } }),
      getProductApi: async () => ({ data: product }),
    },
  })
  await h.login()
  const p = await h.checkout()
  assert(p.failed.value)
  await p.submit()
  assert.equal(h.quotes.length, 0)
  assert.equal(h.orders.size, 0)
  h.close()
  const other = fixture()
  await other.login()
  const created = await other.checkout()
  await created.submit()
  const no = created.createdOrderNo.value
  await other.login('manager')
  const detail = other.page('store-order-detail')
  await detail.enter({ orderNo: no })
  other.orders.get(no).version++
  other.orders.get(no).status = 'ACCEPTED'
  await detail.advanceOrder()
  assert.equal(detail.order.value.status, 'preparing')
  assert.equal(detail.order.value.version, 2)
  other.close()
})
check('address adapter sends confirmed HTTP contract and maps numeric ID/region', async () => {
  const requests = []
  const dto = {
    id: 21,
    name: '花友',
    phone: '13800000000',
    province: '浙江省',
    city: '杭州市',
    district: '西湖区',
    regionCode: null,
    detail: '花园路',
    isDefault: true,
  }
  const h = createHarness({
    '@/utils/http': {
      request: async (options) => {
        requests.push(options)
        return { code: 200, data: options.method === 'GET' ? [dto] : dto }
      },
      resolveApiImage: (value) => value,
    },
  })
  const service = h.module('pages/addresses/address-actions.ts')
  const list = await service.getAddresses()
  assert.equal(list[0].id, '21')
  assert.equal(list[0].region, '浙江省 杭州市 西湖区')
  const input = {
    name: dto.name,
    phone: dto.phone,
    province: dto.province,
    city: dto.city,
    district: dto.district,
    detail: dto.detail,
    isDefault: false,
  }
  await service.saveAddress('', input)
  await service.saveAddress('21', input)
  await service.setDefaultAddress('21')
  await service.deleteAddress('21')
  assert.deepEqual(
    requests.map((item) => [item.method, item.url]),
    [
      ['GET', '/user/addresses'],
      ['POST', '/user/addresses'],
      ['PUT', '/user/addresses/21'],
      ['POST', '/user/addresses/21/default'],
      ['DELETE', '/user/addresses/21'],
    ],
  )
  assert.equal(requests[1].data.region, undefined)
  assert.equal(requests[1].data.userId, undefined)
  assert.equal(requests[1].data.province, '浙江省')
  await assert.rejects(service.deleteAddress('address-old'))
  assert.equal(requests.length, 5)
  h.close()
})
check(
  'address failure keeps manual checkout available and account switch discards old addresses',
  async () => {
    const h = fixture({
      '@/api/addresses': {
        listAddressesApi: async () => {
          throw Error('offline')
        },
      },
    })
    await h.login()
    const p = await h.checkout({ method: 'delivery' })
    assert(p.addressMessage.value.includes('失败'))
    p.address.value = '手动地址'
    await p.submit()
    assert.equal(h.orders.size, 1)
    h.close()
    const old = deferred()
    const next = fixture({ '@/api/addresses': { listAddressesApi: () => old.promise } })
    await next.login()
    const page = next.page('addresses')
    const loading = page.resource.load()
    next.account.setToken('other')
    old.resolve({
      data: [
        { id: 8, name: '旧用户', province: '省', city: '市', district: '区', isDefault: true },
      ],
    })
    await loading
    assert.equal(page.addresses.value.length, 0)
    next.close()
  },
)

check('sales request contract, cents mapping and unknown gift stems are preserved', async () => {
  let call
  const apiHarness = createHarness({
    '@/utils/http': {
      request: async (input) => {
        call = input
        return { data: emptySales }
      },
    },
  })
  await apiHarness.module('api/sales.ts').getSalesApi({ storeId: 2, period: 'month' })
  assert.deepEqual(JSON.parse(JSON.stringify(call)), {
    method: 'GET',
    url: '/admin/sales',
    data: { storeId: 2, period: 'month' },
  })
  apiHarness.close()
  let calls = 0
  const h = fixture({
    '@/api/sales': {
      getSalesApi: async () => {
        calls++
        return {
          data: {
            ...emptySales,
            amount: 9001,
            average: 3000,
            deliveryAmount: 600,
            receivedAmount: 9601,
            giftAmount: 2000,
            giftStems: null,
            giftUnknownStemsCount: 1,
            giftExceptionCount: 2,
            states: [
              { status: 'REFUND_UNKNOWN', count: 2 },
              { status: 'READY', count: 1 },
            ],
          },
        }
      },
    },
  })
  const service = h.module('pages/store-stats/sales-summary.ts')
  for (const query of [
    { storeId: 0, period: 'today' },
    { storeId: 1.1, period: 'week' },
    { storeId: 1, period: 'year' },
  ])
    await assert.rejects(service.getSales(query), /统计筛选无效/)
  assert.equal(calls, 0)
  const data = await service.getSales({ storeId: 1, period: 'today' })
  assert.equal(data.amount, 90.01)
  assert.equal(data.average, 30)
  assert.equal(data.deliveryAmount, 6)
  assert.equal(data.receivedAmount, 96.01)
  assert.equal(data.giftAmount, 20)
  assert.equal(data.giftStems, null)
  assert.equal(data.giftExceptionCount, 2)
  assert.equal(data.states[0].label, '其他状态')
  assert.equal(data.states[1].label, '待自取或配送')
  h.close()
})
check(
  'sales failures clear prior values, retry loads, account changes discard old results',
  async () => {
    let failure = false,
      delayed = false
    const old = deferred()
    const h = fixture({
      '@/api/sales': {
        getSalesApi: async () => {
          if (failure) throw new Error('统计网络失败')
          if (delayed) return old.promise
          return { data: { ...emptySales, amount: 9001 } }
        },
      },
    })
    await h.login('manager')
    const p = h.page('store-stats')
    await p.enter()
    assert.equal(p.sales.value.amount, 90.01)
    failure = true
    p.period.value = 'month'
    await settle()
    assert.equal(p.sales.value, undefined)
    assert.equal(p.message.value, '加载失败，请重试')
    assert.equal(p.pending.value, false)
    failure = false
    await p.init()
    assert.equal(p.sales.value.amount, 90.01)
    delayed = true
    p.period.value = 'week'
    await settle()
    assert.equal(p.sales.value, undefined)
    h.account.clearProfile()
    old.resolve({ data: { ...emptySales, amount: 99900 } })
    await settle()
    assert.equal(p.sales.value, undefined)
    assert.equal(p.selectedStoreId.value, undefined)
    h.close()
  },
)
;(async () => {
  for (const { name, fn } of checks) {
    await fn()
    console.log('PASS ' + name)
  }
  console.log(checks.length + ' integration checks passed')
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
