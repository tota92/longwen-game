/**
 * 战斗特效视觉变体注册表（SVG 动画）
 *
 * 战斗舞台的命中特效不再靠"一套 CSS 渐变打天下"：每个招式都有自己的 SVG 动画，
 * store 只负责在结算时说出"这一击是什么招"（FxVariant），渲染层按变体挑动画。
 * 这样新增英雄/敌人招式时，只要在这里登记一条映射 + 在 fx 组件里画一段动画，
 * 不用再去动战斗流程代码。
 *
 * 变体分两个渲染族（family），对应 src/components/fx/ 下的两个片段组件：
 *   hero  英雄出手（含通用斩击/施法/治疗）—— 特效落在怪物身上
 *   enemy 怪物出手 —— 特效落在英雄身上
 * family 只决定"由哪个组件画"，落点仍由 HitFx.kind 决定（cast/heal 落在施法者自己）。
 */
import type { ElementType, EnemyAction } from '@/types'

/** 战斗特效的视觉变体：一条 = 一段独立的 SVG 动画 */
export type FxVariant =
  /* ── 通用 ── */
  /** 普攻斩击：单道元素色新月弧光 + 火花 */
  | 'slash_basic'
  /** 暴击/反噬：交叉双斩 + 冲击环 + 白芯爆闪 */
  | 'cross_slash'
  /** 施法前摇：双层符文魔法阵反向旋转 + 冲天光柱 */
  | 'arcane_cast'
  /** 治疗/护盾：上升光萤 + 双层扩散环 + 十字星辉 */
  | 'heal_bloom'
  /* ── 英雄招式 ── */
  /** 炎龙骑士·火焰斩：燃烧的月牙斩 + 火舌尾迹 + 余烬 */
  | 'flame_slash'
  /** 炎龙骑士·流星火雨：多颗流星坠落 + 落地火环爆炸 */
  | 'meteor_rain'
  /** 冰霜女巫·冰锥：三枚六棱冰锥射出 + 命中碎裂 + 霜雾 */
  | 'ice_shard'
  /** 冰霜女巫·绝对零度：雪花符文阵 + 冰霜新星 + 目标结冰晶格 */
  | 'absolute_zero'
  /** 森林德鲁伊·自然之触：藤蔓鞭击抽打 + 叶片飞散 + 治愈光点 */
  | 'nature_lash'
  /** 森林德鲁伊·生命之树：树干抽枝生长 + 树冠光晕 + 花瓣上升 */
  | 'tree_of_life'
  /* ── 怪物招式 ── */
  /** 爪击：三道撕裂爪痕 + 碎屑迸溅 */
  | 'claw_swipe'
  /** 重击：双层冲击波 + 放射裂纹 + 白芯爆闪 */
  | 'heavy_impact'
  /** 冰霜吐息：扇形霜雾 + 飘散雪花 + 地面冰棱 */
  | 'frost_breath'
  /** 毒液喷溅：上浮毒泡 + 爆裂 + 紫绿烟雾 */
  | 'toxic_burst'
  /** 火焰吐息：翻滚火舌 + 扇形热浪 + 火星 */
  | 'flame_breath'
  /** 蓄力大招：贯穿能量光束 + 环状冲击 + 电弧 */
  | 'beam_burst'
  /** 汲取：灵魂缕流被抽向怪物一侧 + 暗色漩涡 */
  | 'soul_drain'
  /** 污染：暗影触手蔓延 + 扩散污染环 */
  | 'corrupt_wave'
  /** 凝甲：六边形甲片拼合成盾 + 光边扫过 */
  | 'hex_barrier'
  /** 雷霆审判：自天而降的折线闪电 + 落点电弧环 */
  | 'thunder_judgment'

export interface FxSpec {
  /**
   * 特效元素在 DOM 中的驻留时长（ms），到时由 store 清理。
   * 已包含 140ms 命中同步延迟（等出手方冲到对面身前那一刻再起效）。
   */
  life: number
  /** 渲染分支：决定由 HeroFx.vue 还是 EnemyFx.vue 绘制 */
  family: 'hero' | 'enemy'
}

/**
 * 各变体的驻留时长：= 命中同步延迟(140ms) + 该变体内部最后一段动画的结束时刻 + 60ms 余量。
 * 调动画时长时必须回来同步这张表，否则特效会在收尾前被摘掉、画面硬切。
 */
