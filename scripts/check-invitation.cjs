const { createHarness, assert, deferred, settle } = require('./integration-harness.cjs')

async function main() {
  const summary = { code: 'ABC123', shareTitle: '邀请好友',
    sharePath: '/pages/index/index?inviteCode=ABC123', rules: '首次注册奖励',
    invitedCount: 2, rewardCount: 1, records: [] }
  let fail = false, pending
  const h = createHarness({ '@/api/marketing': {
    getInvitationApi: async () => {
      if (fail) throw Error('查询失败')
      return pending ? pending.promise : { data: summary }
    },
  } })
  const page = h.page('invite')
  await page.enter()
  assert.equal(page.message.value, '请先登录')
  h.account.setToken('user-a')
  await page.show()
  assert.equal(page.inviteCode.value, 'ABC123')
  assert.equal(page.invitation.value.rewardCount, 1)
  assert.equal(page.hooks.onShareAppMessage[0]().path, summary.sharePath)
  fail = true
  await page.show()
  assert.equal(page.invitation.value, undefined)
  assert(page.message.value)
  fail = false
  await page.show()
  assert.equal(page.inviteCode.value, 'ABC123')
  pending = deferred()
  const request = page.show()
  await settle()
  h.account.setToken('user-b')
  pending.resolve({ data: summary })
  await request
  assert.equal(page.invitation.value, undefined)
  const actions = h.module('pages/invite/invitation-actions.ts')
  actions.rememberInvitation('ABC123')
  actions.rememberInvitation('DEF456')
  assert.equal(h.storage.get('flower-pending-invite-code'), 'ABC123')
  h.storage.delete('flower-pending-invite-code')
  actions.rememberInvitation('invalid&code')
  assert.equal(h.storage.has('flower-pending-invite-code'), false)
  h.close()
  console.log('PASS: 邀请登录、数据解包、分享路径、失败重试、账户隔离和首次来源保存')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
