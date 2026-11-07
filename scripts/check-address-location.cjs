const { createHarness, settle, assert } = require('./integration-harness.cjs')

async function main() {
  const point = { latitude: 30.2, longitude: 120.1, name: '花园小区', address: '浙江省杭州市西湖区花园路8号花园小区' }
  let list = [], saved, choices = 0, resolveCalls = 0
  const h = createHarness({
    '@/api/addresses': {
      listAddressesApi: async () => ({ data: list }),
      resolveAddressLocationApi: () => { resolveCalls++; throw new Error('必须使用无 Key 原生选址') },
      createAddressApi: async input => { saved = input; list = [{ ...input, id: 1 }]; return { data: list[0] } },
      updateAddressApi: async (_id, input) => { saved = input; list = [{ ...input, id: 1 }]; return { data: list[0] } },
    },
  })
  const { resolveLocalAddress: parse, locationDetail } = h.module('pages/addresses/address-location.ts')
  const expected = [
    ['浙江省杭州市西湖区花园路8号', '浙江省', '杭州市', '西湖区', '330106'],
    ['杭州市西湖区花园路8号', '浙江省', '杭州市', '西湖区', '330106'],
    ['北京市海淀区中关村大街1号', '北京市', '北京市', '海淀区', '110108'],
    ['北京市北京市海淀区中关村大街1号', '北京市', '北京市', '海淀区', '110108'],
    ['重庆市重庆市巫山县巫峡路', '重庆市', '重庆市', '巫山县', '500237'],
    ['广西南宁市青秀区民族大道', '广西壮族自治区', '南宁市', '青秀区', '450103'],
    ['内蒙古自治区呼和浩特市新城区新华大街', '内蒙古自治区', '呼和浩特市', '新城区', '150102'],
    ['江西省南昌市西湖区站前路', '江西省', '南昌市', '西湖区', '360103'],
  ]
  for (const [address, province, city, district, regionCode] of expected) {
    const result = parse(address, '')
    assert.equal(result.complete, true, address)
    assert.deepEqual({ ...result.region }, { province, city, district, regionCode }, address)
  }
  for (const address of ['西湖区花园路', '花园小区', '浙江省不存在市西湖区', '浙江省杭州市未知新区', '浙江省海淀区某街道']) {
    const result = parse(address, '')
    assert.equal(result.complete, false, address)
    assert.equal(result.region.regionCode, '')
    assert.equal(result.detail, address)
  }
  const region = parse(point.address, point.name).region
  assert.equal(parse(point.address, point.name).detail, '花园路8号花园小区')
  assert.equal(parse('浙江省杭州市西湖区花园路8号', point.name).detail, '花园路8号 花园小区')
  assert.equal(locationDetail('浙江省杭州市西湖区西湖区文化馆', '西湖区文化馆', region), '西湖区文化馆')
  h.uni.chooseLocation = options => { choices++; options.success(point) }
  h.account.setToken('user-a')
  const p = h.page('addresses')
  await p.enter()
  p.openEditor()
  p.name.value = '花友'
  p.phone.value = '13800000000'
  await p.searchAddress()
  assert.equal(p.province.value, '浙江省')
  assert.equal(p.city.value, '杭州市')
  assert.equal(p.district.value, '西湖区')
  assert.equal(p.originalRegionCode.value, '330106')
  assert.equal(p.name.value, '花友')
  assert.equal(p.phone.value, '13800000000')
  assert.equal(p.locating.value, false)
  p.detail.value += ' 2栋301室'
  await p.saveAddress()
  assert.equal(saved.regionCode, '330106')
  assert.equal(saved.detail, '花园路8号花园小区 2栋301室')
  p.openEditor(p.addresses.value[0])
  const snapshot = () => JSON.stringify([p.province.value, p.city.value, p.district.value, p.detail.value, p.originalRegionCode.value])
  const before = snapshot()
  h.uni.showModal = options => options.success({ confirm: false })
  await p.searchAddress()
  assert.equal(snapshot(), before)
  h.uni.showModal = options => options.success({ confirm: true })
  h.uni.chooseLocation = options => options.success({ ...point, address: '北京市海淀区中关村大街1号', name: '中关村大厦' })
  await p.searchAddress()
  assert.equal(p.city.value, '北京市')
  assert.equal(p.detail.value, '中关村大街1号 中关村大厦')
  assert.equal(p.originalRegionCode.value, '110108')
  p.district.value = '朝阳区'
  assert.equal(p.originalRegionCode.value, null)
  await p.saveAddress()
  assert.equal(saved.regionCode, '')
  p.openEditor(p.addresses.value[0])
  const unchanged = snapshot()
  for (const errMsg of ['chooseLocation:fail cancel', 'chooseLocation:fail auth deny', 'chooseLocation:fail timeout']) {
    h.uni.chooseLocation = options => options.fail({ errMsg })
    await p.searchAddress()
    assert.equal(snapshot(), unchanged)
    assert.equal(p.locating.value, false)
    if (/cancel/.test(errMsg)) assert.equal(p.locationError.value, '')
    else assert(p.locationError.value)
  }
  // 匹配不完整也保留地图原文，但清除旧地区，不能用旧地区静默保存新地点。
  h.uni.chooseLocation = options => options.success({ ...point, address: '未知新区花园路', name: '花园小区' })
  await p.searchAddress()
  assert.equal(p.province.value, '')
  assert.equal(p.city.value, '')
  assert.equal(p.district.value, '')
  assert.equal(p.originalRegionCode.value, '')
  assert.equal(p.detail.value, '未知新区花园路 花园小区')
  assert.match(p.locationError.value, /补齐/)
  const previousSaved = saved
  await p.saveAddress()
  assert.equal(saved, previousSaved)
  // 打开地图期间阻止重复调用和保存；关闭再打开不会接收旧回调。
  p.openEditor(p.addresses.value[0])
  const prior = snapshot()
  let chooser
  h.uni.chooseLocation = options => { choices++; chooser = options }
  const running = p.searchAddress()
  const count = choices
  await p.searchAddress()
  await p.saveAddress()
  assert.equal(choices, count)
  assert.equal(saved, previousSaved)
  p.closeEditor()
  p.openEditor(p.addresses.value[0])
  chooser.success(point)
  await running
  assert.equal(snapshot(), prior)
  assert.equal(p.locating.value, false)
  // 用户在覆盖确认框停留时切换账户，确认后也不能回填到新账户。
  h.uni.chooseLocation = options => options.success(point)
  let modal
  h.uni.showModal = options => { modal = options }
  const switching = p.searchAddress()
  await settle()
  h.account.setToken('user-b')
  modal.success({ confirm: true })
  await switching
  assert.equal(p.showEditor.value, false)
  assert.equal(p.province.value, '')
  assert.equal(p.detail.value, '')
  assert.equal(p.locating.value, false)
  assert.equal(resolveCalls, 0)
  assert.equal(h.calls.length, 0)
  h.close()
  console.log('PASS: 无 Key 原生选址、本地区划/直辖市/自治区/同名区县、原文兜底、保存/覆盖/取消/拒权、异步隔离；无解析接口请求')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
