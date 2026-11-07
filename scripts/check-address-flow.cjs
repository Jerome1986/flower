const { createHarness, deferred, settle, assert } = require('./integration-harness.cjs')

async function main() {
  const address = { id: 8, name: '花友', phone: '13800000008', province: '浙江省', city: '杭州市', district: '西湖区', detail: '花园路8号', regionCode: '330106', isDefault: true }
  let list = []
  let rejectSave = true
  let fetchList = async () => ({ data: list })
  const h = createHarness({
    '@/api/addresses': {
      listAddressesApi: () => fetchList(),
      createAddressApi: async (input) => {
        if (rejectSave) throw new Error('保存失败')
        list = [{ ...address, ...input }]
        return { data: list[0] }
      },
      updateAddressApi: async (id, input) => { list = [{ ...address, ...input }]; return { data: list[0] } },
      deleteAddressApi: async () => { list = [] },
      setDefaultAddressApi: async () => { list = list.map((item) => ({ ...item, isDefault: true })) },
    },
  })
  h.account.setToken('user-a')
  const p = h.page('addresses')
  await p.enter({ select: '1', selectedId: '8' })
  p.openEditor()
  for (const key of ['name', 'phone', 'province', 'city', 'district', 'detail']) p[key].value = address[key]
  await p.saveAddress()
  assert.equal(p.showEditor.value, true)
  assert.equal(p.name.value, address.name)
  assert.equal(p.addresses.value.length, 0)
  rejectSave = false
  await p.saveAddress()
  assert.equal(p.showEditor.value, false)
  assert.equal(p.addresses.value[0].id, '8')
  p.openEditor(p.addresses.value[0])
  p.district.value = '上城区'
  await p.saveAddress()
  assert.equal(list[0].regionCode, '')
  await p.setDefault('8')
  assert.equal(p.addresses.value[0].isDefault, true)
  const selected = p.addresses.value[0]
  for (const name of ['checkout', 'custom-checkout']) {
    const checkout = h.page(name)
    if (name === 'checkout') checkout.method.value = 'delivery'
    await checkout.loadDefaultAddress()
    assert.equal(checkout.name.value, address.name)
    assert.equal(checkout.phone.value, address.phone)
    assert(checkout.address.value.includes('上城区'))
    checkout.name.value = '手填姓名'
    checkout.address.value = '手填地址'
    await checkout.loadDefaultAddress()
    assert.equal(checkout.address.value, '手填地址')
    checkout.name.value = ''
    checkout.address.value = ''
    const old = deferred()
    fetchList = () => old.promise
    const waiting = checkout.loadDefaultAddress()
    fetchList = async () => ({ data: list })
    await checkout.loadDefaultAddress()
    old.reject(new Error('旧请求失败'))
    await waiting
    assert.equal(checkout.addressMessage.value, '')
    const failed = deferred()
    fetchList = () => failed.promise
    const selecting = checkout.loadDefaultAddress()
    checkout.chooseAddress()
    const picker = h.page('addresses')
    fetchList = async () => ({ data: list })
    await picker.enter({ select: '1' })
    picker.selectAddress(picker.addresses.value[0])
    failed.reject(new Error('选址前请求失败'))
    await selecting
    assert.equal(checkout.addressMessage.value, '')
    assert.equal(checkout.phone.value, address.phone)
    fetchList = async () => { throw new Error('网络错误') }
    await checkout.loadDefaultAddress()
    assert(checkout.addressMessage.value)
    fetchList = async () => ({ data: list })
    await checkout.loadDefaultAddress()
    assert.equal(checkout.addressMessage.value, '')
    const stale = deferred()
    fetchList = () => stale.promise
    const changing = checkout.loadDefaultAddress()
    h.account.setToken('user-b')
    stale.resolve({ data: list })
    await changing
    assert.equal(checkout.name.value, '')
    assert.equal(checkout.address.value, '')
    h.account.setToken('user-a')
    fetchList = async () => ({ data: list })
  }
  await p.show()
  p.openEditor(p.addresses.value[0])
  h.account.setToken('other')
  assert.equal(p.selectedId.value, '')
  assert.equal(p.editingId.value, '')
  assert.equal(p.showEditor.value, false)
  assert.equal(p.addresses.value.length, 0)
  await p.show()
  p.deleteAddress(selected.id)
  await settle()
  assert.equal(p.addresses.value.length, 0)
  h.close()
  console.log('PASS: 地址增删改/默认、保存失败保留表单、双结算选址回填、手填保护、请求竞态与重试、账号隔离')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
