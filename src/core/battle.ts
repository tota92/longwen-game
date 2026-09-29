/**
 * 战斗数值计算（REQ-DAMAGE / 数值锚点：1 回合标准输出 = 12 伤害，见 DAMAGE_ANCHOR）
 * 纯函数实现，便于数值验证与单元测试
 *
 * V2 修改：元素克制（弱点/抗性）、护甲（按消除波减免）、技能章节缩放，
 * 以及新遗物的乘区（奥术回响/宝石精通/炸弹狂潮/火焰之心）。
 * 乘区顺序（单一出口，便于核对与调参）：
 *   单颗基础 × 同元素支援(+) × 主战元素(×1.2) × 克制(×1.5/×0.5) × 火加成(+%)
 *   → 合计 × 连击倍率 → × 全局增益（绝境/奥术/大消/炸弹） → 取整 − 护甲（下限 1）
 */
import {
  COMBO_MULT,
  COMBO_MULT_CAP,
  ELEMENT_MULT,
  LEADER_ELEMENT_BONUS,
  SAME_ELEMENT_GEM_BONUS,
  WEAK_MULT_HUNTER
} from '@/config/constants'
import type { ElementType, EnemyAction, EnemyConfig, EnemyState, WaveEnemy } from '@/types'
import { getEnemy } from '@/config/enemies'

/** 连击倍率（REQ-DAMAGE-003；连锁反应遗物 +0.3） */
export function calcComboMult(combo: number, chainBonus = 0): number {
  const base = combo >= 6 ? COMBO_MULT_CAP : COMBO_MULT[combo] ?? 1.0
  return base + chainBonus
}

/** 元素克制信息（取敌人配置的弱点/抗性；无克制关系时为 null） */
export interface ElementCounter {
  weak: ElementType | null
  resist: ElementType | null
  /** 弱点倍率（弱点猎手遗物把 1.5 提升到 1.8） */
  weakMult: number
}

/** 从敌人配置派生克制信息；未持有弱点猎手时 weakMult 取 ELEMENT_MULT.weak */
export function elementCounterOf(config: EnemyConfig | null, weakHunter = false): ElementCounter {
  return {
    weak: config?.weak ?? null,
    resist: config?.resist ?? null,
    weakMult: weakHunter ? WEAK_MULT_HUNTER : ELEMENT_MULT.weak
  }
}

/** 单颗宝石的元素克制倍率（未标注克制关系 = 1.0） */
export function elementMultOf(element: ElementType, counter: ElementCounter): number {
  if (element === counter.weak) return counter.weakMult
  if (element === counter.resist) return ELEMENT_MULT.resist
  return 1
}

export interface GemDamageContext {
  /** 本关基础宝石攻击力（REQ-DAMAGE-002：2 + 章 - 1，由关卡配置提供） */
  gemPower: number
  /** 主战英雄元素（REQ-DAMAGE-005：同元素消除 +20%） */
  leaderElement: ElementType
  /** 同元素加成生效的元素（REQ-HERO-004：两名支援均与主战同元素） */
  sameBonusElement: ElementType | null
  /** 元素克制信息（V2） */
  counter: ElementCounter
  /** 护甲（V2）：本次消除波减免的固定伤害，结果下限 1 */
  armor: number
  /** 火元素伤害加成（火焰之心遗物 + 支援被动，加算；V2 扩展为宝石通用） */
  fireBonus: number
  /** 奥术回响遗物：技能强化的代价 —— 宝石消除伤害 -15% */
  arcanePenalty: boolean
  /** 宝石精通遗物：4 连及以上的消除波 +40% */
  bigMatchBonus: boolean
  /** 炸弹狂潮遗物：炸弹波 +20% */
  bombBonus: boolean
  /** 绝境反击遗物：HP<30% 全伤害 +50% */
  desperate: boolean
}

/**
 * 单波消除伤害（REQ-DAMAGE-001）：
 * Σ(宝石数_i × 单颗攻击力_i × 元素加成) × 连击倍率 × 全局增益，取整后减免护甲
 * @param chainReaction 连锁反应遗物：连击倍率 +0.3
 */
