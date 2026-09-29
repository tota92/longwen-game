/**
 * 图标 ID 清单（自动生成，请勿手动修改）
 * 生成脚本：scripts/icons/build.ts（图标源：scripts/icons/catalog/*）
 * 共 62 枚 256×256 透明 PNG，按用途归档于 public/icons/<分组>/ 子目录
 */

/** 元素宝石 */
export const ELEMENT_ICON_IDS = [
  'el_fire',
  'el_water',
  'el_wood',
  'el_light',
  'el_dark',
  'el_thunder',
] as const

/** 技能石标记 */
export const OVERLAY_ICON_IDS = [
  'ov_small',
  'ov_ultimate',
  'ov_bomb',
  'ov_freeze',
] as const

/** 英雄头像 */
export const HERO_ICON_IDS = [
  'hero_flame_knight',
  'hero_frost_witch',
  'hero_forest_druid',
] as const

/** 英雄技能 */
export const SKILL_ICON_IDS = [
  'skill_flame_slash',
  'skill_meteor_rain',
  'skill_ice_shard',
  'skill_absolute_zero',
  'skill_natures_touch',
  'skill_tree_of_life',
] as const

/** 遗物 */
export const RELIC_ICON_IDS = [
  'relic_heart_of_flame',
  'relic_ice_touch',
  'relic_nature_resonance',
  'relic_chain_reaction',
  'relic_lucky_dice',
  'relic_element_resonance',
  'relic_desperate_counter',
  'relic_gem_mastery',
  'relic_weak_hunter',
  'relic_arcane_echo',
  'relic_bomb_frenzy',
  'relic_iron_wall',
] as const

/** 敌人 */
export const ENEMY_ICON_IDS = [
  'enemy_slime',
  'enemy_fire_lizard',
  'enemy_frost_ghost',
  'enemy_dragon_whelp',
  'enemy_ancient_dragon',
] as const

/** 状态徽记 */
export const STATUS_ICON_IDS = [
  'status_burn',
  'status_poison',
  'status_freeze',
  'status_stun',
  'status_shield',
  'status_combo',
] as const

/** 关卡节点 */
export const NODE_ICON_IDS = [
  'node_tutorial',
  'node_normal',
  'node_elite',
  'node_boss',
] as const

/** UI 功能 */
export const UI_ICON_IDS = [
  'ui_play',
  'ui_team',
  'ui_map',
  'ui_sound_on',
  'ui_sound_off',
  'ui_pause',
  'ui_back',
  'ui_next',
  'ui_retry',
  'ui_check',
  'ui_lock',
  'ui_tip',
  'ui_target',
  'ui_emblem',
] as const

/** 结算纹章 */
export const RESULT_ICON_IDS = [
  'res_victory',
  'res_defeat',
] as const

/** 全部图标 ID 联合类型 */
export type IconId =
  | 'el_fire'
  | 'el_water'
  | 'el_wood'
  | 'el_light'
  | 'el_dark'
  | 'el_thunder'
  | 'ov_small'
  | 'ov_ultimate'
  | 'ov_bomb'
  | 'ov_freeze'
  | 'hero_flame_knight'
  | 'hero_frost_witch'
  | 'hero_forest_druid'
  | 'skill_flame_slash'
  | 'skill_meteor_rain'
  | 'skill_ice_shard'
  | 'skill_absolute_zero'
  | 'skill_natures_touch'
  | 'skill_tree_of_life'
  | 'relic_heart_of_flame'
  | 'relic_ice_touch'
  | 'relic_nature_resonance'
  | 'relic_chain_reaction'
  | 'relic_lucky_dice'
  | 'relic_element_resonance'
  | 'relic_desperate_counter'
  | 'relic_gem_mastery'
  | 'relic_weak_hunter'
  | 'relic_arcane_echo'
  | 'relic_bomb_frenzy'
  | 'relic_iron_wall'
  | 'enemy_slime'
  | 'enemy_fire_lizard'
  | 'enemy_frost_ghost'
  | 'enemy_dragon_whelp'
  | 'enemy_ancient_dragon'
  | 'status_burn'
  | 'status_poison'
  | 'status_freeze'
  | 'status_stun'
  | 'status_shield'
  | 'status_combo'
  | 'node_tutorial'
  | 'node_normal'
  | 'node_elite'
  | 'node_boss'
  | 'ui_play'
  | 'ui_team'
  | 'ui_map'
  | 'ui_sound_on'
  | 'ui_sound_off'
  | 'ui_pause'
  | 'ui_back'
  | 'ui_next'
  | 'ui_retry'
  | 'ui_check'
  | 'ui_lock'
  | 'ui_tip'
  | 'ui_target'
  | 'ui_emblem'
  | 'res_victory'
  | 'res_defeat'

/** 全部图标 ID（用于预加载与遍历） */
export const ALL_ICON_IDS: IconId[] = [
  'el_fire',
  'el_water',
  'el_wood',
  'el_light',
  'el_dark',
  'el_thunder',
  'ov_small',
  'ov_ultimate',
  'ov_bomb',
  'ov_freeze',
  'hero_flame_knight',
  'hero_frost_witch',
  'hero_forest_druid',
  'skill_flame_slash',
  'skill_meteor_rain',
  'skill_ice_shard',
  'skill_absolute_zero',
  'skill_natures_touch',
  'skill_tree_of_life',
  'relic_heart_of_flame',
  'relic_ice_touch',
  'relic_nature_resonance',
  'relic_chain_reaction',
  'relic_lucky_dice',
  'relic_element_resonance',
  'relic_desperate_counter',
  'relic_gem_mastery',
  'relic_weak_hunter',
  'relic_arcane_echo',
  'relic_bomb_frenzy',
  'relic_iron_wall',
  'enemy_slime',
  'enemy_fire_lizard',
  'enemy_frost_ghost',
  'enemy_dragon_whelp',
  'enemy_ancient_dragon',
  'status_burn',
  'status_poison',
  'status_freeze',
  'status_stun',
  'status_shield',
  'status_combo',
  'node_tutorial',
  'node_normal',
  'node_elite',
  'node_boss',
  'ui_play',
  'ui_team',
  'ui_map',
  'ui_sound_on',
  'ui_sound_off',
  'ui_pause',
  'ui_back',
  'ui_next',
  'ui_retry',
  'ui_check',
  'ui_lock',
  'ui_tip',
  'ui_target',
  'ui_emblem',
  'res_victory',
  'res_defeat',
]

/** 棋盘元素与技能石标记：需在进入战斗前预加载 */
export const BOARD_ICON_IDS: IconId[] = [...ELEMENT_ICON_IDS, ...OVERLAY_ICON_IDS]
