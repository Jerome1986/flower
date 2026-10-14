export function positiveId(value: string) {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))
}
export function positiveQuantity(value: number) {
  return Number.isSafeInteger(value) && value > 0
}
export function makeRequestKey() {
  return (
    'order-' +
    Date.now() +
    '-' +
    Math.random().toString(36).slice(2) +
    '-' +
    Math.random().toString(36).slice(2)
  )
}
