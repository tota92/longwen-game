/**
 * 关卡配置表（REQ-LEVEL / 6.1 章节结构，详见「关卡设计」章节）
 *
 * ── 设计原则（本次关卡重设计的依据）──────────────────────────
 * 1. 每关一个新东西：新敌人 / 新变体 / 新组合 / 新节奏，禁止两关同质。
 * 2. 锯齿上升：整体难度递增，但每 3 关安排一次喘息关（低强度），避免疲劳。
 * 3. 波次数 = 遗物经济：波间触发遗物三选一，N 波 = N-1 个遗物。
 *    Boss 关给 3 波，保证进 Boss 前有 2 个遗物，构筑有深度。
 * 4. 变体即谜题：狂暴=速杀、巨化=持久、迅捷=抢节奏、精英=数值墙。
 * 5. 新机制预告：下一章的核心机制在本章末以低强度首次出现（先见后学）。
 *
 * ── 难度旋钮（设计工具箱）────────────────────────────────
 *   波次数量 1–3 ｜ 敌人种类 ｜ 变体倍率 ｜ 出手节奏偏移 ｜ 章节宝石攻击力
 *
 * 数值基准：每章宝石攻击 +1；约 3 回合击杀普通敌人（REQ-LEVEL-002）
 */
import { ENEMY_VARIANTS } from './enemies'
import type { LevelConfig } from '@/types'

const { elite, berserk, giant, swift } = ENEMY_VARIANTS

