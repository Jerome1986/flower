const { createHarness, assert } = require('./integration-harness.cjs')

async function main() {
  let calls = 0
  const h = createHarness({
    '@/api/user': {
      wxLogin: async () => {
        calls++
        return { code: 200, data: { token: 'token', user: { id: 1 } } }
      },
    },
  })
  const routes = h.module('utils/login-return.ts')
  const target = '/pages/checkout/index?id=1&storeId=2&specId=3&quantity=4&method=pickup'
  routes.openAuthPage(target)
  assert.equal(h.navigation.url, '/pages/login/index?returnUrl=' + encodeURIComponent(target))
  h.account.setToken('token')
  routes.openAuthPage(target)
  assert.equal(h.navigation.url, target)
  assert.equal(routes.safeReturnUrl('https://example.com'), '')
  assert.equal(routes.safeReturnUrl('/pages/login/index'), '')
  h.account.clearProfile()
  const page = h.page('login')
  await page.enter({ returnUrl: encodeURIComponent(target) })
  h.uni.login = async () => ({ code: 'wx-code' })
  await page.handleLogin({ detail: { code: 'phone-code' } })
  assert.equal(calls, 0)
  page.agreed.value = true
  await page.handleLogin({ detail: {} })
  assert.equal(calls, 0)
  await Promise.all([
    page.handleLogin({ detail: { code: 'phone-code' } }),
    page.handleLogin({ detail: { code: 'phone-code' } }),
  ])
  assert.equal(calls, 1)
  assert.equal(h.navigation.url, target)
  assert.equal(h.account.token, 'token')
  await page.enter({ returnUrl: '/pages/my/index' })
  await page.handleLogin({ detail: { code: 'phone-code' } })
  assert.equal(h.navigation.url, '/pages/my/index')
  h.uni.login = async () => { throw new Error('denied') }
  await page.handleLogin({ detail: { code: 'phone-code' } })
  assert.equal(page.loading.value, false)
  h.close()
  console.log('PASS: 登录入口、返回参数、授权拒绝、重复提交、登录保存、Tab 返回和失败恢复')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
