/**
 * 技能信息区数据推导（REQ-UI 信息展示区域）
 *
 * 设计原则：**技能等级直接映射现有遗物体系**，不新增独立的技能养成数值。
 * 理由：遗物已经是本作局内构筑的唯一成长轴（REQ-RELIC），若再叠一层技能等级，
 * 两条成长轴会互相稀释，且需要重新做数值平衡。这里把"技能等级"定义为
 * 「基础 1 级 + 强化该技能的遗物数量」，玩家读到的等级与实际收益完全一致：
 *   Lv1 裸技能 → Lv4 满配遗物强化，等级提升的每一级都对应一条可查的遗物效果。
 *
 * 同理，"冷却时间"在本作机制中不存在——技能由四消/五消生成的技能石即时触发。
 * 因此这里用**触发条件 + 棋盘现有技能石存量**表达"技能可用状态"，
 * 比虚构一个冷却倒计时更贴合真实玩法。
 */
import { SKILL_LEVEL_MAX } from '@/config/constants'
import { calcSkillDamage } from '@/core/battle'
import type { ElementCounter } from '@/core/battle'
import type { IconId } from '@/config/iconIds'
import type { HeroConfig, SkillEffect } from '@/types'

/** 技能推导上下文（来自当前战局） */
export interface SkillViewContext {
  /** 本局已持有遗物 ID */
  relics: string[]
  /** 支援被动：火元素伤害 +10%（炎龙骑士作为支援时生效） */
  firePassive: boolean
  /** 支援被动：冻结效果 +1 回合（冰霜女巫作为支援时生效） */
  freezePassive?: boolean
  /** 当前是否处于低血（绝境反击生效条件） */
  lowHP: boolean
  /** 当前敌人的元素克制信息（V2：让面板伤害与实战一致） */
  counter?: ElementCounter
  /** 当前敌人护甲（V2） */
  armor?: number
  /** 章节缩放（V2：技能表为基础值，实际伤害 ×(本章宝石攻击 ÷ 2)） */
  chapterScale?: number
}

/** 单条技能的可展示视图 */
export interface SkillView {
  which: 'small' | 'ultimate'
  name: string
  desc: string
  iconId: IconId
  /** 触发条件文案（本作技能由技能石触发，无冷却） */
  trigger: string
  /** 触发所需消除数（4 / 5） */
  triggerCount: number
  /** 等级：1 ~ SKILL_LEVEL_MAX */
  level: number
  /** 已生效的强化来源说明（技能"升级"入口的可见依据） */
  upgrades: string[]
  /** 当前实际伤害（含全部加成；0 表示纯辅助技能） */
  damage: number
  /** 效果标签（伤害/回复/护盾/燃烧/冻结） */
  effects: string[]
}

/** 强化该技能的遗物清单：返回已生效的说明文案 */
function collectUpgrades(
  hero: HeroConfig,
  skill: SkillEffect,
  which: 'small' | 'ultimate',
  ctx: SkillViewContext
): string[] {
  const out: string[] = []
  if (hero.element === 'fire' && ctx.relics.includes('relic_heart_of_flame')) {
    out.push('火焰之心：火元素伤害 +25%')
  }
  if (skill.freeze && (ctx.relics.includes('relic_ice_touch') || ctx.freezePassive)) {
    out.push('寒冰之触 / 冰霜女巫支援：冻结回合增加')
  }
  if (ctx.relics.includes('relic_arcane_echo')) {
    out.push('奥术回响：技能伤害 +40%（宝石伤害 -15%）')
  }
  if (ctx.relics.includes('relic_desperate_counter')) {
    out.push('绝境反击：生命低于 30% 时伤害 +50%')
  }
  if (which === 'small' && ctx.relics.includes('relic_element_resonance')) {
    out.push('元素共鸣：四消额外产出技能石概率 +30%')
  }
  return out
}

/** 技能效果标签（让玩家不读长描述也能抓住技能定位）
 *  标签是**摘要**：完整数值与持续回合写在 skill.desc 里（详情浮层展示），
 *  这里必须短，否则技能卡一行放不下两个标签。 */
function buildEffects(skill: SkillEffect, actualDamage: number, freezeTurns: number): string[] {
  const out: string[] = []
  if (actualDamage > 0) out.push(`伤害 ${actualDamage}`)
  if (skill.heal) out.push(`回复 ${skill.heal}`)
  if (skill.shield) out.push(`护盾 ${skill.shield}`)
  if (skill.burn) out.push(`燃烧 ${skill.burn.damage}/回合`)
  if (freezeTurns > 0) out.push(`冻结 ${freezeTurns} 回合`)
  if (skill.clearDebuff) out.push('清除负面状态')
  return out
}

/** 构建单个技能的展示视图 */
export function buildSkillView(
  hero: HeroConfig,
  which: 'small' | 'ultimate',
  ctx: SkillViewContext
): SkillView {
  const skill: SkillEffect = which === 'small' ? hero.skill4 : hero.skill5
  const upgrades = collectUpgrades(hero, skill, which, ctx)
  const actualDamage = calcSkillDamage(skill.damage, hero.element, {
    firePassive: ctx.firePassive,
    heartOfFlame: ctx.relics.includes('relic_heart_of_flame'),
    desperate: ctx.lowHP && ctx.relics.includes('relic_desperate_counter'),
    counter: ctx.counter,
    armor: ctx.armor,
    arcaneEcho: ctx.relics.includes('relic_arcane_echo'),
    chapterScale: ctx.chapterScale
  })
  // 冻结实际回合数：技能基础值 + 寒冰之触遗物 + 冰霜女巫支援被动
  const freezeTurns = skill.freeze
    ? skill.freeze +
      (ctx.relics.includes('relic_ice_touch') ? 1 : 0) +
      (ctx.freezePassive ? 1 : 0)
    : 0

  return {
    which,
    name: skill.name,
    desc: skill.desc,
    iconId: which === 'small' ? hero.skill4IconId : hero.skill5IconId,
    trigger: which === 'small' ? '四消生成技能石' : '五消生成终极技能石',
    triggerCount: which === 'small' ? 4 : 5,
    // 基础 1 级 + 每生效一条强化 +1 级，上限由遗物数量决定
    level: Math.min(SKILL_LEVEL_MAX, 1 + upgrades.length),
    upgrades,
    damage: actualDamage,
    effects: buildEffects(skill, actualDamage, freezeTurns)
  }
}

/** 构建某英雄的完整技能视图（四消 + 五消） */
export function buildHeroSkillViews(hero: HeroConfig, ctx: SkillViewContext): SkillView[] {
  return [buildSkillView(hero, 'small', ctx), buildSkillView(hero, 'ultimate', ctx)]
}
