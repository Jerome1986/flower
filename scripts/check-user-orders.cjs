const { createHarness, deferred, settle, assert } = require('./integration-harness.cjs')

async function main() {
  const makeOrder = (status, type = 'ORDINARY', method = 'PICKUP') => ({
    orderNo: `ORD-${status}`, userId: 1, storeId: type === 'CUSTOM' ? null : 2,
    type, method, status, paymentStatus: 'NOT_REQUIRED', version: 1, logs: [],
    payableAmount: 0, productAmount: 3000, discountAmount: 3000, deliveryFee: 0,
    pickupCode: '123456', contactName: '花友', contactPhone: '13800000000', createdAt: '2026-10-29',
    serviceSnapshot: { servicePhone: '13800000001' },
  })
  let current = makeOrder('PENDING_ACCEPTANCE')
  let failCancel = false
  let pendingCancel
  let listRequest
  let listFailure = false
  let reads = 0
  let cancels = 0
  const records = [makeOrder('PENDING_ACCEPTANCE'), makeOrder('ACCEPTED'), makeOrder('READY'), makeOrder('DELIVERING'), makeOrder('COMPLETED'), makeOrder('CANCELLED'), makeOrder('CLOSED'), makeOrder('PENDING_DISPATCH', 'CUSTOM')]
  const h = createHarness({ '@/api/orders': {
    getOrdersApi: async () => { if (listFailure) throw new Error('失败'); return listRequest ? listRequest.promise : { data: records } },
    getOrderApi: async () => { reads++; return { data: current } },
    cancelOrderApi: async () => {
      cancels++
      if (pendingCancel) return pendingCancel.promise
      if (failCancel) throw new Error('冲突')
      current = { ...current, status: 'CANCELLED' }
      return { data: current }
    },
  } })
  h.account.setToken('user-a')
  const list = h.page('orders')
  await list.enter({ status: 'processing' })
  assert.equal(list.visibleOrders.value.length, 3)
  list.changeTab('fulfillment')
  assert.equal(list.visibleOrders.value.length, 2)
  list.changeTab('cancelled')
  assert.equal(list.visibleOrders.value.length, 2)
  list.changeTab('completed')
  assert.equal(list.visibleOrders.value.length, 1)
  list.changeTab('invalid')
  assert.equal(list.activeTab.value, 'completed')
  const mapping = h.module('pages/orders/order-data.ts')
  const multi = mapping.mapOrder({ ...makeOrder('PENDING_PAYMENT'), paymentStatus: 'PENDING', items: [
    { productName: '玫瑰', specName: '一束', coverImage: '/rose.png', unit: '束', quantity: 2, remark: '红色' },
    { productName: '百合', specName: '两支', coverImage: '/lily.png', unit: '份', quantity: 1, remark: '白色' },
  ] })
  assert.equal(multi.items.length, 2)
  assert.equal(multi.quantity, 3)
  assert.equal(multi.items[1].remark, '白色')
  const display = h.module('pages/orders/order-display.ts')
  assert.equal(display.canCancelUserOrder(multi), true)
  assert(display.orderHint(multi).includes('微信支付'))
  assert.equal(mapping.mapOrder(makeOrder('PENDING_DISPATCH', 'CUSTOM')).storeName, '平台定制')
  for (const status of ['PENDING_ACCEPTANCE', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'CLOSED'])
    assert.equal(mapping.mapOrder(makeOrder(status)).pickupCode, undefined)
  assert.equal(mapping.mapOrder(makeOrder('READY')).pickupCode, '123456')
  assert.equal(mapping.mapOrder(makeOrder('READY', 'ORDINARY', 'DELIVERY')).pickupCode, undefined)
  assert.equal(display.orderStageIndex(mapping.mapOrder(makeOrder('ACCEPTED'))), 1)
  assert.equal(display.orderStageIndex(mapping.mapOrder(makeOrder('DISPATCHED', 'CUSTOM'))), 1)
  assert.equal(display.orderStageIndex(mapping.mapOrder(makeOrder('COMPLETED'))), 3)
  const detail = h.page('order-detail')
  await detail.enter({ orderNo: current.orderNo })
  assert.equal(detail.canCancel.value, true)
  detail.cancel()
  detail.cancel()
  await settle()
  assert.equal(cancels, 1)
  assert.equal(detail.order.value.status, 'cancelled')
  current = makeOrder('PENDING_DISPATCH', 'CUSTOM')
  await detail.show()
  assert.equal(detail.canCancel.value, true)
  let calledPhone
  h.uni.makePhoneCall = ({ phoneNumber }) => { calledPhone = phoneNumber }
  detail.contactStore()
  assert.equal(calledPhone, '13800000001')
  failCancel = true
  detail.cancel()
  await settle()
  assert(detail.cancelError.value)
  assert.equal(detail.cancelling.value, false)
  current = makeOrder('ACCEPTED')
  await detail.show()
  assert.equal(detail.canCancel.value, false)
  current = makeOrder('PENDING_ACCEPTANCE')
  await detail.show()
  failCancel = false
  pendingCancel = deferred()
  detail.cancel()
  const before = reads
  h.account.setToken('user-b')
  pendingCancel.resolve({ data: makeOrder('CANCELLED') })
  await settle()
  assert.equal(reads, before)
  assert.equal(detail.order.value, null)
  assert.equal(detail.cancelling.value, false)
  listRequest = deferred()
  const oldList = list.loadOrders()
  h.account.setToken('user-c')
  listRequest.resolve({ data: records })
  await oldList
  assert.equal(list.orders.value.length, 0)
  listRequest = undefined
  listFailure = true
  await list.show()
  assert.equal(list.failed.value, true)
  assert.equal(list.orders.value.length, 0)
  listFailure = false
  await list.show()
  assert.equal(list.failed.value, false)
  h.account.clearProfile()
  await list.show()
  list.login()
  assert(h.navigation.url.includes('returnUrl='))
  h.close()
  console.log('PASS: 订单筛选、定制展示、进度、取货码、取消成功/失败/防重复、客服、旧账号响应隔离及失败重试')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