export function calcWaveDamage(
  cleared: { element: ElementType }[],
  combo: number,
  ctx: GemDamageContext,
  chainReaction = false
): number {
  let base = 0
  for (const gem of cleared) {
    let power = ctx.gemPower
    if (ctx.sameBonusElement && gem.element === ctx.sameBonusElement) {
      power += SAME_ELEMENT_GEM_BONUS
    }
    let dmg = power
    if (gem.element === ctx.leaderElement) {
      dmg *= LEADER_ELEMENT_BONUS
    }
    dmg *= elementMultOf(gem.element, ctx.counter)
    if (gem.element === 'fire' && ctx.fireBonus > 0) {
      dmg *= 1 + ctx.fireBonus
    }
    base += dmg
  }
  let total = base * calcComboMult(combo, chainReaction ? 0.3 : 0)
  if (ctx.desperate) total *= 1.5
  if (ctx.arcanePenalty) total *= 0.85
  if (ctx.bigMatchBonus) total *= 1.4
  if (ctx.bombBonus) total *= 1.2
  if (total <= 0) return 0
  return Math.max(1, Math.floor(total) - ctx.armor)
}

/**
 * 英雄技能伤害加成计算：
 * 基础值 × 章节缩放 × 元素克制 × 火加成 × 奥术回响 × 绝境反击，取整后减免护甲。
 * - 主战炎龙骑士/支援被动：火元素伤害 +10%
 * - 火焰之心遗物：火元素伤害 +25%
 * - 奥术回响遗物：技能伤害 +40%
 * - 绝境反击：全伤害 +50%
 */
export function calcSkillDamage(
  baseDamage: number,
  skillElement: ElementType,
  opts: {
    firePassive?: boolean
    heartOfFlame?: boolean
    desperate?: boolean
    /** 元素克制信息（V2）；缺省视为无克制 */
    counter?: ElementCounter
    /** 护甲（V2） */
    armor?: number
    /** 奥术回响：技能伤害 +40% */
    arcaneEcho?: boolean
    /** 章节缩放（技能表为基础值，见 skillChapterScale） */
    chapterScale?: number
  } = {}
): number {
  if (baseDamage <= 0) return 0
  let mult = opts.chapterScale ?? 1
  if (opts.counter) mult *= elementMultOf(skillElement, opts.counter)
  if (skillElement === 'fire') {
    if (opts.firePassive) mult *= 1.1
    if (opts.heartOfFlame) mult *= 1.25
  }
  if (opts.arcaneEcho) mult *= 1.4
  if (opts.desperate) mult *= 1.5
  const raw = baseDamage * mult
  if (raw <= 0) return 0
  return Math.max(1, Math.floor(raw) - (opts.armor ?? 0))
}

/**
 * 取敌人指定阶段的行动轮换（REQ-ENEMY-003）。
 * 未配置 patterns 时返回空数组，敌人退化为「每次只做普通攻击」。
 * 阶段数多于 patterns 长度时，回退到最后一组，便于只写一套轮换贯穿全程。
 */
export function resolvePattern(config: EnemyConfig, phase: number): EnemyAction[] {
  if (!config.patterns || config.patterns.length === 0) return []
  const idx = Math.min(Math.max(phase - 1, 0), config.patterns.length - 1)
  return config.patterns[idx] ?? []
}

/**
 * 构造敌人运行时状态（含变体强化、章节成长、Boss 多阶段与行动轮换）
 *
 * @param opts.enemyCdUp 冰霜女巫旧版被动（敌人初始倒计时 +1，V1 遗留，保留供测试）
 * @param opts.hpMult / opts.atkMult 章节成长倍率（见 chapterHpMult / chapterAtkMult），
 *        由编排层按关卡计算后传入，保持本模块与关卡配置解耦
 */
