const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const source = path.resolve(__dirname, '../work/bouquet-backend')
const target = path.resolve(__dirname, '../../flower-api')
const bases = JSON.parse(fs.readFileSync(path.join(source, 'base-hashes.json'), 'utf8'))
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)])
}
const files = walk(source).filter(file => !file.endsWith('base-hashes.json'))
for (const file of files) {
  const relative = path.relative(source, file).replaceAll('\\', '/')
  const destination = path.resolve(target, relative)
  if (!destination.startsWith(target + path.sep)) throw new Error('Target outside backend')
  if (fs.existsSync(destination)) {
    const current = digest(destination)
    if (current !== bases[relative] && current !== digest(file)) throw new Error(`File changed since preparation: ${relative}`)
  }
}
for (const file of files) {
  const relative = path.relative(source, file)
  const destination = path.join(target, relative)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.copyFileSync(file, destination)
  console.log(relative)
}
