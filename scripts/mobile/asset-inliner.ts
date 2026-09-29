/**
 * 单文件构建插件（1/3）：public/ 图片资源 → Data URI 内联表
 *
 * 背景：图标（62 枚）与立绘（8 张）位于 public/ 静态目录，运行期由
 * iconUrl() / spriteUrl() 动态拼接路径访问，Vite 打包期无法感知引用关系，
 * 因此常规构建下它们是独立文件。单文件构建时改为：
 *
 *   1. 构建期递归扫描 public/ 下全部图片资源，生成「相对路径 → Data URI」映射表；
 *   2. 以 <script>window.__INLINE_ASSETS__=…</script> 注入 body 前置位，
 *      先于应用脚本执行（产物为 classic script，无模块时序问题）；
 *   3. 运行期 src/utils/assetUrl.ts 优先命中该表，未命中再回退 BASE_URL 拼路径，
 *      同一份源码因此同时兼容常规构建（走 public/）与单文件构建（走 Data URI）。
 *
 * 注意：与 vite.config.mobile.ts 的 publicDir:false 配合——public/ 不再复制为
 * 独立文件，页面内这一个内联表就是全部静态资源的唯一来源。
 */
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { reportStats } from './stats'

/** 需要内联的扩展名 → MIME（其余文件如 icons/manifest.json 清单跳过，不参与运行时） */
const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif'
}

interface ScannedAssets {
  /** 相对路径（POSIX 风格，如 icons/elements/el_fire.png）→ Data URI */
  map: Record<string, string>
  count: number
  rawBytes: number
  encodedBytes: number
}

/** 递归扫描目录，生成「相对路径 → Data URI」映射 */
function scanDir(dir: string, baseDir: string, out: ScannedAssets): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanDir(abs, baseDir, out)
      continue
    }
    const mime = MIME_BY_EXT[path.extname(entry.name).toLowerCase()]
    if (!mime) continue
    const buf = fs.readFileSync(abs)
    const uri = `data:${mime};base64,${buf.toString('base64')}`
    const key = path.relative(baseDir, abs).split(path.sep).join('/')
    out.map[key] = uri
    out.count += 1
    out.rawBytes += buf.length
    out.encodedBytes += uri.length
  }
}

/**
 * @param options.publicDir public/ 目录绝对路径
 * （显式传入而非读 config.publicDir，因为单文件构建关闭了 publicDir）
 */
export function assetInliner(options: { publicDir: string }): Plugin {
  let scanned: ScannedAssets = { map: {}, count: 0, rawBytes: 0, encodedBytes: 0 }

  return {
    name: 'mobile:asset-inliner',

    buildStart() {
      scanned = { map: {}, count: 0, rawBytes: 0, encodedBytes: 0 }
      scanDir(options.publicDir, options.publicDir, scanned)
      reportStats({
        assets: { count: scanned.count, rawBytes: scanned.rawBytes, encodedBytes: scanned.encodedBytes }
      })
    },

    transformIndexHtml: {
      order: 'post',
      handler() {
        // 大表用 JSON.parse 解析：比等体积对象字面量解析更快，且天然规避脚本注入问题；
        // `<` 统一转义为 \u003c，防止内容中出现 </script 类似序列提前闭合标签
        const json = JSON.stringify(scanned.map).replace(/</g, '\\u003c')
        return [
          {
            tag: 'script',
            children: `window.__INLINE_ASSETS__=JSON.parse(${JSON.stringify(json)})`,
            injectTo: 'body-prepend'
          }
        ]
      }
    }
  }
}
