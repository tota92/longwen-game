/**
 * 单文件构建插件（2/3）：JS / CSS 内联进 HTML，并收敛为唯一产物文件
 *
 * 常规构建产出的 <script src> 与 <link rel="stylesheet"> 指向独立文件，
 * 单文件分发无法携带，因此在本插件中：
 *
 *   1. 把入口 chunk（IIFE）内联为 classic script，并统一放到 </body> 前执行——
 *      Vite 会把入口脚本提升进 <head>，classic script 若留在 head 中会先于
 *      DOM（#app）与内联资源表（__INLINE_ASSETS__）同步执行，导致挂载静默失败；
 *      放回 body 末尾即可保证依赖顺序，同时兼容不支持 ES Module 的旧内核（微信 X5 等）；
 *   2. 把全部 CSS 写进 <style>…</style>；
 *   3. 从 bundle 中删除已内联的 js / css 与 modulepreload 标签，避免残留独立文件；
 *   4. 把最终 HTML 重命名为约定的单文件名（默认 release/longwen-match3.html）。
 *
 * 转义说明：内联内容里出现 </script、</style、<!-- 会把 HTML 解析器提前带出
 * 宿主标签，因此统一做等价转义（反斜杠转义在 JS 字符串/正则与 CSS 字符串中均合法）。
 */
import type { Plugin } from 'vite'
import { reportStats } from './stats'

/** 转义内联 JS：<\/script 与 <\!-- 在字符串、正则中均与原文等价 */
function escapeInlineJs(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')
}

/** 转义内联 CSS：<\/style 在 CSS 字符串中与原文等价 */
function escapeInlineCss(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style')
}

/**
 * @param options.fileName 最终单文件名（如 longwen-match3.html）
 */
export function singleFile(options: { fileName: string }): Plugin {
  return {
    name: 'mobile:single-file',
    enforce: 'post',

    generateBundle(_outputOptions, bundle) {
      const htmlKey = Object.keys(bundle).find((key) => key.endsWith('.html'))
      const htmlAsset = htmlKey ? bundle[htmlKey] : undefined
      if (!htmlKey || !htmlAsset || htmlAsset.type !== 'asset') {
        this.warn('未找到 HTML 产物，单文件内联已跳过')
        return
      }

      const jsByFile = new Map<string, string>()
      const cssByFile = new Map<string, string>()
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') jsByFile.set(item.fileName, item.code)
        else if (item.fileName.endsWith('.css')) cssByFile.set(item.fileName, String(item.source))
      }

      let html = String(htmlAsset.source)
      let jsBytes = 0
      let cssBytes = 0

      // 1) <script src> → 收集代码并移除原标签（稍后统一放到 body 末尾，见文件头说明）
      const inlineScripts: string[] = []
      html = html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/g, (tag, src: string) => {
        const code = jsByFile.get(src.replace(/^\.\//, ''))
        if (code === undefined) return tag
        jsBytes += Buffer.byteLength(code)
        inlineScripts.push(escapeInlineJs(code))
        return ''
      })

      // 2) <link rel="stylesheet"> → 内联 <style>
      html = html.replace(/<link\b[^>]*\bhref=["']([^"']+\.css)["'][^>]*>/g, (tag, href: string) => {
        const css = cssByFile.get(href.replace(/^\.\//, ''))
        if (css === undefined) return tag
        cssBytes += Buffer.byteLength(css)
        return `<style>${escapeInlineCss(css)}</style>`
      })

      // 3) 移除 modulepreload 标签（单文件下已无独立 chunk 可预加载）
      html = html.replace(/[ \t]*<link\b[^>]*\brel=["']modulepreload["'][^>]*>\s*\n?/g, '')

      // 4) 入口脚本统一插到 </body> 前，保证 #app 与 __INLINE_ASSETS__ 均已就绪
      if (inlineScripts.length > 0) {
        const block = inlineScripts.map((code) => `  <script>${code}</script>`).join('\n')
        const closeIdx = html.lastIndexOf('</body>')
        if (closeIdx === -1) {
          this.warn('未找到 </body>，入口脚本追加到文档末尾')
          html += `\n${block}`
        } else {
          const head = html.slice(0, closeIdx).replace(/\s+$/, '')
          html = `${head}\n${block}\n${html.slice(closeIdx)}`
        }
      }

      // 5) 收敛为唯一产物：复用原 HTML asset 的元信息（Rollup 4 必填字段），改名 + 换内容
      const finalAsset = { ...htmlAsset, fileName: options.fileName, source: html, needsCodeReference: false }
      for (const key of Object.keys(bundle)) delete bundle[key]
      bundle[options.fileName] = finalAsset

      const leftovers = Object.keys(bundle).filter((key) => key !== options.fileName)
      if (leftovers.length > 0) {
        this.warn(`仍有 ${leftovers.length} 个独立产物未内联：${leftovers.join(', ')}`)
      }

      reportStats({ bundle: { jsBytes, cssBytes, leftovers } })
    }
  }
}
