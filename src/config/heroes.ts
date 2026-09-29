/**
 * 英雄配置表（REQ-HERO / 3.2 英雄技能表；V2 技能价值重估 + 被动调整）
 *
 * ── 技能定价（V2）───────────────────────────────────────────
 * 锚点：1 回合标准输出（STO）= 12 点伤害（见 DAMAGE_ANCHOR）。
 *   四消技能 ≈ 2×STO ≈ 24  ｜ 五消技能 ≈ 3.5~4×STO ≈ 42
 * V1 的火焰斩 15 点只值 1 个普通回合，四消毫无惊喜；V2 把技能石做成真正的爆发。
 * 技能伤害随章节缩放：×(本章宝石攻击 ÷ 2)，见 skillChapterScale。
 *
 * ── 支援被动（V2 调整）──────────────────────────────────────
 * 冰霜女巫「敌人初始倒计时 +1」（V1）会把每个敌人的首击整体推迟 1 回合，
 * 在 V1 的短击杀节奏下等于删除敌人行动（威胁塌陷的主因之一）。
 * V2 改为「冻结效果 +1 回合」：保留控制定位，不再扭曲出手节奏。
 * MVP 实现：炎龙骑士 / 冰霜女巫 / 森林德鲁伊
 */
import type { HeroConfig } from '@/types'

export const HEROES: HeroConfig[] = [
  {
    id: 'hero_flame_knight',
    name: '炎龙骑士',
    title: '烈焰执刃者',
    element: 'fire',
    iconId: 'hero_flame_knight',
    spriteId: 'hero_flame_knight',
    skill4IconId: 'skill_flame_slash',
    skill5IconId: 'skill_meteor_rain',
    color: '#ff5a3c',
    skill4: {
      name: '火焰斩',
      desc: '造成 24 点伤害',
      damage: 24
    },
    skill5: {
      name: '流星火雨',
      desc: '造成 42 点伤害，并使敌人燃烧（每回合 6 伤害，持续 2 回合）',
      damage: 42,
      burn: { damage: 6, turns: 2 }
    },
    passiveId: 'fireSkillUp',
    passiveDesc: '火元素造成的伤害 +10%（宝石与技能）'
  },
  {
    id: 'hero_frost_witch',
    name: '冰霜女巫',
    title: '极寒咏叹者',
    element: 'water',
    iconId: 'hero_frost_witch',
    spriteId: 'hero_frost_witch',
    skill4IconId: 'skill_ice_shard',
    skill5IconId: 'skill_absolute_zero',
    color: '#3ca7ff',
    skill4: {
      name: '冰锥',
      desc: '造成 18 点伤害，冻结敌人 1 回合',
      damage: 18,
      freeze: 1
    },
    skill5: {
      name: '绝对零度',
      desc: '造成 32 点伤害，冻结敌人 2 回合',
      damage: 32,
      freeze: 2
    },
    passiveId: 'freezeUp',
    passiveDesc: '冻结效果持续 +1 回合'
  },
  {
    id: 'hero_forest_druid',
    name: '森林德鲁伊',
    title: '自然守望者',
    element: 'wood',
    iconId: 'hero_forest_druid',
    spriteId: 'hero_forest_druid',
    skill4IconId: 'skill_natures_touch',
    skill5IconId: 'skill_tree_of_life',
    color: '#4cd964',
    skill4: {
      name: '自然之触',
      desc: '造成 16 点伤害，回复 12 点生命',
      damage: 16,
      heal: 12
    },
    skill5: {
      name: '生命之树',
      desc: '回复 40 点生命，并清除全部负面状态',
      damage: 0,
      heal: 40,
      clearDebuff: true
    },
    passiveId: 'healPerTurn',
    passiveDesc: '每回合结束回复 2 点生命'
  }
]

/** 按 ID 查询英雄 */
export function getHero(id: string): HeroConfig {
  const h = HEROES.find((x) => x.id === id)
  if (!h) throw new Error(`[config] 未找到英雄配置: ${id}`)
  return h
}
