/**
 * 角色立绘 ID 清单
 *
 * 立绘为 640px 高、带 alpha 通道的 PNG，位于 public/sprites/，
 * 由 scripts/prepare-sprites.mjs 从原始生成图裁切压缩而来。
 * ID 与配置表中的 hero_* / enemy_* 保持一致，便于同一套 ID 引用两种资源：
 *   - public/icons/   → 256×256 圆形头像（列表、按钮、棋盘宝石）
 *   - public/sprites/ → 大尺寸角色立绘（战斗展示区）
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