export const LEVELS: LevelConfig[] = [
  // ================================================================
  // 第一章：微光之森（宝石攻击 2）—— 教学 → 熟练 → 加压 → 高潮
  // ================================================================
  {
    id: 1,
    chapter: 1,
    indexInChapter: 1,
    type: 'tutorial',
    tutorial: 'match', // REQ-TUTO-002：无敌人，3 次消除过关
    waves: [],
    gemPower: 2,
    name: '初试身手'
  },
  {
    id: 2,
    chapter: 1,
    indexInChapter: 2,
    type: 'tutorial',
    tutorial: 'intro4', // REQ-TUTO-003：引入敌人与四消技能石
    waves: [{ enemyId: 'enemy_slime' }],
    gemPower: 2,
    ensureFourMatch: true,
    name: '魔物现身'
  },
  {
    id: 3,
    chapter: 1,
    indexInChapter: 3,
    type: 'boss',
    tutorial: 'intro5', // REQ-TUTO-004：引入五消与两阶段 Boss，过关首次展示遗物
    // 幼龙会蓄力吐息：这是玩家第一次接触「蓄力—打断」，教学局必被成功打断
    waves: [{ enemyId: 'enemy_slime' }, { enemyId: 'enemy_dragon_whelp' }],
    gemPower: 2,
    ensureFiveMatch: true,
    name: '幼龙试炼'
  },
  {
    id: 4,
    chapter: 1,
    indexInChapter: 4,
    type: 'normal',
    // 基准关：第一次出现 2 波，让玩家理解「清一波 → 拿遗物 → 更强」的正循环
    waves: [{ enemyId: 'enemy_slime' }, { enemyId: 'enemy_slime' }],
    gemPower: 2,
    name: '林间清扫'
  },
  {
    id: 5,
    chapter: 1,
    indexInChapter: 5,
    type: 'elite', // REQ-LEVEL-003：每 5 关精英
    // 第一个精英：攻守兼备的数值墙，把关卡第一次推到"小高潮"
    waves: [{ enemyId: 'enemy_slime' }, { enemyId: 'enemy_slime', variant: elite }],
    gemPower: 2,
    name: '精英阻路'
  },
  {
    id: 6,
    chapter: 1,
    indexInChapter: 6,
    type: 'normal',
    // 迅捷变体：出手从 3 回合缩到 2 回合。敌人没变强，但玩家能思考的时间变少了，
    // 逼玩家放弃"慢慢磨"、开始主动找连消——这是节奏教学关。
    waves: [
      { enemyId: 'enemy_slime', variant: swift },
      { enemyId: 'enemy_slime', variant: swift },
      { enemyId: 'enemy_slime', variant: swift }
    ],
    gemPower: 2,
    name: '迅影袭扰'
  },
  {
    id: 7,
    chapter: 1,
    indexInChapter: 7,
    type: 'normal',
    // 狂暴变体：血量略增但单次攻击翻倍。拖得越久越亏，是一道"速杀检定"。
    waves: [
      { enemyId: 'enemy_slime', variant: berserk },
      { enemyId: 'enemy_slime', variant: berserk }
    ],
    gemPower: 2,
    name: '狂暴之潮'
  },
  {
    id: 8,
    chapter: 1,
    indexInChapter: 8,
    type: 'normal',
    // 单波巨化：全章唯一 1 波关（无遗物），血量 2.6 倍但攻击平庸。
    // 故意打破"2~3 波"的节奏，做成纯粹的持续输出检定。
    waves: [{ enemyId: 'enemy_slime', variant: giant }],
    gemPower: 2,
    name: '巨化之守'
  },
  {
    id: 9,
    chapter: 1,
    indexInChapter: 9,
    type: 'elite',
    // Boss 前哨：精英幼龙。它是唯一带蓄力机制的精英，
    // 检验玩家在 Boss 战前是否真的掌握了「抢输出打断」。
    waves: [{ enemyId: 'enemy_slime' }, { enemyId: 'enemy_dragon_whelp', variant: elite }],
    gemPower: 2,
    name: '龙巢外围'
  },
  {
    id: 10,
    chapter: 1,
    indexInChapter: 10,
    type: 'boss', // REQ-LEVEL-003：每 10 关 Boss
    // 章节高潮：3 波 = 进 Boss 前拿满 2 个遗物。
    // 第二波用狂暴史莱姆做"考前最后一道题"——必须速杀，否则带着残血见龙。
    waves: [
      { enemyId: 'enemy_slime' },
      { enemyId: 'enemy_slime', variant: berserk },
      { enemyId: 'enemy_ancient_dragon' }
    ],
    gemPower: 2,
    name: '远古巨龙'
  },

  // ================================================================
  // 第二章：熔火裂谷（宝石攻击 3）—— 新敌 → 组合 → 变体 → 预告 → 精英
  // ================================================================
  {
    id: 11,
    chapter: 2,
    indexInChapter: 1,
    type: 'normal',
    // 新敌人登场：火蜥蜴 2 回合就出手，但血量只有 35。
    // 单波设计让玩家在没有干扰的情况下先读懂"快敌"的威胁。
    waves: [{ enemyId: 'enemy_fire_lizard' }],
    gemPower: 3,
    name: '裂谷入口'
  },
  {
    id: 12,
    chapter: 2,
    indexInChapter: 2,
    type: 'normal',
    // 双快敌：两只 2 回合出手的敌人交替施压，节奏明显比第一章紧
    waves: [{ enemyId: 'enemy_fire_lizard' }, { enemyId: 'enemy_fire_lizard' }],
    gemPower: 3,
    name: '灼热之径'
  },
  {
    id: 13,
    chapter: 2,
    indexInChapter: 3,
    type: 'normal',
    // 蜥群围拢：3 波逐步加压，最后以巨化火蜥蜴收尾——
    // 前面两波消耗注意力，最后一只 91 血的大块头检验持续输出
    waves: [
      { enemyId: 'enemy_fire_lizard' },
      { enemyId: 'enemy_fire_lizard' },
      { enemyId: 'enemy_fire_lizard', variant: giant }
    ],
    gemPower: 3,
    name: '蜥群游荡'
  },
  {
    id: 14,
    chapter: 2,
    indexInChapter: 4,
    type: 'normal',
    // 新机制预告：冰霜幽灵首次登场，冻结 2×2 棋盘。
    // 按「先见后学」原则，这里只放低强度版本（且是本段最轻的一关），
    // 让玩家在低压力下先观察冻结是什么，第三章才会围绕它出题。
    waves: [{ enemyId: 'enemy_fire_lizard' }, { enemyId: 'enemy_frost_ghost' }],
    gemPower: 3,
    name: '寒气渐浓'
  },
  {
    id: 15,
    chapter: 2,
    indexInChapter: 5,
    type: 'elite',
    // 章末精英：巨化火蜥蜴（血厚）+ 精英冰霜幽灵（冻结 + 数值墙），
    // 两条压力线叠加，作为第二章的收束，也是全 MVP 除 Boss 外最重的一关
    waves: [
      { enemyId: 'enemy_fire_lizard', variant: giant },
      { enemyId: 'enemy_frost_ghost', variant: elite }
    ],
    gemPower: 3,
    name: '霜火精英'
  }
]

/** 按 ID 查询关卡 */
export function getLevel(id: number): LevelConfig {
  const l = LEVELS.find((x) => x.id === id)
  if (!l) throw new Error(`[config] 未找到关卡配置: ${id}`)
  return l
}

/** 章节标题 */
export const CHAPTER_NAMES: Record<number, string> = {
  1: '第一章 · 微光之森',
  2: '第二章 · 熔火裂谷'
}
