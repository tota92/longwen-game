/**
 * 遗物配置表（REQ-RELIC / 4.2 遗物清单，P0 全部 8 个）
 * 遗物仅在当前关卡内生效，关卡结束清空（REQ-RELIC-001）
 */
import type { RelicConfig } from '@/types'

export const RELICS: RelicConfig[] = [
  {
    id: 'relic_heart_of_flame',
    name: '火焰之心',
    desc: '火属性技能伤害 +30%',
    iconId: 'relic_heart_of_flame',
    type: 'output'
  },
  {
    id: 'relic_ice_touch',
    name: '寒冰之触',
    desc: '冻结持续时间 +1 回合',
    iconId: 'relic_ice_touch',
    type: 'control'
  },
  {
    id: 'relic_nature_resonance',
    name: '自然共鸣',
    desc: '每消除 5 个木属性宝石，回复 3 点生命',
    iconId: 'relic_nature_resonance',
    type: 'survival'
  },
  {
    id: 'relic_chain_reaction',
    name: '连锁反应',
    desc: '连击倍率 +0.3',
    iconId: 'relic_chain_reaction',
    type: 'output'
  },
  {
    id: 'relic_lucky_dice',
    name: '幸运骰子',
    desc: '每次有效交换 20% 概率不消耗回合',
    iconId: 'relic_lucky_dice',
    type: 'rule'
  },
  {
    id: 'relic_element_resonance',
    name: '元素共鸣',
    desc: '四消时 30% 概率额外生成 1 个小技能石',
    iconId: 'relic_element_resonance',
    type: 'rule'
  },
  {
    id: 'relic_desperate_counter',
    name: '绝境反击',
    desc: '生命值低于 30% 时，全部伤害 +50%',
    iconId: 'relic_desperate_counter',
    type: 'survival'
  },
  {
    id: 'relic_gem_mastery',
    name: '宝石精通',
    desc: '基础宝石伤害 +2',
    iconId: 'relic_gem_mastery',
    type: 'output'
  }
]

/** 按 ID 查询遗物 */
export function getRelic(id: string): RelicConfig {
  const r = RELICS.find((x) => x.id === id)
  if (!r) throw new Error(`[config] 未找到遗物配置: ${id}`)
  return r
}
