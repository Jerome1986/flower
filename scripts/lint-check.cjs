// 兼容当前项目的 eslintrc，不自动修复、不写缓存。
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const eslint = path.join(path.dirname(require.resolve('eslint/package.json')), 'bin/eslint.js')
const result = spawnSync(process.execPath, [eslint, 'src', '--ext', '.vue,.ts',
  '--no-fix', '--no-cache', '--max-warnings', '0',
  '--ignore-pattern', 'src/static/**', '--ignore-pattern', '**/mock-data.ts'], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'false' },
  stdio: 'inherit', windowsHide: true,
})
if (result.error) console.error(result.error.message)
process.exitCode = result.status ?? 1
