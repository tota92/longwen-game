/**
 * 图标运行时工具
 *
 * 图标为 256×256 透明 PNG，按用途归类于 public/icons/<分组>/ 子目录
 * （elements/overlays/heroes/skills/relics/enemies/status/nodes/ui/results，
 * 由 scripts/icons/build.ts 生成）。
 * 路径经 src/utils/assetUrl.ts 统一解析：常规构建回退 BASE_URL 前缀（兼容子目录部署与 file:// 场景），
 * 单文件构建（npm run build-mobile）命中内联 Data URI 表，图标随 HTML 一起分发。
 * ID 类型由 src/config/iconIds.ts 自动生成，保证引用不漂移。
 */
import {
  ALL_ICON_IDS,
  BOARD_ICON_IDS,
  ELEMENT_ICON_IDS,
  OVERLAY_ICON_IDS,
  HERO_ICON_IDS,
  SKILL_ICON_IDS,
  RELIC_ICON_IDS,
  ENEMY_ICON_IDS,
  STATUS_ICON_IDS,
  NODE_ICON_IDS,
  UI_ICON_IDS,
  RESULT_ICON_IDS,
  type IconId
} from '@/config/iconIds'
import { assetUrl } from './assetUrl'

/**
 * 分组 → 子目录映射：ID 按用途归类到 icons/ 下的对应文件夹
 * 与 scripts/icons/build.ts 的输出目录保持一致
 */
const GROUP_DIRS: ReadonlyArray<readonly [readonly IconId[], string]> = [
  [ELEMENT_ICON_IDS, 'elements'],
  [OVERLAY_ICON_IDS, 'overlays'],
  [HERO_ICON_IDS, 'heroes'],
  [SKILL_ICON_IDS, 'skills'],
  [RELIC_ICON_IDS, 'relics'],
  [ENEMY_ICON_IDS, 'enemies'],
  [STATUS_ICON_IDS, 'status'],
  [NODE_ICON_IDS, 'nodes'],
  [UI_ICON_IDS, 'ui'],
  [RESULT_ICON_IDS, 'results']
]

/** ID → 子目录查找表（模块加载时构建，并做完整性校验） */
const ICON_DIR = new Map<IconId, string>()
for (const [ids, dir] of GROUP_DIRS) {
  for (const id of ids) ICON_DIR.set(id, dir)
}
for (const id of ALL_ICON_IDS) {
  if (!ICON_DIR.has(id)) throw new Error(`图标 ID 未归类到任何子目录：${id}`)
}

/** 缓存已构造的 URL，避免重复拼接 */
const urlCache = new Map<IconId, string>()

/** 由图标 ID 取得 PNG 的 URL（自动定位到对应用途子目录） */
export function iconUrl(id: IconId): string {
  let url = urlCache.get(id)
  if (!url) {
    url = assetUrl(`icons/${ICON_DIR.get(id)}/${id}.png`)
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
