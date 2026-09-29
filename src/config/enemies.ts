/**
 * 敌人配置表（REQ-ENEMY / 5.2 敌人配置表；V2 元素克制 + 护甲 + 新行动）
 *
 * ── V2 数值基准 ──────────────────────────────────────────────
 * 锚点：1 回合标准输出 = 12（见 DAMAGE_ANCHOR）。普通敌人 HP ≈ 5×锚点 = 60，
 * 目标"每波 4~6 回合、敌人出手 1~2 次"，让威胁真实存在（V1 敌人常在死前没出过手）。
 * 表内数值均为**第一章基准**，实际战斗由编排层按章节成长：
 *   HP  ×(本章宝石攻击 ÷ 2)（第 2 章 ×1.5）｜ 攻击 ×(1 + 0.25×(章-1))
 *
 * ── 元素克制（V2）────────────────────────────────────────────
 * 克制轮：火 → 木 → 雷 → 水 → 火（箭头=克制），光 ↔ 暗 互克。
 * 命中弱点 ×1.5、撞上抗性 ×0.5；6 种元素均在棋盘上，
 * 因此"打弱点"不依赖英雄池（没有雷英雄也能消雷宝石吃克制）。
 *
 * ── 机制（每章新机制不超过 1 种，REQ-ENEMY-102）─────────────
 * 第一章：元素克制（棋盘规则）＋ 护甲（巨化/精英）＋ 蓄力打断（Boss）
 * 第二章：污染（棋盘构成干扰）＋ 冻结
 *
 * 数值锚点：第一章玩家攻击 2，约 4~5 回合击杀普通敌人（REQ-LEVEL-002 V2 修订）
 *
 * Boss 战设计（REQ-ENEMY-003 / 5.4 Boss 战机制）：
 * - patterns 为「行动轮换」：Boss 每次行动按顺序取一条并循环，形成可读招的节奏，
 *   替代早期"永远只有一次普通攻击"的单调设计。
 * - charge 为「蓄力—打断」：Boss 蓄力后进入倒计时，玩家在窗口内累计造成 interrupt
 *   点伤害即可打断（Boss 吃 recoil 反噬），否则吃下 releaseDamage 大招。
 *   这条机制把"无脑消"变成"必须抢输出的攻防博弈"，是 Boss 战的核心张力。
 * - enrage 为「阶段内狂怒」：阶段血量过半后攻击力一次性提升，制造阶段内拐点。
 * - phaseAttack / phaseCountdown 让二阶段「狂怒」在攻击力与节奏上明显区别于第一阶段。
 */
import type { EnemyConfig, EnemyVariant } from '@/types'

