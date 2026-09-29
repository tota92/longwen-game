/**
 * 全局常量配置（REQ-CFG-001：数值不写死在业务代码中）
 */
import type { ElementType } from '@/types'
import type { IconId } from './iconIds'

/** 棋盘尺寸 8×8（REQ-BOARD-001） */
export const BOARD_SIZE = 8

/** 六种元素（REQ-BOARD-001） */
export const ELEMENTS: ElementType[] = ['fire', 'water', 'wood', 'light', 'dark', 'thunder']

/** 元素展示信息（图标为 256×256 透明 PNG，见 public/icons/elements/） */
export const ELEMENT_INFO: Record<
  ElementType,
  { name: string; iconId: IconId; color: string }
> = {
  fire: { name: '火', iconId: 'el_fire', color: '#ff5a3c' },
  water: { name: '水', iconId: 'el_water', color: '#3ca7ff' },
  wood: { name: '木', iconId: 'el_wood', color: '#4cd964' },
  light: { name: '光', iconId: 'el_light', color: '#f0b429' },
  dark: { name: '暗', iconId: 'el_dark', color: '#a06bff' },
  // 雷改为电青色：原设计与"光"同为黄色（#ffd94c / #ffe135），棋盘上难以区分
  thunder: { name: '雷', iconId: 'el_thunder', color: '#2cc3e6' }
}

/** 特殊宝石对应的覆盖标记图标（叠加于宝石角标） */
export const SPECIAL_MARK_ICON: Record<'small' | 'ultimate' | 'bomb', IconId> = {
  small: 'ov_small',
  ultimate: 'ov_ultimate',
  bomb: 'ov_bomb'
}

/** 冻结宝石角标图标 */
export const FROZEN_MARK_ICON: IconId = 'ov_freeze'

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
  /** 伤害飘字驻留时长（战斗舞台内，落在受击角色头顶） */
  floatText: 1000,
  shuffle: 450,
  hitFlash: 300,
  /** 提示区系统提示的停留时长（教程引导常驻，直到手动关闭） */
  tip: 2600,
  /**
   * 角色动作状态持续时间：播完自动回到 idle（战斗舞台）。
   * 出手 460ms = 前冲（含蓄势/命中定格/回身三段），受击 460ms = 120ms 延迟 +
   * 340ms 受击动画，两者都要等"冲过去打到人"的那一刻再给反馈。
   */
  actorAttack: 460,
  actorHurt: 460,
  actorDead: 1500,
  /** 命中特效驻留时长（含 120ms 延迟，等出手方冲到对面身前） */
  hitFx: 700
}

/** 数值换算锚点（REQ-DAMAGE）：1 回合标准输出 = 10 伤害 */
export const DAMAGE_ANCHOR = 10

/* ============================================================
 * 宝石展示区（REQ-UI 宝石系统展示）
 * ============================================================ */

/**
 * 宝石熟练度等级阈值：本局累计消除该元素宝石的数量达到阈值即升 1 级。
 *
 * 定位说明：这是**展示层分级**，用于让玩家一眼看出"这局我主要靠哪个元素输出"，
 * 不参与伤害结算——数值锚点（REQ-DAMAGE：1 回合标准输出 = 10 伤害）保持不变。
 * 阈值按一局 15~30 回合、总消除量 80~200 颗标定：
 * 主力元素通常到 4~5 级，冷门元素停在 1~2 级，形成可读的区分度。
 */
export const GEM_LEVEL_THRESHOLDS = [0, 6, 14, 26, 42] as const

/** 宝石熟练度等级上限 */
export const GEM_LEVEL_MAX = GEM_LEVEL_THRESHOLDS.length

/* ============================================================
 * 技能信息区（REQ-UI 信息展示区域）
 * ============================================================ */

/**
 * 技能等级上限：基础 1 级 + 最多 3 个遗物强化。
 * 技能等级直接映射现有遗物体系（见 src/core/skills.ts），
 * 不新增独立的技能养成数值，避免与遗物构筑重复计费。
 */
export const SKILL_LEVEL_MAX = 1 + MAX_RELICS

/** 技能强化遗物说明（技能信息区的"升级入口"清单） */
export const SKILL_UPGRADE_RELICS: { id: string; desc: string }[] = [
  { id: 'relic_heart_of_flame', desc: '火属性技能伤害 +30%' },
  { id: 'relic_ice_touch', desc: '技能附带的冻结 +1 回合' },
  { id: 'relic_desperate_counter', desc: '生命低于 30% 时全部伤害 +50%' },
  { id: 'relic_element_resonance', desc: '四消额外产出技能石概率 +30%' }
]
