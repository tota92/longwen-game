/**
 * 无 esbuild 构建通道（rollup + @vue/compiler-sfc + typescript）
 *
 * 背景：本机安全策略会静默拦截 node_modules 里的 esbuild.exe（启动即退出码 1、无输出），
 * 导致 `vite build` / `tsx` 全部不可用。本脚本用纯 JS 依赖复刻出等价能力：
 *   - .vue  → @vue/compiler-sfc（compileScript 内联模板 + compileStyle 处理 scoped）
 *   - .ts   → typescript.transpileModule（类型检查由 vue-tsc 单独负责）
 *   - @/    → src 别名；vue / pinia 走各自的 esm-browser 产物
 *
 * 用途：
 *   node scripts/preview-build.mjs --test     构建并运行核心逻辑冒烟测试
 *   node scripts/preview-build.mjs --preview  构建浏览器预览（.preview/）
 *
 * 注意：这是**开发期验证工具**，不参与正式发布。正式构建仍走 `npm run build`（vite）。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { rollup } from 'rollup'
import ts from 'typescript'
import { parse, compileScript, compileTemplate, compileStyle } from '@vue/compiler-sfc'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const NM = path.join(ROOT, 'node_modules')

/** SFC 编译产出的 CSS 汇总（key 用于稳定排序） */
const collectedCss = new Map()

const hashId = (str) => crypto.createHash('md5').update(str).digest('hex').slice(0, 8)

/** 补全扩展名解析（rollup 默认不猜 .ts/.vue） */
function resolveFile(base) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.vue`,
    `${base}.js`,
    `${base}.mjs`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.js')
  ]
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
  }
  return null
}

/** 依赖解析：@/ 别名 + 第三方包 + 相对路径补扩展名 */
function resolvePlugin() {
  return {
    name: 'resolve',
    resolveId(source, importer) {
      if (source.startsWith('@/')) {
        return resolveFile(path.join(ROOT, 'src', source.slice(2)))
      }
      // 浏览器版 Vue（自包含，不依赖 @vue/* 子包与 process.env）
      if (source === 'vue') {
        return path.join(NM, 'vue/dist/vue.esm-browser.prod.js')
      }
      // pinia 通过 vue-demi 做 Vue2/3 兼容层，必须用 v3 版本，不能直接指向 vue
      if (source === 'vue-demi') {
        return path.join(NM, 'vue-demi/lib/v3/index.mjs')
      }
      if (source === 'pinia') {
        return path.join(NM, 'pinia/dist/pinia.esm-browser.js')
      }
      if (source === '@vue/devtools-api') {
        return path.join(NM, '@vue/devtools-api/lib/esm/index.js')
      }
      if (source.startsWith('.')) {
        if (!importer) return null
        return resolveFile(path.resolve(path.dirname(importer), source))
      }
      // 兜底：其余裸模块按 package.json 的 module / main 解析
      const pkgDir = path.join(NM, source)
      const pkgJson = path.join(pkgDir, 'package.json')
      if (fs.existsSync(pkgJson)) {
        const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'))
        const entry = pkg.module || pkg.main || 'index.js'
        return resolveFile(path.join(pkgDir, entry))
      }
      return null
    }
  }
}

/** Vue SFC → JS（脚本与模板分开编译，样式另行汇总） */
function vuePlugin() {
  return {
    name: 'vue-sfc',
    transform(code, id) {
      if (!id.endsWith('.vue')) return null
      const { descriptor, errors } = parse(code, { filename: id })
      if (errors.length) throw new Error(`[sfc] ${id}: ${errors[0].message}`)

      const scopeHash = hashId(id)
      const hasScoped = descriptor.styles.some((s) => s.scoped)

      // 注意：不要用 compileScript 的 inlineTemplate —— 它不会把 scopeId 注入模板，
      // 结果是元素上没有 data-v-xxx 属性，所有 scoped 样式全部失配。
      // 这里按标准两步走：compileScript 出组件对象，compileTemplate 出 render。
      const script = compileScript(descriptor, {
        id: scopeHash,
        inlineTemplate: false,
        genDefaultAs: '_sfc_main'
      })

      let out = script.content

      if (descriptor.template) {
        const tpl = compileTemplate({
          source: descriptor.template.content,
          filename: id,
          id: scopeHash,
          scoped: hasScoped,
          compilerOptions: {
            bindingMetadata: script.bindings,
            expressionPlugins: ['typescript'],
            /*
             * Vue 3.4 的 compiler 已不再通过 scopeId 选项往元素上注入 data-v 属性
             * （实测 scoped:true + compilerOptions.scopeId 均不生效），
             * 这里用 nodeTransform 手动补上，否则 scoped 样式会全部失配、
             * 页面退化成无样式的纵向堆叠。
             * tagType 3 是 <template>（v-if/v-for 容器），与官方行为一致跳过。
             */
            ...(hasScoped
              ? {
                  nodeTransforms: [
                    (node) => {
                      if (node.type === 1 && node.tagType !== 3) {
                        node.props.push({
                          type: 6,
                          name: `data-v-${scopeHash}`,
                          value: undefined,
                          loc: node.loc
                        })
                      }
                    }
                  ]
                }
              : {})
          }
        })
        if (tpl.errors.length) throw new Error(`[template] ${id}: ${tpl.errors[0]}`)
        out += `\n${tpl.code}\n_sfc_main.render = render\n`
      }

      out += '\nexport default _sfc_main\n'

      for (const style of descriptor.styles) {
        const res = compileStyle({
          source: style.content,
          filename: id,
          // id 必须始终提供：compileStyle 内部会用它推导 scope 属性名，
          // 非 scoped 样式同样需要（scoped:false 时只是不追加属性选择器）
          id: `data-v-${scopeHash}`,
          scoped: !!style.scoped
        })
        if (res.errors.length) throw new Error(`[style] ${id}: ${res.errors[0]}`)
        // 非 scoped 的全局样式（如 App.vue 的设计令牌）排在最前，保证变量先于组件样式生效
        collectedCss.set(`${style.scoped ? '1' : '0'}:${id}:${collectedCss.size}`, res.code)
      }

      return { code: out, map: null }
    }
  }
}

/**
 * TypeScript → JS（仅剥离类型，不做类型检查）
 *
 * 注意：必须同时覆盖 .vue —— vuePlugin 输出的仍是带类型注解的 TS
 * （vite 里这一步由 esbuild 承担），漏掉它 rollup 会在类型注解处解析失败。
 */
function tsPlugin() {
  return {
    name: 'ts',
    transform(code, id) {
      if (!id.endsWith('.ts') && !id.endsWith('.vue')) return null
      if (id.endsWith('.d.ts')) return null
      const out = ts.transpileModule(code, {
        // .vue 不是 TS 认识的扩展名，用等价的 .ts 名让编译器按 TS 语法解析
        fileName: id.endsWith('.vue') ? id.replace(/\.vue$/, '.ts') : id,
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.ESNext,
          isolatedModules: true,
          verbatimModuleSyntax: false,
          importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove
        }
      })
      return { code: out.outputText, map: null }
    }
  }
}

/** 替换 vite 专有的 import.meta.env（预览用相对路径，正式构建由 vite 注入） */
function envPlugin(baseUrl) {
  return {
    name: 'env',
    transform(code) {
      if (!code.includes('import.meta.env')) return null
      return {
        code: code
          .replace(/import\.meta\.env\.BASE_URL/g, JSON.stringify(baseUrl))
          .replace(/import\.meta\.env\.DEV/g, 'false')
          .replace(/import\.meta\.env\.PROD/g, 'true')
          .replace(/import\.meta\.env\.MODE/g, '"production"'),
        map: null
      }
    }
  }
}

async function bundle(input, baseUrl = './') {
  collectedCss.clear()
  const build = await rollup({
    input,
    plugins: [resolvePlugin(), vuePlugin(), tsPlugin(), envPlugin(baseUrl)],
    // SFC 与 store 初始化都有副作用，关闭激进的摇树以免误删
    treeshake: { moduleSideEffects: true }
  })
  const { output } = await build.generate({ format: 'es', sourcemap: false })
  const js = output.filter((o) => o.type === 'chunk').map((o) => o.code).join('\n')
  const css = [...collectedCss.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
    .join('\n')
  await build.close()
  return { js, css }
}

// ------------------------------------------------------------------
// --test：打包冒烟测试并执行
// ------------------------------------------------------------------
async function runTest() {
  const outDir = path.join(ROOT, '.preview')
  fs.mkdirSync(outDir, { recursive: true })
  const { js } = await bundle(path.join(ROOT, 'scripts/smoke-test.ts'))
  const file = path.join(outDir, 'smoke-test.mjs')
  fs.writeFileSync(file, js)
  console.log('[build] 冒烟测试已打包 →', path.relative(ROOT, file))
  await import(`file://${file.replace(/\\/g, '/')}`)
}

