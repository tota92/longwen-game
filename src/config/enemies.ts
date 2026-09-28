/**
 * 敌人配置表（REQ-ENEMY / 5.2 敌人配置表）
 * MVP：史莱姆 / 火蜥蜴 / 冰霜幽灵 / 远古巨龙（两阶段 Boss）+ 教学用幼龙
 * 数值锚点：第一章玩家攻击 2，约 3 回合击杀普通敌人
 *
 * Boss 战设计（REQ-ENEMY-003 / 5.4 Boss 战机制）：
 * - patterns 为「行动轮换」：Boss 每次行动按顺序取一条并循环，形成可读招的节奏，
 *   替代早期"永远只有一次普通攻击"的单调设计。
 * - charge 为「蓄力—打断」：Boss 蓄力后进入倒计时，玩家在窗口内累计造成 interrupt
 *   点伤害即可打断（Boss 吃 recoil 反噬），否则吃下 releaseDamage 大招。
 *   这条机制把"无脑消"变成"必须抢输出的攻防博弈"，是 Boss 战的核心张力。
 * - phaseAttack / phaseCountdown 让二阶段「狂怒」在攻击力与节奏上明显区别于第一阶段。
 */
import type { EnemyConfig, EnemyVariant } from '@/types'

export const ENEMIES: EnemyConfig[] = [
  {
    id: 'enemy_slime',
    name: '史莱姆',
    phaseHP: [30],
    countdown: 3,
    attack: 8,
    skill: { type: 'none' },
    desc: '最基础的魔物，没有特殊技能',
    iconId: 'enemy_slime'
  },
  {
    id: 'enemy_fire_lizard',
    name: '火蜥蜴',
    phaseHP: [25 + 10], // 第二章：基础 25 + 章节加成 10（REQ-LEVEL-002）
    countdown: 2,
    attack: 6,
    skill: { type: 'none' },
    desc: '行动迅捷的爬虫，倒计时极短',
    iconId: 'enemy_fire_lizard'
  },
  {
    id: 'enemy_frost_ghost',
    name: '冰霜幽灵',
    phaseHP: [35 + 10],
    countdown: 3,
    attack: 8,
    skill: { type: 'freezeBoard', size: 2, turns: 2 },
    desc: '行动时冻结棋盘 2×2 区域，被冻宝石无法交换与消除',
    iconId: 'enemy_frost_ghost'
  },
  {
    id: 'enemy_dragon_whelp',
    name: '幼龙',
    phaseHP: [22, 20], // 教学关削弱版两阶段 Boss
    countdown: 2,
    attack: 5,
    phaseBlast: { damage: 6 },
    // 教学：开局即蓄力——玩家几乎必然打断，用正反馈教会"蓄力要抢输出"
    patterns: [
      [
        {
          kind: 'charge',
          name: '龙息蓄能',
          release: '幼龙吐息',
          releaseDamage: 10,
          interrupt: 14,
          recoil: 6,
          window: 3
        },
        { kind: 'attack', name: '龙爪拍击' }
      ]
    ],
    skill: { type: 'none' },
    desc: '远古巨龙的幼体，两阶段战斗的教学演示；会蓄力吐息，抢输出可打断',
    iconId: 'enemy_dragon_whelp'
  },
  {
    id: 'enemy_ancient_dragon',
    name: '远古巨龙',
    phaseHP: [120, 100], // 两阶段（REQ-ENEMY-003）
    countdown: 3,
    attack: 14,
    phaseAttack: [14, 17], // 二阶段狂怒：攻击力提升
    phaseCountdown: [3, 2], // 二阶段狂怒：出招更快（蓄力窗口独立，保证打断公平）
    phaseBlast: { damage: 12 }, // 阶段转换全屏吐息
    // 每阶段「蓄力开局」：玩家必须优先抢输出打断，否则吃满大招——
    // 这是把"无脑消"变成攻防博弈的关键；蓄力之后才轮到干扰与普攻。
    patterns: [
      [
        {
          kind: 'charge',
          name: '龙焰蓄能',
          release: '灭世龙焰',
          releaseDamage: 30,
          interrupt: 38,
          recoil: 14,
          window: 3
        },
        { kind: 'freezeBoard', name: '冰霜吐息', size: 2, turns: 2, damage: 8 },
        { kind: 'attack', name: '利爪撕裂' }
      ],
      [
        {
          kind: 'charge',
          name: '灭世蓄能',
          release: '末日龙焰',
          releaseDamage: 40,
          interrupt: 48,
          recoil: 16,
          window: 3
        },
        { kind: 'burn', name: '熔岩吐息', damage: 12, burn: { damage: 7, turns: 3 } },
        { kind: 'attack', name: '狂暴撕咬' }
      ]
    ],
    skill: { type: 'none' },
    desc: '第一章节 Boss。每阶段以蓄力大招开局：抢输出打断它，否则吃满伤害',
    iconId: 'enemy_ancient_dragon'
  }
]

/** 按 ID 查询敌人 */
export function getEnemy(id: string): EnemyConfig {
  const e = ENEMIES.find((x) => x.id === id)
  if (!e) throw new Error(`[config] 未找到敌人配置: ${id}`)
  return e
}

/**
 * 敌人变体预设（关卡设计工具箱，见关卡设计文档「敌人变体」一节）
 *
 * 设计动机：MVP 每章只有 1~2 种敌人素材，若只靠堆数量，关卡会高度同质。
 * 变体让同一套素材派生出定位完全不同的谜题，且不新增任何美术资源：
 * - 精英 elite   ：攻守兼备的数值墙，作为关卡小高潮
 * - 狂暴 berserk ：血少但极痛，逼玩家优先速杀，不能拖
 * - 巨化 giant   ：血极厚但攻击平庸，考验持续输出与遗物构筑
 * - 迅捷 swift   ：出手频率更高，压缩玩家的思考与操作时间
 */
export const ENEMY_VARIANTS = {
  elite: { namePrefix: '精英', hpMult: 1.8, atkMult: 1.4, tint: '#d4af37' },
  berserk: { namePrefix: '狂暴', hpMult: 1.15, atkMult: 2, tint: '#ff5a3c' },
  giant: { namePrefix: '巨化', hpMult: 2.6, atkMult: 1, tint: '#a06bff' },
  swift: { namePrefix: '迅捷', hpMult: 1, atkMult: 1, countdownDelta: -1, tint: '#2cc3e6' }
} as const satisfies Record<string, EnemyVariant>

/** 变体键名 */
export type EnemyVariantKey = keyof typeof ENEMY_VARIANTS
