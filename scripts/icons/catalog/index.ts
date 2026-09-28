/**
 * 图标总目录：汇总各分组定义
 * 全系列共 58 枚，覆盖游戏内全部图标位
 */
import type { IconDef } from '../theme'
import { ELEMENT_ICONS, OVERLAY_ICONS, STATUS_ICONS } from './board'
import { ENEMY_ICONS, HERO_ICONS, SKILL_ICONS } from './actors'
import { RELIC_ICONS } from './items'
import { NODE_ICONS, RESULT_ICONS, UI_ICONS } from './ui'

export const CATALOG: IconDef[] = [
  ...ELEMENT_ICONS,
  ...OVERLAY_ICONS,
  ...HERO_ICONS,
  ...SKILL_ICONS,
  ...RELIC_ICONS,
  ...ENEMY_ICONS,
  ...STATUS_ICONS,
  ...NODE_ICONS,
  ...UI_ICONS,
  ...RESULT_ICONS
]

export const GROUP_LABELS: Record<string, string> = {
  element: '元素宝石',
  overlay: '技能石标记',
  hero: '英雄头像',
  skill: '英雄技能',
  relic: '遗物',
  enemy: '敌人',
  status: '状态徽记',
  node: '关卡节点',
  ui: 'UI 功能',
  result: '结算纹章'
}