export function createEnemyState(
  wave: WaveEnemy,
  opts: { enemyCdUp?: boolean; hpMult?: number; atkMult?: number } = {}
): EnemyState {
  const config: EnemyConfig = getEnemy(wave.enemyId)
  const variant = wave.variant
  const hpScale = (variant ? variant.hpMult : 1) * (opts.hpMult ?? 1)
  const atkScale = (variant ? variant.atkMult : 1) * (opts.atkMult ?? 1)
  const phaseHP = config.phaseHP.map((hp) => Math.max(1, Math.floor(hp * hpScale)))
  // 各阶段攻击力 / 倒计时：优先取阶段数组，缺省回退到单值配置
  const phaseAttack = (config.phaseAttack ?? config.phaseHP.map(() => config.attack)).map(
    (a) => Math.max(1, Math.floor(a * atkScale))
  )
  // 倒计时偏移：变体（如迅捷 -1）与旧版被动（+1）叠加
  const cdDelta = (variant?.countdownDelta ?? 0) + (opts.enemyCdUp ? 1 : 0)
  const phaseCountdown = (config.phaseCountdown ?? config.phaseHP.map(() => config.countdown)).map(
    (cd) => Math.max(1, cd + cdDelta)
  )
  // 护甲（V2）：配置值 + 变体加成（精英/巨化为 +1）
  const armor = (config.armor ?? config.phaseHP.map(() => 0)).map(
    (a) => a + (variant?.armorAdd ?? 0)
  )
  const countdown = phaseCountdown[0]
  return {
    configId: config.id,
    display: (variant ? variant.namePrefix + '·' : '') + config.name,
    iconId: config.iconId,
    spriteId: config.spriteId,
    tint: variant?.tint ?? null,
    phase: 1,
    hp: phaseHP[0],
    phaseMaxHp: phaseHP[0],
    phaseHP,
    countdown,
    baseCountdown: countdown,
    attack: phaseAttack[0],
    phaseAttack,
    phaseCountdown,
    pattern: resolvePattern(config, 1),
    patternIndex: 0,
    charging: null,
    armor,
    shield: 0,
    enraged: false,
    frozen: 0,
    stunned: 0,
    burn: null,
    poison: null,
    phaseBlastDamage: config.phaseBlast?.damage ?? 0,
    skill: config.skill
  }
}

/** 敌人是否处于多阶段且当前阶段血量耗尽 */
export function enemyPhaseBroken(enemy: EnemyState): boolean {
  return enemy.hp <= 0 && enemy.phase < enemy.phaseHP.length
}

/** 敌人是否彻底死亡 */
export function enemyDead(enemy: EnemyState): boolean {
  return enemy.hp <= 0 && enemy.phase >= enemy.phaseHP.length
}

/**
 * Boss 阶段转换（REQ-ENEMY-003）：当前阶段血量耗尽且仍有下一阶段时推进。
 * 同步更新 phaseMaxHp，否则二阶段血条会按一阶段满血计算、永远显示不满。
 * 同时切换该阶段的攻击力、行动倒计时与行动轮换（二阶段「狂怒」更凶），
 * 并清除进行中的蓄力（阶段转换会打断一切蓄力）与阶段内狂怒标记。
 * 倒计时重置为 baseCountdown + 1：+1 用于抵消本回合敌人阶段即将发生的递减，
 * 使玩家看到的稳定值恰好等于 baseCountdown。
 * @returns 是否发生了阶段转换
 */
export function advanceEnemyPhase(enemy: EnemyState): boolean {
  if (enemy.hp > 0 || enemy.phase >= enemy.phaseHP.length) return false
  enemy.phase++
  enemy.hp = enemy.phaseHP[enemy.phase - 1]
  enemy.phaseMaxHp = enemy.phaseHP[enemy.phase - 1]
  enemy.attack = enemy.phaseAttack?.[enemy.phase - 1] ?? enemy.attack
  enemy.baseCountdown = enemy.phaseCountdown?.[enemy.phase - 1] ?? enemy.baseCountdown
  enemy.countdown = enemy.baseCountdown + 1
  enemy.pattern = resolvePattern(getEnemy(enemy.configId), enemy.phase)
  enemy.patternIndex = 0
  enemy.charging = null
  // 阶段内狂怒：进入新阶段后重新计数（阶段重置攻击力，狂怒倍率需重新判定）
  enemy.enraged = false
  return true
}

/**
 * 阶段内狂怒（V2）：阶段血量降到阈值比例以下时，攻击力一次性提升。
 * 由编排层在造成伤害后调用；已在狂怒或未配置 enrage 的敌人返回 false。
 * @returns 是否刚刚触发狂怒
 */
export function tryEnrage(enemy: EnemyState): boolean {
  if (enemy.enraged || enemy.hp <= 0) return false
  const cfg = getEnemy(enemy.configId)
  const rule = cfg.enrage
  if (!rule || rule.threshold <= 0 || rule.atkMult <= 1) return false
  if (enemy.hp > enemy.phaseMaxHp * rule.threshold) return false
  enemy.enraged = true
  enemy.attack = Math.max(1, Math.floor(enemy.attack * rule.atkMult))
  return true
}
