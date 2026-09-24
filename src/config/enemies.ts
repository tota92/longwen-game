/**
 * 敌人配置表（REQ-ENEMY / 5.2 敌人配置表）
 * MVP：史莱姆 / 火蜥蜴 / 冰霜幽灵 / 远古巨龙（两阶段 Boss）+ 教学用幼龙
 * 数值锚点：第一章玩家攻击 2，约 3 回合击杀普通敌人
 */
import type { EnemyConfig } from '@/types'

export const ENEMIES: EnemyConfig[] = [
  {
    id: 'enemy_slime',
    name: '史莱姆',
    phaseHP: [30],
    countdown: 3,
    attack: 8,
    skill: { type: 'none' },
    desc: '最基础的魔物，没有特殊技能',
    icon: '🟢'
  },
  {
    id: 'enemy_fire_lizard',
    name: '火蜥蜴',
    phaseHP: [25 + 10], // 第二章：基础 25 + 章节加成 10（REQ-LEVEL-002）
    countdown: 2,
    attack: 6,
    skill: { type: 'none' },
    desc: '行动迅捷的爬虫，倒计时极短',
    icon: '🦎'
  },
  {
    id: 'enemy_frost_ghost',
    name: '冰霜幽灵',
    phaseHP: [35 + 10],
    countdown: 3,
    attack: 8,
    skill: { type: 'freezeBoard', size: 2, turns: 2 },
    desc: '行动时冻结棋盘 2×2 区域，被冻宝石无法交换与消除',
    icon: '👻'
  },
  {
    id: 'enemy_dragon_whelp',
    name: '幼龙',
    phaseHP: [16, 14], // 教学关削弱版两阶段 Boss
    countdown: 4,
    attack: 5,
    phaseBlast: { damage: 6 },
    skill: { type: 'none' },
    desc: '远古巨龙的幼体，两阶段战斗的教学演示',
    icon: '🐲'
  },
  {
    id: 'enemy_ancient_dragon',
    name: '远古巨龙',
    phaseHP: [80, 60], // 两阶段（REQ-ENEMY-003）
    countdown: 5,
    attack: 12,
    phaseBlast: { damage: 15 },
    skill: { type: 'none' },
    desc: '第一章节 Boss。阶段转换时释放全屏吐息（15 伤害）',
    icon: '🐲'
  }
]

/** 按 ID 查询敌人 */
export function getEnemy(id: string): EnemyConfig {
  const e = ENEMIES.find((x) => x.id === id)
  if (!e) throw new Error(`[config] 未找到敌人配置: ${id}`)
  return e
}

/** 精英敌人通用强化倍率（精英 = 数值加强的同种敌人） */
export const ELITE_MODIFIER = {
  namePrefix: '精英',
  hpMult: 1.8,
  atkMult: 1.4
}
