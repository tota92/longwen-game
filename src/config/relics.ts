/**
 * 遗物配置表（REQ-RELIC / 4.2 遗物清单；V2 重平衡 + 流派化扩充至 12 件）
 * 遗物仅在当前关卡内生效，关卡结束清空（REQ-RELIC-001）
 *
 * ── V2 重平衡要点 ────────────────────────────────────────────
 * - 宝石精通：V1「基础宝石伤害 +2/颗」在第 1 章等效 +100% 伤害（实测最强且无脑），
 *   改为「4 连及以上的消除波 +40%」，成为"大消/炸弹"流派核心。
 * - 火焰之心：V1 只强化火技能（非火英雄完全无用），改为火元素全部伤害 +25%，
 *   与元素克制乘算（对火弱点的敌人更强）。
 * - 寒冰之触：额外给"冻结目标受伤 +15%"，让控制流派有输出收益。
 * - 自然共鸣：回血改为护盾（上限 20），避免治疗突破"每回合回血"的耐受上限。
 * - 幸运骰子：20% → 15%（长局中过强）。
 * - 新增 4 件：弱点猎手 / 奥术回响 / 炸弹狂潮 / 铁壁，各自对应一条构筑路线。
 *
 * 三选一规则（V2）：候选保证跨流派（至少来自 2 个 type），避免三个同类无效选择。
 */
import type { RelicConfig } from '@/types'

export const RELICS: RelicConfig[] = [
  {
    id: 'relic_heart_of_flame',
    name: '火焰之心',
    desc: '火元素造成的伤害 +25%（宝石与技能）',
    iconId: 'relic_heart_of_flame',
    type: 'output'
  },
  {
    id: 'relic_ice_touch',
    name: '寒冰之触',
    desc: '冻结持续时间 +1 回合；被冻结的敌人受到伤害 +15%',
    iconId: 'relic_ice_touch',
    type: 'control'
  },
  {
    id: 'relic_nature_resonance',
    name: '自然共鸣',
    desc: '每消除 5 个木属性宝石，获得 3 点护盾（最多累计 20）',
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
    desc: '每次有效交换 15% 概率不消耗回合',
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
    desc: '4 连及以上的消除波伤害 +40%',
    iconId: 'relic_gem_mastery',
    type: 'output'
  },
  {
    id: 'relic_weak_hunter',
    name: '弱点猎手',
    desc: '命中弱点的伤害倍率 1.5 → 1.8',
    iconId: 'relic_weak_hunter',
    type: 'output'
  },
  {
    id: 'relic_arcane_echo',
    name: '奥术回响',
    desc: '技能石伤害 +40%，但宝石消除伤害 -15%',
    iconId: 'relic_arcane_echo',
    type: 'rule'
  },
  {
    id: 'relic_bomb_frenzy',
    name: '炸弹狂潮',
    desc: '炸弹石范围 3×3 → 5×5，且炸弹波伤害 +20%',
    iconId: 'relic_bomb_frenzy',
    type: 'output'
  },
  {
    id: 'relic_iron_wall',
    name: '铁壁',
    desc: '过量治疗转化为护盾（最多累计 20）',
    iconId: 'relic_iron_wall',
    type: 'survival'
  }
]

/** 按 ID 查询遗物 */
export function getRelic(id: string): RelicConfig {
  const r = RELICS.find((x) => x.id === id)
  if (!r) throw new Error(`[config] 未找到遗物配置: ${id}`)
  return r
}
