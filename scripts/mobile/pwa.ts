/**
 * 单文件构建插件（3/3）：移动端视口 / 触摸 / PWA 基础配置注入
 *
 * 单文件 HTML 没有独立文件可供 manifest 与触屏图标引用，因此：
 *   - manifest 以 data:application/manifest+json 形式内联（含 192 / 512 图标，
 *     由 ui_emblem.png 经 sharp 缩放生成）；不支持 data: 形式 manifest 的浏览器
 *     静默忽略，无副作用（真正「安装到桌面」需 https 站点托管该单文件）；
 *   - apple-touch-icon 以 180px PNG Data URI 内联；
 *   - 补齐 viewport / theme-color / 微信 X5、QQ、UC 全屏与竖屏等移动端 meta，
 *     已存在同名 meta 时跳过（index.html 中已有的不会重复注入）。
 *
 * 降级策略：图标生成依赖 sharp，任一环节失败只跳过对应标签并 warn，不阻断构建。
 */
import fs from 'node:fs'
import type { HtmlTagDescriptor, Plugin } from 'vite'

interface PwaIcon {
  src: string
  sizes: string
  type: string
  purpose: string
}

interface PwaOptions {
  /** 应用名（manifest name / short_name 与 apple-mobile-web-app-title） */
  name: string
  /** 主题色 / 背景色（六位十六进制） */
  themeColor: string
  /** manifest 描述的补充说明 */
  description?: string
  /** 徽记源图绝对路径（256×256 PNG），用于生成 192 / 512 / 180 图标 */
  emblemFile: string
}

/**
 * 移动端 meta 清单：viewport 兜底 + 主题色 + iOS 全屏 + 微信 X5 / UC 全屏。
 * 不支持的内核会静默忽略，不会产生副作用。
 */
function buildMetaTags(name: string, themeColor: string): ReadonlyArray<{ name: string; content: string }> {
  return [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    },
    { name: 'theme-color', content: themeColor },
    { name: 'format-detection', content: 'telephone=no, email=no, address=no' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title', content: name },
    { name: 'application-name', content: name },
    { name: 'screen-orientation', content: 'portrait' },
    { name: 'x5-orientation', content: 'portrait' },
    { name: 'full-screen', content: 'yes' },
    { name: 'x5-fullscreen', content: 'true' },
    { name: 'browsermode', content: 'application' },
    { name: 'x5-page-mode', content: 'app' }
  ]
}

/** 触摸优化：消除双击缩放判定延迟与 iOS 长按菜单（棋盘自身的 touch-action:none 不受影响） */
const TOUCH_CSS = 'html,body{touch-action:manipulation;-webkit-touch-callout:none}'

/**
 * data URI 最小转义：只转义会改变 URL / HTML 属性语义的字符。
 * `%` 必须最先处理（避免二次转义），属性序列化由 Vite 负责，此处只需保证
 * 数据段自身是合法 data URI（空格、引号、`#`、`&` 等均已编码）。
 */
function escapeDataUri(text: string): string {
  return text
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/&/g, '%26')
    .replace(/"/g, '%22')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
}

/** 用 sharp 把徽记缩放到指定尺寸并输出 PNG Data URI；失败返回 null（降级） */
async function renderPngDataUri(file: string, size: number): Promise<string | null> {
  try {
    const { default: sharp } = await import('sharp')
    const buf = await sharp(file).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer()
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch (e) {
    console.warn(`[mobile:pwa] ${size}px 图标生成失败（降级跳过）:`, (e as Error).message)
    return null
  }
}

export function mobilePwa(options: PwaOptions): Plugin {
  let manifestHref = ''
  let appleTouchIcon = ''

  return {
    name: 'mobile:pwa',

    async buildStart() {
      if (!fs.existsSync(options.emblemFile)) {
        this.warn(`徽记源图不存在，跳过 manifest / 触屏图标：${options.emblemFile}`)
        return
      }

      const [icon192, icon512, icon180] = await Promise.all([
        renderPngDataUri(options.emblemFile, 192),
        renderPngDataUri(options.emblemFile, 512),
        renderPngDataUri(options.emblemFile, 180)
      ])

      const icons: PwaIcon[] = []
      if (icon192) icons.push({ src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any' })
      if (icon512) icons.push({ src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any' })
      if (icons.length === 0) {
        // sharp 不可用时的兜底：原图直嵌（256×256）
        const raw = fs.readFileSync(options.emblemFile)
        icons.push({
          src: `data:image/png;base64,${raw.toString('base64')}`,
          sizes: '256x256',
          type: 'image/png',
          purpose: 'any'
        })
      }

      // start_url / scope 有意省略：默认指向文档自身，file:// 与任意托管路径均可成立
      const manifest = {
        name: options.name,
        short_name: options.name,
        description: options.description ?? '',
        lang: 'zh-CN',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: options.themeColor,
        background_color: options.themeColor,
        icons
      }
      manifestHref = `data:application/manifest+json;charset=utf-8,${escapeDataUri(JSON.stringify(manifest))}`
      if (icon180) appleTouchIcon = icon180
    },

    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const tags: HtmlTagDescriptor[] = [{ tag: 'style', children: TOUCH_CSS, injectTo: 'head' }]

        const hasMeta = (name: string): boolean =>
          new RegExp(`<meta[^>]*\\bname=["']${name}["']`, 'i').test(html)
        for (const meta of buildMetaTags(options.name, options.themeColor)) {
          if (!hasMeta(meta.name)) {
            tags.push({ tag: 'meta', attrs: { name: meta.name, content: meta.content }, injectTo: 'head' })
          }
        }

        if (manifestHref && !/<link[^>]*\brel=["']manifest["']/i.test(html)) {
          tags.push({ tag: 'link', attrs: { rel: 'manifest', href: manifestHref }, injectTo: 'head' })
        }
        if (appleTouchIcon && !/<link[^>]*\brel=["']apple-touch-icon["']/i.test(html)) {
          tags.push({ tag: 'link', attrs: { rel: 'apple-touch-icon', sizes: '180x180', href: appleTouchIcon }, injectTo: 'head' })
        }
        return tags
      }
    }
  }
}
