/**
 * 角色立绘运行时工具
 *
 * 立绘为 640px 高、带 alpha 通道的 PNG，按角色阵营归类于
 * public/sprites/heroes/ 与 public/sprites/enemies/。
 * 与 256×256 的圆形头像图标（public/icons/<用途>/）分工明确：
 *   - icons/   → 列表、按钮、棋盘宝石等小尺寸场景
 *   - sprites/ → 战斗展示区的大尺寸角色形象
 *
 * ID 类型由 src/config/spriteIds.ts 提供，保证引用不漂移。
 */
import { ALL_SPRITE_IDS, HERO_SPRITE_IDS, ENEMY_SPRITE_IDS, type SpriteId } from '@/config/spriteIds'

/** 立绘根目录（相对应用基路径，兼容子目录部署与 file:// 场景） */
const SPRITE_BASE = `${import.meta.env.BASE_URL}sprites/`

/** 阵营 → 子目录映射（与 public/sprites/ 的归类目录一致） */
const GROUP_DIRS: ReadonlyArray<readonly [readonly SpriteId[], string]> = [
  [HERO_SPRITE_IDS, 'heroes'],
  [ENEMY_SPRITE_IDS, 'enemies']
]

/** ID → 子目录查找表（模块加载时构建，并做完整性校验） */
const SPRITE_DIR = new Map<SpriteId, string>()
for (const [ids, dir] of GROUP_DIRS) {
  for (const id of ids) SPRITE_DIR.set(id, dir)
}
for (const id of ALL_SPRITE_IDS) {
  if (!SPRITE_DIR.has(id)) throw new Error(`立绘 ID 未归类到任何子目录：${id}`)
}

const urlCache = new Map<SpriteId, string>()

/** 由立绘 ID 取得 PNG 的 URL（自动定位到对应阵营子目录） */
export function spriteUrl(id: SpriteId): string {
  let url = urlCache.get(id)
  if (!url) {
    url = `${SPRITE_BASE}${SPRITE_DIR.get(id)}/${id}.png`
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