export const FX_SPECS: Record<FxVariant, FxSpec> = {
  slash_basic: { life: 640, family: 'hero' },
  cross_slash: { life: 840, family: 'hero' },
  arcane_cast: { life: 1120, family: 'hero' },
  heal_bloom: { life: 1160, family: 'hero' },
  flame_slash: { life: 1030, family: 'hero' },
  meteor_rain: { life: 1480, family: 'hero' },
  ice_shard: { life: 1120, family: 'hero' },
  absolute_zero: { life: 1600, family: 'hero' },
  nature_lash: { life: 1480, family: 'hero' },
  tree_of_life: { life: 1800, family: 'hero' },
  claw_swipe: { life: 760, family: 'enemy' },
  heavy_impact: { life: 1030, family: 'enemy' },
  frost_breath: { life: 1060, family: 'enemy' },
  toxic_burst: { life: 1300, family: 'enemy' },
  flame_breath: { life: 1080, family: 'enemy' },
  beam_burst: { life: 1140, family: 'enemy' },
  soul_drain: { life: 1260, family: 'enemy' },
  corrupt_wave: { life: 1350, family: 'enemy' },
  hex_barrier: { life: 1100, family: 'enemy' },
  thunder_judgment: { life: 1000, family: 'enemy' }
}

/** 取变体驻留时长；未登记变体（理论上不会发生）退回通用时长 */
export function fxLife(variant: FxVariant | undefined, fallback: number): number {
  return variant ? FX_SPECS[variant].life : fallback
}

/** 变体由哪个渲染族绘制 */
export function fxFamily(variant: FxVariant | undefined): 'hero' | 'enemy' {
  return variant ? FX_SPECS[variant].family : 'enemy'
}

// ------------------------------------------------------------------
// 英雄技能 → 变体
// ------------------------------------------------------------------

/** 技能档位：四消小技能 / 五消终极技能 */
export type SkillTier = 'small' | 'ultimate'

/**
 * 英雄专属招式视觉：ID 精确登记，保证每个英雄的招式一眼可辨。
 * 新英雄只要在这里补一行，就能拿到自己的专属动画。
 */
const HERO_SKILL_FX: Record<string, Record<SkillTier, FxVariant>> = {
  hero_flame_knight: { small: 'flame_slash', ultimate: 'meteor_rain' },
  hero_frost_witch: { small: 'ice_shard', ultimate: 'absolute_zero' },
  hero_forest_druid: { small: 'nature_lash', ultimate: 'tree_of_life' }
}

/**
 * 按元素回退：未登记专属动画的英雄（含尚未实装的光/暗/雷）也有对味的特效，
 * 不至于退化成"一道白光"。
 */
const ELEMENT_SKILL_FX: Record<ElementType, Record<SkillTier, FxVariant>> = {
  fire: { small: 'flame_slash', ultimate: 'meteor_rain' },
  water: { small: 'ice_shard', ultimate: 'absolute_zero' },
  wood: { small: 'nature_lash', ultimate: 'tree_of_life' },
  light: { small: 'cross_slash', ultimate: 'beam_burst' },
  dark: { small: 'corrupt_wave', ultimate: 'soul_drain' },
  thunder: { small: 'ice_shard', ultimate: 'thunder_judgment' }
}

/** 英雄技能该播哪段动画：优先专属登记，其次按元素回退 */
export function heroSkillFx(heroId: string, element: ElementType, tier: SkillTier): FxVariant {
  return HERO_SKILL_FX[heroId]?.[tier] ?? ELEMENT_SKILL_FX[element][tier]
}

// ------------------------------------------------------------------
// 敌人行动 → 变体
// ------------------------------------------------------------------

/**
 * 敌人行动轮换（EnemyAction.kind）→ 招式动画。
 * charge 是"蓄力起手"，落在怪物自己身上；真正的大招在释放时另走 beam_burst。
 */
export const ENEMY_ACTION_FX: Record<EnemyAction['kind'], FxVariant> = {
  attack: 'claw_swipe',
  freezeBoard: 'frost_breath',
  poison: 'toxic_burst',
  burn: 'flame_breath',
  charge: 'arcane_cast',
  drain: 'soul_drain',
  corrupt: 'corrupt_wave',
  shield: 'hex_barrier'
}

// ------------------------------------------------------------------
// 招式 → 身位
// ------------------------------------------------------------------

/**
 * 施法 / 远程类招式：用"技能释放"身位（蓄力下蹲 → 浮空前倾 → 落地）。
 * 不在这张表里的都是贴身招式，走普通三段式前冲。
 * 分开的原因很直白：法师放流星雨时还往对手脸上冲，画面会读成"用脸打人"。
 */
const SKILL_POSE: ReadonlySet<FxVariant> = new Set<FxVariant>([
  'arcane_cast',
  'heal_bloom',
  'meteor_rain',
  'ice_shard',
  'absolute_zero',
  'tree_of_life',
  'frost_breath',
  'toxic_burst',
  'flame_breath',
  'beam_burst',
  'soul_drain',
  'corrupt_wave',
  'hex_barrier',
  'thunder_judgment'
])

/** 这一招该配哪种身位（ActorAction 的子集） */
export function fxPose(variant: FxVariant | undefined): 'attack' | 'skill' {
  return variant && SKILL_POSE.has(variant) ? 'skill' : 'attack'
}
