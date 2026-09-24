/**
 * 全局常量配置（REQ-CFG-001：数值不写死在业务代码中）
 */
import type { ElementType } from '@/types'

/** 棋盘尺寸 8×8（REQ-BOARD-001） */
export const BOARD_SIZE = 8

/** 六种元素（REQ-BOARD-001） */
export const ELEMENTS: ElementType[] = ['fire', 'water', 'wood', 'light', 'dark', 'thunder']

/** 元素展示信息 */
export const ELEMENT_INFO: Record<ElementType, { name: string; icon: string; color: string }> = {
  fire: { name: '火', icon: '🔥', color: '#ff5a3c' },
  water: { name: '水', icon: '💧', color: '#3ca7ff' },
  wood: { name: '木', icon: '🌿', color: '#4cd964' },
  light: { name: '光', icon: '☀️', color: '#ffd94c' },
  dark: { name: '暗', icon: '🌑', color: '#a06bff' },
  thunder: { name: '雷', icon: '⚡', color: '#ffe135' }
}

/** 玩家初始/上限 HP */
export const PLAYER_MAX_HP = 100

/** 连击倍率表（REQ-DAMAGE-003），6 连及以上取 COMBO_MULT_CAP */
export const COMBO_MULT: Record<number, number> = {
  1: 1.0,
  2: 1.2,
  3: 1.5,
  4: 2.0,
  5: 2.5
}
export const COMBO_MULT_CAP = 3.0

/** 主战英雄同元素消除伤害加成（REQ-DAMAGE-005） */
export const LEADER_ELEMENT_BONUS = 1.2

/** 同元素支援加成：该元素宝石基础伤害 +1（REQ-HERO-004） */
export const SAME_ELEMENT_GEM_BONUS = 1

/** 单关遗物上限（REQ-RELIC-003） */
export const MAX_RELICS = 3

/** 三选一抽取数量（REQ-RELIC-002） */
export const RELIC_CHOICES = 3

/** 教学关 1-1 的消除次数目标（REQ-TUTO-002） */
export const TUTORIAL_MATCH_TARGET = 3

/** 冻结棋盘区域自动解冻回合数（REQ-ENEMY-101：2 回合） */
export const GEM_FROZEN_TURNS = 2

/** DDA-001：同关连续失败 N 次后，下局开局赠送 1 个小技能石 */
export const DDA_FAIL_TIMES = 2

/** 动画时长（毫秒）——统一管理便于调优节奏 */
export const ANIM = {
  swap: 180,
  pop: 260,
  drop: 320,
  cutIn: 500,
  enemyWarn: 500,
  floatText: 900,
  shuffle: 450,
  hitFlash: 300
}

/** 数值换算锚点（REQ-DAMAGE）：1 回合标准输出 = 10 伤害 */
export const DAMAGE_ANCHOR = 10
