/**
 * 角色立绘运行时工具
 *
 * 立绘为 640px 高、带 alpha 通道的 PNG，位于 public/sprites/。
 * 与 256×256 的圆形头像图标（public/icons/）分工明确：
 *   - icons/   → 列表、按钮、棋盘宝石等小尺寸场景
 *   - sprites/ → 战斗展示区的大尺寸角色形象
 *
 * ID 类型由 src/config/spriteIds.ts 提供，保证引用不漂移。
 */
import { ALL_SPRITE_IDS, type SpriteId } from '@/config/spriteIds'

/** 立绘目录（相对应用基路径，兼容子目录部署与 file:// 场景） */
const SPRITE_BASE = `${import.meta.env.BASE_URL}sprites/`

const urlCache = new Map<SpriteId, string>()

/** 由立绘 ID 取得 PNG 的 URL */
export function spriteUrl(id: SpriteId): string {
  let url = urlCache.get(id)
  if (!url) {
    url = `${SPRITE_BASE}${id}.png`
    urlCache.set(id, url)
  }
  return url
}

/** 预加载立绘（进入战斗前调用，避免展示区首帧闪空） */
export function preloadSprites(ids: readonly SpriteId[] = ALL_SPRITE_IDS): void {
  for (const id of ids) {
    const img = new Image()
    img.decoding = 'async'
    img.src = spriteUrl(id)
  }
}

export type { SpriteId }