/**
 * 全局样式表（设计令牌 / 基础布局 / 组件类 / 特效 / 横屏守卫）
 *
 * 正式入口 src/main.ts 会逐个 import 它们；预览入口 preview-entry.ts 不走 main.ts，
 * 而本构建通道只收集 SFC `<style>` 产出的 CSS，因此必须在此显式前置，
 * 否则 var(--sp-*) / var(--bg-panel) 全部落空，预览页会退化成"没有设计令牌"的伪布局。
 */
const GLOBAL_CSS = ['tokens.css', 'base.css', 'components.css', 'effects.css', 'guards.css']
  .map((file) => fs.readFileSync(path.join(ROOT, 'src/assets/style', file), 'utf8'))
  .join('\n')

// ------------------------------------------------------------------
// --preview：打包浏览器预览
// ------------------------------------------------------------------
async function runPreview() {
  const outDir = path.join(ROOT, '.preview')
  fs.mkdirSync(outDir, { recursive: true })
  // BASE_URL 指向 public：预览页位于 .preview/，图标与立绘在 ../public/
  const { js, css } = await bundle(path.join(ROOT, 'scripts/preview-entry.ts'), '../public/')

  fs.writeFileSync(path.join(outDir, 'bundle.js'), js)
  fs.writeFileSync(path.join(outDir, 'bundle.css'), `${GLOBAL_CSS}\n${css}`)
  fs.writeFileSync(
    path.join(outDir, 'index.html'),
    `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
    />
    <title>龙纹消消棋 · 界面预览</title>
    <link rel="stylesheet" href="./bundle.css" />
    <style>
      html, body { margin: 0; padding: 0; background: #1a1025; overscroll-behavior: none; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./bundle.js"></script>
  </body>
</html>
`
  )
  console.log(
    `[build] 预览已生成 → .preview/  (js ${(js.length / 1024).toFixed(0)}KB, css ${(css.length / 1024).toFixed(0)}KB)`
  )
}

const mode = process.argv[2]
if (mode === '--test') await runTest()
else if (mode === '--preview') await runPreview()
else {
  console.log('用法: node scripts/preview-build.mjs --test | --preview')
  process.exit(1)
}
