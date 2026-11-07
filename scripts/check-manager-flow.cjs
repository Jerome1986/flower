const { createHarness, deferred, settle, assert } = require('./integration-harness.cjs')

async function main() {
  let role = 'STORE_MANAGER'
  let delayedSales
  let current = { orderNo: 'ORD-1', userId: 10, storeId: 1, type: 'ORDINARY', method: 'PICKUP', status: 'PENDING_ACCEPTANCE', paymentStatus: 'NOT_REQUIRED', version: 1, payableAmount: 0, productAmount: 3000, discountAmount: 3000, deliveryFee: 0, pickupCode: null }
  const actions = []
  const salesQueries = []
  const h = createHarness({
    '@/api/user': { getCurrentUserApi: async () => ({ data: { id: 1, role } }) },
    '@/api/manage-orders': {
      getManagedStoresApi: async () => ({ data: [{ id: 1, name: '甲店' }, { id: 2, name: '乙店' }] }),
      getManageOrdersApi: async (query) => ({ data: { list: query.storeId === 1 ? [current] : [], total: query.storeId === 1 ? 1 : 0 } }),
      getManageOrderApi: async () => ({ data: current }),
      performOrderActionApi: async (no, body) => {
        actions.push(body)
        assert.equal(body.version, current.version)
        if (body.action === 'complete' && current.method === 'PICKUP' && body.pickupCode !== '123456') throw new Error('核销码错误')
        current = { ...current, status: { accept: 'ACCEPTED', ready: 'READY', deliver: 'DELIVERING', complete: 'COMPLETED' }[body.action], version: current.version + 1 }
        return { data: current }
      },
    },
    '@/pages/store-stats/sales-summary': { getSales: async (query) => {
      salesQueries.push({ ...query })
      return delayedSales ? delayedSales.promise : { amount: query.storeId, states: [] }
    } },
  })
  h.account.setToken('manager')
  h.account.setProfile({ id: 1, role })
  const list = h.page('store-orders')
  await list.enter()
  assert.equal(list.orders.value.length, 1)
  for (const expected of ['preparing', 'ready']) {
    await list.advanceOrder(list.orders.value[0])
    assert.equal(list.orders.value[0].status, expected)
  }
  const service = h.module('pages/store-orders/order-actions.ts')
  assert.equal(service.manageAction({ type: 'ordinary', status: 'pending', paymentStatus: 'PENDING' }), undefined)
  assert.equal(service.manageAction({ type: 'custom', status: 'pending', paymentStatus: 'NOT_REQUIRED' }), undefined)
  h.modalInput = 'abc'
  const before = actions.length
  await list.advanceOrder(list.orders.value[0])
  assert.equal(actions.length, before)
  assert(h.toasts.some((text) => text.includes('6位数字')))
  h.modalInput = '000000'
  await list.advanceOrder(list.orders.value[0])
  assert.equal(list.orders.value[0].status, 'ready')
  h.modalInput = '123456'
  await list.advanceOrder(list.orders.value[0])
  assert.equal(list.orders.value[0].status, 'completed')
  const detail = h.page('store-order-detail')
  current = { ...current, method: 'DELIVERY', status: 'READY' }
  await detail.enter({ orderNo: current.orderNo })
  await detail.advanceOrder()
  assert.equal(detail.order.value.status, 'delivering')
  await detail.advanceOrder()
  assert.equal(detail.order.value.status, 'completed')
  list.chooseStore({ detail: { value: 1 } })
  await settle()
  assert.equal(list.orders.value.length, 0)
  const actionCount = actions.length
  await list.advanceOrder({ type: 'ordinary', storeId: '1', status: 'pending', paymentStatus: 'NOT_REQUIRED' })
  assert.equal(actions.length, actionCount)
  const stats = h.page('store-stats')
  await stats.enter()
  assert.equal(stats.sales.value.amount, 1)
  stats.chooseStore({ detail: { value: 1 } })
  await settle()
  assert.equal(stats.sales.value.amount, 2)
  stats.period.value = 'month'
  await settle()
  assert.equal(salesQueries.at(-1).period, 'month')
  delayedSales = deferred()
  const pending = stats.loadSales()
  h.account.setToken('other')
  delayedSales.resolve({ amount: 999, states: [] })
  await pending
  assert.equal(stats.sales.value, undefined)
  assert.equal(list.orders.value.length, 0)
  assert.equal(detail.order.value, null)
  delayedSales = undefined
  role = 'CUSTOMER'
  await stats.show()
  assert.equal(stats.isManager.value, false)
  assert.equal(stats.sales.value, undefined)
  h.close()
  console.log('PASS: 店长接单备货、自取码校验、配送完成、跨店操作拦截、统计切店/时间及账号角色隔离')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
