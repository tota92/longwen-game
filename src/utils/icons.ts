/**
 * 图标运行时工具
 *
 * 图标为 256×256 透明 PNG，构建产物位于 public/icons/（由 scripts/icons/build.ts 生成）。
 * 使用 BASE_URL 前缀，兼容子目录部署与 file:// 场景。
 * ID 类型由 src/config/iconIds.ts 自动生成，保证引用不漂移。
 */
import { ALL_ICON_IDS, BOARD_ICON_IDS, type IconId } from '@/config/iconIds'

/** 图标目录（相对应用基路径） */
const ICON_BASE = `${import.meta.env.BASE_URL}icons/`

/** 缓存已构造的 URL，避免重复拼接 */
const urlCache = new Map<IconId, string>()

/** 由图标 ID 取得 PNG 的 URL */
export function iconUrl(id: IconId): string {
  let url = urlCache.get(id)
  if (!url) {
    url = `${ICON_BASE}${id}.png`
    urlCache.set(id, url)
  }
  return url
}

/** 预加载图标（进入战斗前调用，避免棋盘首帧闪烁） */
export function preloadIcons(ids: readonly IconId[] = ALL_ICON_IDS): void {
  for (const id of ids) {
    const img = new Image()
    img.decoding = 'async'
    img.src = iconUrl(id)
  }
}

/** 预加载棋盘相关图标（6 元素 + 4 技能石标记） */
export function preloadBoardIcons(): void {
  preloadIcons(BOARD_ICON_IDS)
}

export type { IconId }