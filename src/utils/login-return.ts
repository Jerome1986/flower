import pages from '@/pages.json'
const paths = new Set(pages.pages.map((page) => '/' + page.path))
export function safeReturnUrl(value = '') {
  // uni-app 已解析查询参数；仅在值仍编码时解码一次。
  let url = value
  try {
    if (!url.startsWith('/')) url = decodeURIComponent(url)
  } catch {
    return ''
  }
  const path = url.split('?')[0]
  return paths.has(path) && path !== '/pages/test-login/index' ? url : ''
}
export function currentReturnUrl() {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as
    | { route?: string; options?: Record<string, string> }
    | undefined
  if (!page?.route) return ''
  const query = Object.entries(page.options || {})
    .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value))
    .join('&')
  return safeReturnUrl('/' + page.route + (query ? '?' + query : ''))
}