export const ENEMIES: EnemyConfig[] = [
  {
    id: 'enemy_slime',
    name: '史莱姆',
    element: 'wood',
    weak: 'fire',
    resist: 'thunder',
    phaseHP: [68],
    countdown: 3,
    attack: 17,
    armor: [0],
    skill: { type: 'none' },
    desc: '最基础的魔物，木属性：弱火、抗雷。没有特殊技能，用来读懂"打弱点"',
    iconId: 'enemy_slime',
    spriteId: 'enemy_slime'
  },
  {
    id: 'enemy_fire_lizard',
    name: '火蜥蜴',
    element: 'fire',
    weak: 'water',
    resist: 'wood',
    phaseHP: [62],
    countdown: 2,
    attack: 13,
    armor: [0],
    // 污染：把 3 颗宝石转为火元素（伤害取当前攻击力，随变体/章节成长）。
    // 它本身抗木、弱水，满屏火宝石是陷阱不是礼物——别看到什么多就消什么。
    patterns: [[{ kind: 'corrupt', name: '熔岩喷涂', count: 3 }]],
    skill: { type: 'none' },
    desc: '迅捷的火属性爬虫：行动时将 3 颗宝石污染为火元素（它抗木、弱水）',
    iconId: 'enemy_fire_lizard',
    spriteId: 'enemy_fire_lizard'
  },
  {
    id: 'enemy_frost_ghost',
    name: '冰霜幽灵',
    element: 'water',
    weak: 'thunder',
    resist: 'fire',
    phaseHP: [85],
    countdown: 3,
    attack: 15,
    armor: [1],
    patterns: [
      [
        { kind: 'freezeBoard', name: '霜冻领域', size: 2, turns: 2, damage: 10 },
        { kind: 'attack', name: '幽影触碰' }
      ]
    ],
    skill: { type: 'none' },
    desc: '水属性幽灵：冻结棋盘 2×2 区域；被冻宝石无法交换与消除；弱雷、抗火',
    iconId: 'enemy_frost_ghost',
    spriteId: 'enemy_frost_ghost'
  },
  {
    id: 'enemy_dragon_whelp',
    name: '幼龙',
    element: 'dark',
    weak: 'light',
    resist: 'dark',
    phaseHP: [50, 45], // 教学关两阶段 Boss
    countdown: 2,
    attack: 11,
    armor: [0, 0],
    phaseBlast: { damage: 10 },
    // 教学：开局即蓄力——玩家几乎必然打断，用正反馈教会"蓄力要抢输出"
    patterns: [
      [
        {
          kind: 'charge',
          name: '龙息蓄能',
          release: '幼龙吐息',
          releaseDamage: 20,
          interrupt: 26,
          recoil: 11,
          window: 3
        },
        { kind: 'attack', name: '龙爪拍击' }
      ]
    ],
    skill: { type: 'none' },
    desc: '远古巨龙的幼体，暗属性（弱光）：两阶段教学 Boss，会蓄力吐息，抢输出可打断',
    iconId: 'enemy_dragon_whelp',
    spriteId: 'enemy_dragon_whelp'
  },
  {
    id: 'enemy_ancient_dragon',
    name: '远古巨龙',
    element: 'fire',
    weak: 'water',
    resist: 'wood',
    phaseHP: [118, 96], // 两阶段（REQ-ENEMY-003）
    countdown: 3,
    attack: 16,
    phaseAttack: [16, 20], // 二阶段狂怒：攻击力提升
    phaseCountdown: [3, 2], // 二阶段狂怒：出招更快（蓄力窗口独立，保证打断公平）
    armor: [1, 1], // 护甲 1：小消被轻微惩罚，大消与技能几乎不受影响
    enrage: { threshold: 0.5, atkMult: 1.2 }, // 阶段内狂怒：半数血后攻击 +20%
    phaseBlast: { damage: 14 }, // 阶段转换全屏吐息
    // 每阶段「蓄力开局」：玩家必须优先抢输出打断，否则吃满大招——
    // 这是把"无脑消"变成攻防博弈的关键；蓄力之后才轮到干扰与普攻。
    patterns: [
      [
        {
          kind: 'charge',
          name: '龙焰蓄能',
          release: '灭世龙焰',
          releaseDamage: 32,
          interrupt: 30,
          recoil: 15,
          window: 3
        },
        { kind: 'freezeBoard', name: '冰霜吐息', size: 2, turns: 2, damage: 12 },
        { kind: 'attack', name: '利爪撕裂' }
      ],
      [
        {
          kind: 'charge',
          name: '灭世蓄能',
          release: '末日龙焰',
          releaseDamage: 42,
          interrupt: 38,
          recoil: 18,
          window: 3
        },
        { kind: 'burn', name: '熔岩吐息', damage: 16, burn: { damage: 6, turns: 3 } },
        { kind: 'attack', name: '狂暴撕咬' }
      ]
    ],
    skill: { type: 'none' },
    desc: '第一章节 Boss，火属性（弱水、抗木）：每阶段以蓄力大招开局，半血后狂怒',
    iconId: 'enemy_ancient_dragon',
    spriteId: 'enemy_ancient_dragon'
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
 *
 * V2 补充：精英与巨化额外获得 1 点护甲 —— 让"数值墙/持久战"同时惩罚小消，
 * 逼玩家在打这两个变体时改用大消与技能石。
 * V2.2：精英攻击倍率 1.4 → 1.3、精英 HP 倍率 1.8 → 1.7、巨化 HP 倍率 2.6 → 2.2。
 * 依据：第二章精英叠加章节成长后单次 29 点、巨化单波 200+ 血造成的"消耗战"过长，
 * 使 2-3 / 2-5 的 AI 死亡率冲到 10~45%（目标 0~30%）。
 */
export const ENEMY_VARIANTS = {
  elite: { namePrefix: '精英', hpMult: 1.7, atkMult: 1.3, armorAdd: 1, tint: '#d4af37' },
  berserk: { namePrefix: '狂暴', hpMult: 1.15, atkMult: 2, tint: '#ff5a3c' },
  giant: { namePrefix: '巨化', hpMult: 2.2, atkMult: 1, armorAdd: 1, tint: '#a06bff' },
  swift: { namePrefix: '迅捷', hpMult: 1, atkMult: 1, countdownDelta: -1, tint: '#2cc3e6' }
} as const satisfies Record<string, EnemyVariant>

/** 变体键名 */
export type EnemyVariantKey = keyof typeof ENEMY_VARIANTS
