/**
 * `npm run build-mobile`：把整款游戏打包为「一个可离线分发的单文件 HTML」
 *
 * 产物：release/longwen-match3.html —— JS / CSS / 图标（62 枚）/ 立绘（8 张）
 * 全部 Base64 内联，无任何外部请求；发送到手机后用浏览器直接打开即可游玩
 * （file:// 本地文件、微信内置浏览器、任意静态托管均可运行）。
 *
 * 用法：
 *   npm run build-mobile                       # 压缩构建（默认）
 *   npm run build-mobile -- --no-minify        # 不压缩（排障：保留可读堆栈）
 *   npm run build-mobile -- --out dist-h5      # 自定义输出目录
 *   npm run build-mobile -- --name game.html   # 自定义输出文件名
 *   node scripts/build-mobile.mjs --help
 *
 * 实现：同一进程内调用 Vite 编程式 API（vite.config.mobile.ts），
 * 构建完成后读取插件统计（globalThis.__MOBILE_BUILD_STATS__）并校验产物。
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const SEP = '─'.repeat(54)

/** 字节数 → 可读体积 */
function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function printHelp() {
  console.log(`用法：node scripts/build-mobile.mjs [选项]
  （或 npm run build-mobile -- [选项]）

选项：
  --no-minify        不压缩 JS（排障用，保留可读堆栈与源码结构）
  --out <dir>        输出目录（默认 release，相对项目根目录）
  --name <file>      输出文件名（默认 longwen-match3.html）
  -h, --help         显示本帮助

产物为单个 .html：JS / CSS / 图标 / 立绘全部 Base64 内联，
手机浏览器直接打开即可运行，无需网络与服务器。`)
}

// ------------------------------------------------------------------
// 参数解析
// ------------------------------------------------------------------
const flags = { minify: true, outDir: 'release', fileName: 'longwen-match3.html' }
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]
  if (arg === '--no-minify') flags.minify = false
  else if (arg === '--out') flags.outDir = argv[++i] ?? flags.outDir
  else if (arg === '--name') flags.fileName = argv[++i] ?? flags.fileName
  else if (arg === '--help' || arg === '-h') {
    printHelp()
    process.exit(0)
  } else {
    console.error(`未知参数：${arg}（--help 查看用法）`)
    process.exit(1)
  }
}

const outDir = path.resolve(ROOT, flags.outDir)
const outFile = path.join(outDir, flags.fileName)

console.log('')
console.log('[build-mobile] 单文件 HTML 打包开始（Vue3 + TS → 一个 .html，资源全量内联）')
console.log(`[build-mobile] 目标产物：${path.relative(ROOT, outFile)}`)

// 清空旧产物，避免残留文件混入分发
fs.rmSync(outDir, { recursive: true, force: true })

// 通过环境变量把参数传给 vite.config.mobile.ts（同进程读取）
process.env.MOBILE_OUT_DIR = flags.outDir
process.env.MOBILE_FILE_NAME = flags.fileName
if (!flags.minify) process.env.MOBILE_NO_MINIFY = '1'

// ------------------------------------------------------------------
// 执行构建（Vite 编程式 API，与工程共用 node_modules）
// ------------------------------------------------------------------
const { build } = await import('vite')
try {
  await build({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.mobile.ts'),
    mode: 'production',
    logLevel: 'info'
  })
} catch (e) {
  console.error('')
  console.error(`[build-mobile] 构建失败：${e?.message ?? e}`)
  process.exit(1)
}

// ------------------------------------------------------------------
// 产物校验 + 构建报告
// ------------------------------------------------------------------
if (!fs.existsSync(outFile)) {
  console.error(`[build-mobile] 未找到产物文件：${outFile}`)
  process.exit(1)
}

const stats = globalThis.__MOBILE_BUILD_STATS__ ?? {}
const html = fs.readFileSync(outFile, 'utf8')
const htmlBytes = Buffer.byteLength(html)
const gzipBytes = zlib.gzipSync(Buffer.from(html)).length

/** 单文件的核心保证：无任何外部引用 */
const problems = []
if (/<script\b[^>]*\bsrc=["']/i.test(html)) problems.push('存在外链 <script src>')
if (/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["'](?!data:)/i.test(html)) problems.push('存在外链样式表')
if (/(?:src|href)=["']\.\//i.test(html)) problems.push('存在相对路径外部引用')
if (/<link\b[^>]*\brel=["']modulepreload["']/i.test(html)) problems.push('残留 modulepreload 标签')
// 入口脚本必须先于 #app 容器之后的 DOM 解析完毕再执行（classic script 同步执行，
// 若被 Vite 提升进 head 会先于 #app 运行，应用将静默不挂载；插件已统一挪到 body 末尾）
const appDivIdx = html.indexOf('<div id="app"')
const lastScriptEnd = html.lastIndexOf('</script>')
if (appDivIdx !== -1 && lastScriptEnd !== -1 && lastScriptEnd < appDivIdx) {
  problems.push('入口脚本先于 #app 容器执行（脚本顺序错误，应用会静默不挂载）')
}
if (stats.bundle && stats.bundle.leftovers.length > 0) {
  problems.push(`存在未内联的独立产物：${stats.bundle.leftovers.join(', ')}`)
}

console.log('')
console.log(SEP)
console.log(problems.length === 0 ? '  ✓ 单文件打包完成' : '  ⚠ 单文件打包完成（存在异常）')
console.log(SEP)
console.log(`  文件    ${outFile}`)
console.log(`  体积    ${fmtSize(htmlBytes)}（gzip 传输约 ${fmtSize(gzipBytes)}）`)
if (stats.assets) {
  console.log(
    `  资源    ${stats.assets.count} 个内联：${fmtSize(stats.assets.rawBytes)} → Base64 ${fmtSize(stats.assets.encodedBytes)}`
  )
}
if (stats.bundle) {
  console.log(`  代码    JS ${fmtSize(stats.bundle.jsBytes)} · CSS ${fmtSize(stats.bundle.cssBytes)}（均已内联）`)
}
console.log(
  problems.length === 0
    ? '  校验    通过：无任何外部引用，可离线打开'
    : '  校验    失败：见下方问题清单'
)
console.log(SEP)
console.log('  使用    1. 把该文件发送到手机（微信 / QQ / 网盘 / 数据线均可）')
console.log('          2. 用任意手机浏览器打开（Safari / Chrome / 微信内打开）')
console.log('             无需联网、无需服务器，即点即玩；亦可直接托管为单文件站点')
console.log(SEP)
console.log('')

if (problems.length > 0) {
  for (const problem of problems) console.error(`[build-mobile] 校验失败：${problem}`)
  process.exit(1)
}
