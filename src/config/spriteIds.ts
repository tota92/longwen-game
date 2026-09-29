/**
 * 角色立绘 ID 清单
 *
 * 立绘为 640px 高、带 alpha 通道的 PNG，按阵营归档于
 * public/sprites/heroes/ 与 public/sprites/enemies/，
 * 由 scripts/prepare-sprites.mjs 从原始生成图裁切压缩而来。
 * ID 与配置表中的 hero_* / enemy_* 保持一致，便于同一套 ID 引用两种资源：
 *   - public/icons/<分组>/   → 256×256 圆形头像（列表、按钮、棋盘宝石）
 *   - public/sprites/<阵营>/ → 大尺寸角色立绘（战斗展示区）
 */

/** 英雄立绘 */
export const HERO_SPRITE_IDS = [
  'hero_flame_knight',
  'hero_frost_witch',
  'hero_forest_druid'
] as const

/** 敌人立绘 */
export const ENEMY_SPRITE_IDS = [
  'enemy_slime',
  'enemy_fire_lizard',
  'enemy_frost_ghost',
  'enemy_dragon_whelp',
  'enemy_ancient_dragon'
] as const

/** 全部立绘 ID */
export const ALL_SPRITE_IDS = [...HERO_SPRITE_IDS, ...ENEMY_SPRITE_IDS] as const

/** 立绘 ID 联合类型 */
export type SpriteId = (typeof ALL_SPRITE_IDS)[number]

/**
 * 立绘的固有朝向：美术出图时决定、无法从文件读出，只能在这里登记。
 * 战斗舞台是横板对望构图——英雄站在左必须朝右、怪物站在右必须朝左，
 * 朝向不符的立绘由 BattleStage 水平镜像修正（见 spriteFlipped）。
 */
export const SPRITE_FACING: Record<SpriteId, 'left' | 'right'> = {
  hero_flame_knight: 'right',
  hero_frost_witch: 'left',
  hero_forest_druid: 'right',
  enemy_slime: 'right',
  enemy_fire_lizard: 'left',
  enemy_frost_ghost: 'left',
  enemy_dragon_whelp: 'right',
  enemy_ancient_dragon: 'right'
}

/** 该立绘站在指定阵营时是否需要水平镜像（英雄应朝右、怪物应朝左） */
export function spriteFlipped(id: SpriteId, side: 'hero' | 'enemy'): boolean {
  const facing = SPRITE_FACING[id]
  return side === 'hero' ? facing === 'left' : facing === 'right'
}
