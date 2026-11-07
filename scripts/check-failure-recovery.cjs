// 异常响应、账号切换、门店重试和支付轮询生命周期；不访问真实接口。
const { createHarness, deferred, settle, assert, root } = require('./integration-harness.cjs')
const fs = require('node:fs')
const path = require('node:path')

async function httpFailures() {
  const h = createHarness()
  const http = h.module('utils/http.ts')
  let pending
  h.uni.request = (options) => { pending = options }
  for (const statusCode of [200, 401, 502]) {
    h.account.setToken('customer')
    const result = assert.rejects(http.request({ url: '/test' }))
    assert.doesNotThrow(() => pending.success({ statusCode, data: null }))
    await result
  }
  h.close()
}

async function profileIsolation() {
  let read = deferred(), write = deferred(), writes = 0
  const h = createHarness({ '@/api/user': {
    getCurrentUserApi: () => read.promise,
    updateCurrentUserApi: () => { writes++; return write.promise },
  } })
  h.account.setToken('first')
  const p = h.page('profile')
  const newLoad = p.loadProfile()
  read.resolve({ data: { nickname: '最新资料', age: 20 } })
  await newLoad
  p.form.nickname = '待保存'
  const oldSave = p.save()
  h.account.setToken('second')
  assert.equal(p.ready.value, false)
  assert.equal(p.form.nickname, '')
  await p.save()
  assert.equal(writes, 1)
  read = deferred()
  const secondLoad = p.loadProfile()
  read.resolve({ data: { nickname: '第二账户' } })
  await secondLoad
  p.form.nickname = '第二账户修改'
  const firstWrite = write
  write = deferred()
  const secondSave = p.save()
  firstWrite.reject(new Error('旧账户保存失败'))
  await oldSave
  assert.equal(p.saving.value, true)
  assert.equal(p.error.value, '')
  write.resolve({ data: { nickname: '第二账户修改' } })
  await secondSave
  assert.equal(h.account.profile.nickname, '第二账户修改')
  h.close()
}

async function profileLatest() {
  const reads = [deferred(), deferred()]
  let index = 0
  const h = createHarness({ '@/api/user': { getCurrentUserApi: () => reads[index++].promise } })
  h.account.setToken('customer')
  const p = h.page('profile')
  const first = p.loadProfile(), second = p.loadProfile()
  reads[1].resolve({ data: { nickname: '新资料' } })
  await second
  reads[0].resolve({ data: { nickname: '旧资料' } })
  await first
  assert.equal(p.form.nickname, '新资料')
  assert.equal(h.account.profile.nickname, '新资料')
  for (const fn of p.hooks.onUnload) fn()
  assert.equal(p.ready.value, false)
  h.close()
}

async function managerRetry() {
  let failStores = true, storeCalls = 0
  const h = createHarness({
    '@/api/user': { getCurrentUserApi: async () => ({ data: { role: 'STORE_MANAGER' } }) },
    '@/api/manage-orders': {
      getManagedStoresApi: async () => {
        storeCalls++
        if (failStores) throw new Error('网络失败')
        return { data: [{ id: 1, name: '门店' }] }
      },
      getManageOrdersApi: async () => ({ data: { list: [], total: 0 } }),
    },
  })
  h.account.setToken('manager')
  const p = h.page('store-orders')
  await p.enter()
  assert.equal(p.failed.value, true)
  const source = fs.readFileSync(path.join(root, 'src/pages/store-orders/index.vue'), 'utf8')
  const handler = source.match(/@click="(\w+)"[^>]*>刷新订单/)[1]
  failStores = false
  await p[handler]()
  assert.equal(storeCalls, 2)
  assert.equal(p.selectedStoreId.value, 1)
  assert.equal(p.failed.value, false)
  h.close()
}

async function paymentLifecycle() {
  let read = deferred(), requests = 0, nextId = 0
  const timers = new Map()
  const h = createHarness({ '@/pages/orders/order-data': {
    getOrder: () => { requests++; return read.promise },
  } }, {
    setInterval: (fn) => { timers.set(++nextId, fn); return nextId },
    clearInterval: (id) => timers.delete(id),
  })
  h.account.setToken('customer')
  const p = h.page('payment-result')
  await p.enter({ orderNo: 'ORD-1' })
  for (const fn of p.hooks.onHide) fn()
  read.resolve({ paymentStatus: 'PENDING' })
  await settle()
  assert.equal(timers.size, 0, '离开后收到请求不能重建定时器')
  await p.show()
  assert.equal(timers.size, 1)
  read = deferred()
  const tick = [...timers.values()][0]
  tick()
  const count = requests
  tick()
  assert.equal(requests, count, '慢请求期间不能再发起轮询')
  read.resolve({ paymentStatus: 'PAID' })
  await settle()
  assert.equal(timers.size, 0)
  assert.equal(p.order.value.paymentStatus, 'PAID')
  h.close()
}

async function main() {
  await httpFailures()
  await profileIsolation()
  await profileLatest()
  await managerRetry()
  await paymentLifecycle()
  const oldCoupons = deferred()
  const h = createHarness({ '@/api/coupon': { getUserCouponsApi: () => oldCoupons.promise } })
  h.account.setToken('first')
  h.account.setProfile({ id: 1 })
  const coupons = h.page('coupons')
  const loading = coupons.loadCoupons()
  h.account.clearProfile()
  oldCoupons.resolve({ data: [{ id: 10, status: 'AVAILABLE' }] })
  await loading
  assert.equal(coupons.coupons.value.length, 0)
  assert.equal(coupons.message.value, '请先登录')
  const my = h.page('my')
  let modal
  h.uni.showModal = (options) => { modal = options }
  my.showRules()
  assert.equal(modal.title, '花礼使用说明')
  assert(modal.content.includes('配送费不参与抵扣'))
  h.close()
  console.log('PASS: 空响应拒绝、资料账户/并发隔离、店长初始化重试、支付轮询离开和慢请求保护')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
