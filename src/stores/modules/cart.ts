import { useUserStore } from '@/stores/modules/user'
import type { CartConfirmation, CartDraft, CartItem } from '@/types/cart'
import type { CartOrderSubmission } from '@/types/order-api'
import { makeRequestKey } from '@/utils/order-input'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
const storageKey = 'flower-cart-v1'
const identityFields = [
  'storeId',
  'productId',
  'specId',
  'method',
  'contactName',
  'contactPhone',
  'address',
  'remark',
] as const
const fulfillmentFields = ['storeId', 'method', 'contactName', 'contactPhone', 'address'] as const
export const sameFulfillment = (a: CartDraft, b: CartDraft) =>
  fulfillmentFields.every((key) => a[key].trim() === b[key].trim())
export const useCartStore = defineStore('cart', () => {
  const assertEditable = () => {
    if (confirmation.value?.submission && !confirmation.value.orderNo)
      throw new Error('请先进入确认订单页处理上次提交结果')
  }
  const commit = (
    rows: CartItem[],
    session: CartConfirmation | null = confirmation.value ?? null,
  ) => {
    if (!owner.value) throw new Error('请先登录')
    const next = { ...accounts.value, [owner.value]: rows }
    const nextSessions = { ...confirmations.value }
    if (session) nextSessions[owner.value] = session
    else delete nextSessions[owner.value]
    uni.setStorageSync(storageKey, JSON.stringify({ accounts: next, confirmations: nextSessions }))
    accounts.value = next
    confirmations.value = nextSessions
  }
  const conflicts = (input: CartDraft) => {
    return items.value.some((row) => !sameFulfillment(row, input))
  }
  const add = (input: CartDraft, available: number, replace = false) => {
    assertEditable()
    if (!replace && conflicts(input)) throw new Error('购物车只能使用同一门店、配送方式和收花信息')
    const rows = replace ? [] : items.value
    const existing = rows.find((row) =>
      identityFields.every((field) => row[field] === input[field]),
    )
    const quantity = input.quantity + (existing?.quantity || 0)
    const specTotal =
      rows
        .filter((row) => row.specId === input.specId)
        .reduce((sum, row) => sum + row.quantity, 0) + input.quantity
    if (!Number.isInteger(quantity) || quantity < 1 || specTotal > Math.min(available, 999))
      throw new Error('加入后数量超过库存或购买上限')
    const row: CartItem = {
      ...input,
      id: existing?.id || makeRequestKey(),
      quantity,
      selected: true,
    }
    commit(
      existing ? rows.map((item) => (item.id === existing.id ? row : item)) : [...rows, row],
      null,
    )
  }
  const update = (
    id: string,
    patch: Partial<
      Pick<
        CartItem,
        | 'quantity'
        | 'selected'
        | 'unitPrice'
        | 'image'
        | 'storeName'
        | 'productName'
        | 'specName'
        | 'unit'
      >
    >,
  ) => {
    if ('quantity' in patch || 'selected' in patch) assertEditable()
    commit(
      items.value.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      'quantity' in patch ? null : confirmation.value ?? null,
    )
  }
  // 一次性更新所有商品的收花信息，并清除旧结算快照。
  const updateContact = (contact: Pick<CartDraft, 'contactName' | 'contactPhone' | 'address'>) => {
    assertEditable()
    commit(
      items.value.map((item) => ({
        ...item,
        ...contact,
      })),
      null,
    )
  }
  const select = (ids: string[], value: boolean) => {
    assertEditable()
    commit(items.value.map((item) => (ids.includes(item.id) ? { ...item, selected: value } : item)))
  }
  const remove = (id: string) => {
    assertEditable()
    commit(
      items.value.filter((item) => item.id !== id),
      null,
    )
  }
  const clear = () => {
    assertEditable()
    commit([], null)
  }
  const begin = (ids: string[]) => {
    if (confirmation.value?.submission && !confirmation.value.orderNo) return confirmation.value.id
    if (mixed.value) throw new Error('请先删除不同门店或收花信息的商品')
    const rows = items.value.filter((row) => ids.includes(row.id))
    if (!rows.length) throw new Error('请选择商品')
    if (rows.length > 100) throw new Error('每笔订单最多100条商品')
    const session: CartConfirmation = {
      id: makeRequestKey(),
      owner: owner.value,
      items: JSON.parse(JSON.stringify(rows)),
    }
    commit(items.value, session)
    return session.id
  }
  const lockSubmission = (id: string, submission: CartOrderSubmission) => {
    if (confirmation.value?.id !== id) throw new Error('结算信息已变化，请返回购物车')
    commit(items.value, {
      ...confirmation.value,
      submission: JSON.parse(JSON.stringify(submission)),
    })
  }
  const unlock = (id: string) => {
    if (confirmation.value?.id === id)
      commit(items.value, { ...confirmation.value, submission: undefined })
  }
  const complete = (id: string, orderNo: string) => {
    const session = confirmation.value
    if (!session || session.id !== id) throw new Error('结算信息已变化')
    if (session.orderNo) return
    const rows = items.value
      .map((row) => {
        const submitted = session.items.find((item) => item.id === row.id)
        return { ...row, quantity: row.quantity - (submitted?.quantity || 0) }
      })
      .filter((row) => row.quantity > 0)
    commit(rows, { ...session, orderNo })
  }
  const user = useUserStore()
  // 与现有 store 共用 uni 本地存储；先同步落盘再发布状态，确保存储失败可以重试。
  const accounts = ref<Record<string, CartItem[]>>({})
  const confirmations = ref<Record<string, CartConfirmation>>({})
  try {
    const saved = uni.getStorageSync(storageKey)
    const raw = saved ? JSON.parse(saved) : {}
    const parsed = raw.accounts ?? raw
    if (raw.confirmations && typeof raw.confirmations === 'object')
      confirmations.value = raw.confirmations
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [key, rows] of Object.entries(parsed)) {
        if (/^\d+$/.test(key) && Array.isArray(rows)) {
          accounts.value[key] = rows.filter(
            (item) =>
              item &&
              [
                'id',
                'storeName',
                'productName',
                'image',
                'specName',
                'unit',
                ...identityFields,
              ].every((field) => typeof item[field] === 'string') &&
              ['pickup', 'delivery'].includes(item.method) &&
              Number.isInteger(item.quantity) &&
              item.quantity >= 1 &&
              item.quantity <= 999 &&
              Number.isSafeInteger(item.unitPrice) &&
              item.unitPrice >= 0 &&
              typeof item.selected === 'boolean',
          )
        }
      }
    }
  } catch {
    // 本地缓存损坏时使用空购物车，不把异常缓存恢复为有效订单。
  }
  const owner = computed(() => (user.token && user.profile?.id ? String(user.profile.id) : ''))
  const items = computed(() => (owner.value ? accounts.value[owner.value] || [] : []))
  const confirmation = computed(() => (owner.value ? confirmations.value[owner.value] : undefined))
  const mixed = computed(() => items.value.some((item) => !sameFulfillment(items.value[0], item)))
  const fulfillment = computed(() => (!mixed.value ? items.value[0] : undefined))
  return {
    items,
    owner,
    mixed,
    fulfillment,
    confirmation,
    conflicts,
    add,
    update,
    updateContact,
    select,
    remove,
    clear,
    begin,
    lockSubmission,
    unlock,
    complete,
  }
})
