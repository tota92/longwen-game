/**
 * 战斗数值计算（REQ-DAMAGE / 数值锚点：1 回合标准输出 = 10 伤害）
 * 纯函数实现，便于数值验证与单元测试
 */
import { COMBO_MULT, COMBO_MULT_CAP, LEADER_ELEMENT_BONUS, SAME_ELEMENT_GEM_BONUS } from '@/config/constants'
import type { ElementType, EnemyConfig, EnemyState, WaveEnemy } from '@/types'
import { getEnemy } from '@/config/enemies'

/** 连击倍率（REQ-DAMAGE-003；连锁反应遗物 +0.3） */
export function calcComboMult(combo: number, chainBonus = 0): number {
  const base = combo >= 6 ? COMBO_MULT_CAP : COMBO_MULT[combo] ?? 1.0
  return base + chainBonus
}

export interface GemDamageContext {
  /** 本关基础宝石攻击力（REQ-DAMAGE-002：2 + 章 - 1，由关卡配置提供） */
  gemPower: number
  /** 主战英雄元素（REQ-DAMAGE-005：同元素消除 +20%） */
  leaderElement: ElementType
  /** 同元素加成生效的元素（REQ-HERO-004：两名支援均与主战同元素） */
  sameBonusElement: ElementType | null
  /** 宝石精通遗物：基础宝石伤害 +2 */
  gemMasteryBonus: number
  /** 绝境反击遗物：HP<30% 全伤害 +50% */
  desperate: boolean
}

/**
 * 单波消除伤害（REQ-DAMAGE-001）：
 * Σ(宝石数_i × 单颗攻击力_i × 元素加成) × 连击倍率 × 全局增益，结果向下取整
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
    let power = ctx.gemPower + ctx.gemMasteryBonus
    if (ctx.sameBonusElement && gem.element === ctx.sameBonusElement) {
      power += SAME_ELEMENT_GEM_BONUS
    }
    let dmg = power
    if (gem.element === ctx.leaderElement) {
      dmg *= LEADER_ELEMENT_BONUS
    }
    base += dmg
  }
  let total = base * calcComboMult(combo, chainReaction ? 0.3 : 0)
  if (ctx.desperate) total *= 1.5
  return Math.floor(total)
}

/**
 * 英雄技能伤害加成计算：
 * - 主战炎龙骑士：火技能 +15%（支援被动 fireSkillUp）
 * - 火焰之心遗物：火技能 +30%
 * - 绝境反击：全伤害 +50%
 */
export function calcSkillDamage(
  baseDamage: number,
  skillElement: ElementType,
  opts: { firePassive?: boolean; heartOfFlame?: boolean; desperate?: boolean }
): number {
  let mult = 1
  if (skillElement === 'fire') {
    if (opts.firePassive) mult += 0.15
    if (opts.heartOfFlame) mult += 0.3
  }
  if (opts.desperate) mult += 0.5
  return Math.floor(baseDamage * mult)
}

/** 构造敌人运行时状态（含精英强化、冰霜女巫被动加倒计时、Boss 多阶段） */
export function createEnemyState(
  wave: WaveEnemy,
  opts: { enemyCdUp?: boolean } = {}
): EnemyState {
  const config: EnemyConfig = getEnemy(wave.enemyId)
  const elite = wave.elite
  const phaseHP = config.phaseHP.map((hp) =>
    Math.floor(hp * (elite ? elite.hpMult : 1))
  )
  const attack = Math.floor(config.attack * (elite ? elite.atkMult : 1))
  let countdown = config.countdown
  if (opts.enemyCdUp) countdown += 1 // 冰霜女巫支援被动：敌人初始倒计时 +1
  return {
    configId: config.id,
    display: (elite ? elite.namePrefix + '·' : '') + config.name,
    icon: config.icon,
    phase: 1,
    hp: phaseHP[0],
    phaseMaxHp: phaseHP[0],
    phaseHP,
    countdown,
    baseCountdown: countdown,
    attack,
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
 * 倒计时重置为 baseCountdown + 1：+1 用于抵消本回合敌人阶段即将发生的递减，
 * 使玩家看到的稳定值恰好等于 baseCountdown。
 * @returns 是否发生了阶段转换
 */
export function advanceEnemyPhase(enemy: EnemyState): boolean {
  if (enemy.hp > 0 || enemy.phase >= enemy.phaseHP.length) return false
  enemy.phase++
  enemy.hp = enemy.phaseHP[enemy.phase - 1]
  enemy.phaseMaxHp = enemy.phaseHP[enemy.phase - 1]
  enemy.countdown = enemy.baseCountdown + 1
  return true
}
