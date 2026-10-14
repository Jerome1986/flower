const fs = require('fs')
const path = require('path')
const vm = require('vm')
const ts = require('typescript')
const vue = require('vue')
const assert = require('assert/strict')
const root = path.resolve(__dirname, '..')
function createHarness(overrides = {}) {
  const storage = new Map(),
    cache = new Map(),
    calls = [],
    toasts = [],
    scopes = [],
    navigations = []
  const account = vue.reactive({
    token: '',
    profile: undefined,
    setToken(v) {
      this.token = v
    },
    setProfile(v) {
      this.profile = v
    },
    clearProfile() {
      this.token = ''
      this.profile = undefined
    },
  })
  let navigation,
    modalInput = '',
    activeHooks
  const routes = JSON.parse(fs.readFileSync(path.join(root, 'src/pages.json'), 'utf8')).pages.map(
    (p) => '/' + p.path,
  )
  const uni = {
    getStorageSync: (key) => storage.get(key) || '',
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
    navigateTo: navigate,
    redirectTo: navigate,
    switchTab: navigate,
    navigateBack() {},
    stopPullDownRefresh() {},
    setNavigationBarTitle() {},
    makePhoneCall() {},
    setClipboardData() {},
    showToast(options) {
      toasts.push(options.title)
    },
    showModal(options) {
      return options.success?.({ confirm: true, content: modalInput })
    },
    addInterceptor() {},
    request() {
      throw new Error('Tests must not send network requests')
    },
  }
  function navigate(options) {
    assert(routes.includes(options.url.split('?')[0]), options.url)
    navigation = options
    navigations.push(options)
  }
  const hooksApi = Object.fromEntries(
    [
      'onLoad',
      'onShow',
      'onHide',
      'onUnload',
      'onReachBottom',
      'onPullDownRefresh',
      'onShareAppMessage',
    ].map((name) => [name, (fn) => activeHooks?.[name].push(fn)]),
  )
  function load(file, page = false) {
    if (!page && cache.has(file)) return cache.get(file)
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'))
    let code = fs.readFileSync(file, 'utf8')
    if (file.endsWith(path.join('utils', 'http.ts')))
      code = code.replace(
        'import.meta.env.VITE_API_BASE_URL',
        JSON.stringify('http://localhost:3000/api'),
      )
    if (page) {
      code = code.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)[1]
      const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true),
        names = []
      for (const statement of ast.statements) {
        if (ts.isVariableStatement(statement))
          for (const d of statement.declarationList.declarations)
            if (ts.isIdentifier(d.name)) names.push(d.name.text)
        if (ts.isFunctionDeclaration(statement) && statement.name) names.push(statement.name.text)
      }
      code += '\nexport { ' + names.join(',') + ' }'
    }
    const module = { exports: {} }
    const requireLocal = (name) => {
      if (name in overrides) return overrides[name]
      if (name === 'vue') return vue
      if (name === '@dcloudio/uni-app') return hooksApi
      if (name === '@/stores/modules/user' || name === '@/stores')
        return { useUserStore: () => account }
      if (name.endsWith('.vue')) return {}
      if (name === '@/utils/http')
        return {
          resolveApiImage: (value) => value,
          request: async (options) => {
            calls.push(options)
            throw new Error('Unexpected API request ' + options.url)
          },
        }
      let target = name.startsWith('@/')
        ? path.join(root, 'src', name.slice(2))
        : path.resolve(path.dirname(file), name)
      const alias = '@/' + path.relative(path.join(root, 'src'), target).split(path.sep).join('/')
      if (alias in overrides) return overrides[alias]
      if (!fs.existsSync(target)) target += '.ts'
      return load(target)
    }
    const js = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText
    vm.runInNewContext(
      js,
      {
        module,
        exports: module.exports,
        require: requireLocal,
        uni,
        console,
        Date,
        setInterval: () => 1,
        clearInterval() {},
        setTimeout,
        clearTimeout,
        getCurrentPages: () => [
          {
            route: 'pages/checkout/index',
            options: {},
            getOpenerEventChannel: () => ({
              emit: (name, data) => navigation?.events?.[name]?.(data),
            }),
          },
        ],
      },
      { filename: file },
    )
    if (!page) cache.set(file, module.exports)
    return module.exports
  }
  function page(name) {
    const hooks = Object.fromEntries(Object.keys(hooksApi).map((key) => [key, []]))
    activeHooks = hooks
    const scope = vue.effectScope()
    scopes.push(scope)
    const exports = scope.run(() => load(path.join(root, 'src/pages', name, 'index.vue'), true))
    activeHooks = undefined
    return {
      ...exports,
      hooks,
      async enter(options = {}) {
        for (const fn of hooks.onLoad) await fn(options)
        for (const fn of hooks.onShow) await fn()
        await settle()
      },
      async show() {
        for (const fn of hooks.onShow) await fn()
        await settle()
      },
    }
  }
  return {
    page,
    account,
    uni,
    storage,
    calls,
    toasts,
    navigations,
    get navigation() {
      return navigation
    },
    set modalInput(v) {
      modalInput = v
    },
    module: (name) => load(path.join(root, 'src', name)),
    close() {
      scopes.forEach((s) => s.stop())
    },
  }
}
async function settle() {
  for (let i = 0; i < 12; i++) await Promise.resolve()
  await vue.nextTick()
}
function deferred() {
  let resolve, reject
  const promise = new Promise((a, b) => {
    resolve = a
    reject = b
  })
  return { promise, resolve, reject }
}
module.exports = { createHarness, settle, deferred, assert, root }
