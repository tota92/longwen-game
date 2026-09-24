/**
 * 关卡配置表（REQ-LEVEL / 6.1 章节结构）
 * MVP：第一章 10 关 + 第二章 5 关
 * 关卡结构：每关由 1~3 波敌人组成；波间触发遗物三选一（局内构建，REQ-RELIC）
 * 数值基准：每章宝石攻击 +1，普通敌人 HP +10，约 3 回合击杀普通敌人（REQ-LEVEL-002）
 */
import { ELITE_MODIFIER } from './enemies'
import type { LevelConfig } from '@/types'

export const LEVELS: LevelConfig[] = [
  // ============ 第一章：微光之森（宝石攻击 2） ============
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
    tutorial: 'intro5', // REQ-TUTO-004：引入五消与两阶段 Boss，过关展示遗物
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
    waves: [{ enemyId: 'enemy_slime' }, { enemyId: 'enemy_slime' }],
    gemPower: 2,
    name: '林间清扫'
  },
  {
    id: 5,
    chapter: 1,
    indexInChapter: 5,
    type: 'elite', // REQ-LEVEL-003：每 5 关精英
    waves: [
      { enemyId: 'enemy_slime' },
      { enemyId: 'enemy_slime', elite: { ...ELITE_MODIFIER } }
    ],
    gemPower: 2,
    name: '精英阻路'
  },
  {
    id: 6,
    chapter: 1,
    indexInChapter: 6,
    type: 'normal',
    waves: [{ enemyId: 'enemy_slime' }, { enemyId: 'enemy_slime' }],
    gemPower: 2,
    name: '深林小径'
  },
  {
    id: 7,
    chapter: 1,
    indexInChapter: 7,
    type: 'normal',
    waves: [
      { enemyId: 'enemy_slime' },
      { enemyId: 'enemy_slime' },
      { enemyId: 'enemy_slime' }
    ],
    gemPower: 2,
    name: '连环遭遇'
  },
  {
    id: 8,
    chapter: 1,
    indexInChapter: 8,
    type: 'normal',
    waves: [{ enemyId: 'enemy_slime' }, { enemyId: 'enemy_slime' }],
    gemPower: 2,
    name: '湿润洞窟'
  },
  {
    id: 9,
    chapter: 1,
    indexInChapter: 9,
    type: 'normal',
    waves: [
      { enemyId: 'enemy_slime' },
      { enemyId: 'enemy_slime' },
      { enemyId: 'enemy_slime' }
    ],
    gemPower: 2,
    name: '龙巢外围'
  },
  {
    id: 10,
    chapter: 1,
    indexInChapter: 10,
    type: 'boss', // REQ-LEVEL-003：每 10 关 Boss
    waves: [{ enemyId: 'enemy_slime' }, { enemyId: 'enemy_ancient_dragon' }],
    gemPower: 2,
    name: '远古巨龙'
  },
  // ============ 第二章：熔火裂谷（宝石攻击 3） ============
  {
    id: 11,
    chapter: 2,
    indexInChapter: 1,
    type: 'normal',
    waves: [{ enemyId: 'enemy_fire_lizard' }, { enemyId: 'enemy_fire_lizard' }],
    gemPower: 3,
    name: '裂谷入口'
  },
  {
    id: 12,
    chapter: 2,
    indexInChapter: 2,
    type: 'normal',
    waves: [{ enemyId: 'enemy_fire_lizard' }, { enemyId: 'enemy_fire_lizard' }],
    gemPower: 3,
    name: '灼热之径'
  },
  {
    id: 13,
    chapter: 2,
    indexInChapter: 3,
    type: 'normal',
    waves: [
      { enemyId: 'enemy_fire_lizard' },
      { enemyId: 'enemy_fire_lizard' },
      { enemyId: 'enemy_fire_lizard' }
    ],
    gemPower: 3,
    name: '蜥群游荡'
  },
  {
    id: 14,
    chapter: 2,
    indexInChapter: 4,
    type: 'normal',
    waves: [
      { enemyId: 'enemy_fire_lizard' },
      { enemyId: 'enemy_frost_ghost' } // 第二章末引入冰霜幽灵，预告第三章冻结机制
    ],
    gemPower: 3,
    name: '寒气渐浓'
  },
  {
    id: 15,
    chapter: 2,
    indexInChapter: 5,
    type: 'elite',
    waves: [
      { enemyId: 'enemy_fire_lizard' },
      { enemyId: 'enemy_frost_ghost', elite: { ...ELITE_MODIFIER } }
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
