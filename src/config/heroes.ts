/**
 * 英雄配置表（REQ-HERO / 3.2 英雄技能表）
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
      desc: '造成 15 点伤害',
      damage: 15
    },
    skill5: {
      name: '流星火雨',
      desc: '造成 25 点伤害，并使敌人燃烧（每回合 5 伤害，持续 2 回合）',
      damage: 25,
      burn: { damage: 5, turns: 2 }
    },
    passiveId: 'fireSkillUp',
    passiveDesc: '火属性技能伤害 +15%'
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
      desc: '造成 12 点伤害，冻结敌人 1 回合',
      damage: 12,
      freeze: 1
    },
    skill5: {
      name: '绝对零度',
      desc: '造成 20 点伤害，冻结敌人 2 回合',
      damage: 20,
      freeze: 2
    },
    passiveId: 'enemyCdUp',
    passiveDesc: '敌人初始行动倒计时 +1'
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
      desc: '造成 10 点伤害，回复 8 点生命',
      damage: 10,
      heal: 8
    },
    skill5: {
      name: '生命之树',
      desc: '回复 30 点生命',
      damage: 0,
      heal: 30
    },
    passiveId: 'healPerTurn',
    passiveDesc: '每回合结束回复 3 点生命'
  }
]

/** 按 ID 查询英雄 */
export function getHero(id: string): HeroConfig {
  const h = HEROES.find((x) => x.id === id)
  if (!h) throw new Error(`[config] 未找到英雄配置: ${id}`)
  return h
}
