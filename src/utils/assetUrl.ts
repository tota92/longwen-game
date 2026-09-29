/**
 * 资源 URL 统一解析（常规构建 / 单文件构建共用）
 *
 * 两种构建形态下的资源来源：
 *   - 常规构建 / 开发：返回 `${BASE_URL}${path}`，即 public/ 目录下的独立文件
 *     （如 icons/elements/el_fire.png），兼容子目录部署与 file:// 场景；
 *   - 单文件构建（npm run build-mobile）：页面由 scripts/mobile/asset-inliner.ts
 *     预先注入 `window.__INLINE_ASSETS__`（相对路径 → Base64 Data URI 表），
 *     命中即返回 Data URI —— 图标 / 立绘随 HTML 单文件一起分发，离线可直接运行。
 */
type InlineAssetMap = Record<string, string>

/** 单文件构建注入的内联资源表；常规构建下不存在（undefined） */
const inlineAssets = (globalThis as { __INLINE_ASSETS__?: InlineAssetMap }).__INLINE_ASSETS__

/** 资源相对路径（如 `icons/elements/el_fire.png`）→ 可直接使用的 URL */
export function assetUrl(path: string): string {
  return inlineAssets?.[path] ?? `${import.meta.env.BASE_URL}${path}`
}
