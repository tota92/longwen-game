/**
 * 图标设计系统（魔幻风格视觉语言）
 *
 * 设计规范（全系列统一，确保一致性与辨识度）：
 * - 画布：256×256（构建时以 512 渲染后降采样至 256，保证边缘锐利）
 * - 光源：左上方 45°，所有高光/阴影方向一致
 * - 四大族系：
 *   A. medallion 圆形符文徽章 —— 英雄/技能/遗物/敌人/关卡节点/结算（金环 + 符文圈 + 深紫底盘 + 元素光晕）
 *   B. gem 宝石切面      —— 棋盘元素与技能石（无徽章边框，保证小尺寸可辨识）
 *   C. badge 状态圆徽     —— 状态图标（粗环 + 高对比符号，16~20px 可读）
 *   D. glyph UI 符号      —— 按钮/功能图标（金质符号 + 暗色描边 + 对比底衬）
 * - 不使用 SVG 滤镜：光晕/质感全部由多层渐变与半透明形状实现，
 *   保证渲染器无关、文件体积可控、无滤镜性能开销
 */
import type { ElementType } from '@/types'

export const SIZE = 256

/** 镜像辅助：以 x=128 为轴左右镜像，保证生物/对称图形严格对称 */
export function mirrorX(group: string): string {
  return `<g>${group}</g><g transform="translate(256 0) scale(-1 1)">${group}</g>`
}

/** 图标分组 */
export type IconGroup =
  | 'element'
  | 'overlay'
  | 'hero'
  | 'skill'
  | 'relic'
  | 'enemy'
  | 'status'
  | 'node'
  | 'ui'
  | 'result'

export interface IconDef {
  /** 唯一 ID（即输出文件名与运行时引用键） */
  id: string
  /** 中文名称（清单/审查用） */
  name: string
  group: IconGroup
  /** 游戏内用途说明 */
  usage: string
  /** 完整 SVG 文档 */
  svg: string
}

/** 包装为完整 SVG 文档（256 逻辑尺寸，构建时放大到 512 渲染再降采样） */
export function frame(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 256 256">${body}</svg>`
}
export const C = {
  gold: '#d4af37',
  goldLight: '#f7e7a8',
  goldMid: '#c9a227',
  goldDeep: '#7d5f16',
  void: '#0d0718',
  plateCore: '#3b2566',
  plateEdge: '#0c0616',
  arcane: '#2a4a8a',
  emerald: '#2fa860',
  emeraldLight: '#8bf0bb'
} as const

export interface Accent {
  /** 主色 */
  base: string
  /** 高光色 */
  light: string
  /** 暗部色 */
  deep: string
  /** 光晕色 */
  glow: string
}

/** 元素主题色与游戏内 ELEMENT_INFO 保持一致（棋盘/UI 视觉统一） */
export const ELEMENT_ACCENT: Record<ElementType, Accent> = {
  fire: { base: '#ff5a3c', light: '#ffc59b', deep: '#8c1f0d', glow: '#ff7a3c' },
  water: { base: '#3ca7ff', light: '#c2e9ff', deep: '#12457f', glow: '#5cc0ff' },
  wood: { base: '#4cd964', light: '#c6f8cf', deep: '#146b2c', glow: '#6ce884' },
  light: { base: '#f0b429', light: '#ffeab0', deep: '#8a5a06', glow: '#ffd25c' },
  dark: { base: '#a06bff', light: '#e0c9ff', deep: '#3d1a7a', glow: '#b98cff' },
  thunder: { base: '#2cc3e6', light: '#bff2fb', deep: '#0a5a70', glow: '#57dcf5' }
}

/** 通用强调色（非元素图标使用） */
export const ACCENT = {
  gold: { base: C.gold, light: C.goldLight, deep: C.goldDeep, glow: '#ffdf7a' },
  arcane: { base: '#7b6cff', light: '#d5cfff', deep: '#2b1f8a', glow: '#9d8cff' },
  emerald: { base: C.emerald, light: C.emeraldLight, deep: '#125230', glow: '#5fdc95' },
  blood: { base: '#e5484d', light: '#ffc2c4', deep: '#7a0f14', glow: '#ff6b70' },
  frost: { base: '#68d8ff', light: '#d8f4ff', deep: '#1a5a7a', glow: '#8ee6ff' },
  shadow: { base: '#8a5cff', light: '#dcc7ff', deep: '#2a1060', glow: '#a97bff' },
  bone: { base: '#c9c2b0', light: '#f2ede0', deep: '#5a5348', glow: '#e6dfcc' }
} satisfies Record<string, Accent>

// ------------------------------------------------------------------
// 基础构件
// ------------------------------------------------------------------

/** 4 角星光点（魔法粒子） */
export function spark(cx: number, cy: number, r: number, color: string, opacity = 1): string {
  const w = r * 0.24
  return (
    `<path d="M${cx} ${cy - r}C${cx + w} ${cy - w} ${cx + w} ${cy - w} ${cx + r} ${cy}` +
    `C${cx + w} ${cy + w} ${cx + w} ${cy + w} ${cx} ${cy + r}` +
    `C${cx - w} ${cy + w} ${cx - w} ${cy + w} ${cx - r} ${cy}` +
    `C${cx - w} ${cy - w} ${cx - w} ${cy - w} ${cx} ${cy - r}Z"` +
    ` fill="${color}" opacity="${opacity}"/>`
  )
}

/** 光晕（径向渐变，替代 SVG 滤镜实现柔和发光） */
export function halo(uid: string, cx: number, cy: number, r: number, color: string, opacity = 0.55): string {
  const id = `${uid}-halo`
  return (
    `<defs><radialGradient id="${id}" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/>` +
    `<stop offset="55%" stop-color="${color}" stop-opacity="${(opacity * 0.4).toFixed(2)}"/>` +
    `<stop offset="100%" stop-color="${color}" stop-opacity="0"/>` +
    `</radialGradient></defs>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>`
  )
}

/** 金质渐变定义（光源左上） */
export function goldDefs(uid: string): string {
  return (
    `<linearGradient id="${uid}-gold" x1="0.15" y1="0" x2="0.85" y2="1">` +
    `<stop offset="0%" stop-color="${C.goldLight}"/>` +
    `<stop offset="38%" stop-color="${C.gold}"/>` +
    `<stop offset="72%" stop-color="${C.goldMid}"/>` +
    `<stop offset="100%" stop-color="${C.goldDeep}"/>` +
    `</linearGradient>` +
    `<linearGradient id="${uid}-goldBright" x1="0" y1="0" x2="0.4" y2="1">` +
    `<stop offset="0%" stop-color="#fffaf0"/>` +
    `<stop offset="60%" stop-color="${C.goldLight}"/>` +
    `<stop offset="100%" stop-color="${C.gold}"/>` +
    `</linearGradient>`
  )
}

/** 强调色渐变定义 */
export function accentDefs(uid: string, a: Accent): string {
  return (
    `<linearGradient id="${uid}-acc" x1="0.1" y1="0" x2="0.9" y2="1">` +
    `<stop offset="0%" stop-color="${a.light}"/>` +
    `<stop offset="42%" stop-color="${a.base}"/>` +
    `<stop offset="100%" stop-color="${a.deep}"/>` +
    `</linearGradient>` +
    `<linearGradient id="${uid}-accDim" x1="0.2" y1="0" x2="0.8" y2="1">` +
    `<stop offset="0%" stop-color="${a.base}"/>` +
    `<stop offset="100%" stop-color="${a.deep}"/>` +
    `</linearGradient>`
  )
}

// ------------------------------------------------------------------
// 族系 A：圆形符文徽章
// ------------------------------------------------------------------

const RUNE_VARIANTS = [
  'M-7 -9 L-7 9 M-7 -3 L7 -9 M-7 4 L7 9',
  'M0 -10 L0 10 M0 -10 L8 0 M0 0 L-8 3',
  'M-8 -8 L8 -8 M0 -8 L0 10 M-5 3 L5 3',
  'M-8 9 L-8 -5 L8 -5 M2 -5 L2 9 M8 -5 L8 4'
]

/** 环绕符文圈：12 枚金色符文刻痕 */
export function runeRing(uid: string, radius = 96, count = 12): string {
  let out = `<g stroke="url(#${uid}-gold)" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.42">`
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i + 15
    out += `<g transform="rotate(${angle} 128 128) translate(128 ${128 - radius})"><path d="${RUNE_VARIANTS[i % RUNE_VARIANTS.length]}"/></g>`
  }
  return out + '</g>'
}

export interface MedallionOptions {
  uid: string
  accent: Accent
  /** 主体内容（绘制在 r≈76 的范围内） */
  subject: string
  /** 装饰性底纹（可选，绘制在主体之下） */
  underlay?: string
  /** 是否绘制符文圈（默认 true） */
  runes?: boolean
}

/**
 * 族系 A：圆形符文徽章
 * 结构：金环 → 刻痕 → 深紫底盘 → 内圈倒角 → 强调光晕 → 底纹 → 主体 → 顶弧高光 → 粒子
 */
export function medallion({ uid, accent, subject, underlay = '', runes = true }: MedallionOptions): string {
  const sparks = [
    spark(52, 62, 9, accent.light, 0.85),
    spark(206, 74, 7, accent.light, 0.7),
    spark(196, 196, 8, accent.light, 0.6),
    spark(60, 188, 6, accent.light, 0.5)
  ].join('')

  return (
    `<defs>` +
    goldDefs(uid) +
    accentDefs(uid, accent) +
    `<radialGradient id="${uid}-plate" cx="42%" cy="30%" r="78%">` +
    `<stop offset="0%" stop-color="${C.plateCore}"/>` +
    `<stop offset="58%" stop-color="#1d1136"/>` +
    `<stop offset="100%" stop-color="${C.plateEdge}"/>` +
    `</radialGradient>` +
    `<linearGradient id="${uid}-spec" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/>` +
    `<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>` +
    `</linearGradient>` +
    `<radialGradient id="${uid}-floor" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="#000000" stop-opacity="0.45"/>` +
    `<stop offset="100%" stop-color="#000000" stop-opacity="0"/>` +
    `</radialGradient>` +
    `</defs>` +
    // 外金环（双层：粗环 + 上左高光细环）
    `<circle cx="128" cy="128" r="117" fill="none" stroke="url(#${uid}-gold)" stroke-width="9"/>` +
    `<circle cx="128" cy="128" r="117" fill="none" stroke="${C.goldLight}" stroke-width="2.4" opacity="0.75" stroke-dasharray="52 14 26 14" />` +
    // 金环刻痕
    `<g opacity="0.85">` +
    [0, 90, 180, 270].map((a) => `<g transform="rotate(${a} 128 128)"><rect x="124.6" y="3" width="6.8" height="16" rx="3" fill="url(#${uid}-gold)"/></g>`).join('') +
    `</g>` +
    // 深紫底盘
    `<circle cx="128" cy="128" r="110" fill="url(#${uid}-plate)"/>` +
    `<circle cx="128" cy="128" r="110" fill="none" stroke="#08040f" stroke-width="3"/>` +
    `<circle cx="128" cy="128" r="103" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.07"/>` +
    (runes ? runeRing(uid) : '') +
    // 强调光晕
    halo(uid, 128, 132, 78, accent.glow, 0.5) +
    `<ellipse cx="128" cy="182" rx="70" ry="26" fill="url(#${uid}-floor)"/>` +
    underlay +
    subject +
    // 顶部玻璃高光
    `<path d="M46 96 A104 104 0 0 1 210 96 A118 118 0 0 0 46 96Z" fill="url(#${uid}-spec)" opacity="0.5"/>` +
    sparks
  )
}

// ------------------------------------------------------------------
// 族系 B：宝石切面（棋盘元素/技能石）
// ------------------------------------------------------------------

export interface GemOptions {
  uid: string
  accent: Accent
  /** 宝石内的元素印记（绘制在中心 ±26 范围） */
  sigil: string
  /** 宝石轮廓（默认六边形切面） */
  shape?: string
}

const HEX_GEM = 'M128 20 L216 74 L216 182 L128 236 L40 182 L40 74 Z'

/**
 * 族系 B：宝石切面
 * 结构：外发光 → 切面主体 → 顶部台面 → 明暗切面 → 棱线 → 高光条 → 金质包边 → 元素印记
 */
export function gem({ uid, accent, sigil, shape = HEX_GEM }: GemOptions): string {
  return (
    `<defs>` +
    accentDefs(uid, accent) +
    goldDefs(uid) +
    `<linearGradient id="${uid}-body" x1="0.15" y1="0" x2="0.85" y2="1">` +
    `<stop offset="0%" stop-color="${accent.light}"/>` +
    `<stop offset="34%" stop-color="${accent.base}"/>` +
    `<stop offset="100%" stop-color="${accent.deep}"/>` +
    `</linearGradient>` +
    `<linearGradient id="${uid}-sigLight" x1="0.2" y1="0" x2="0.8" y2="1">` +
    `<stop offset="0%" stop-color="#ffffff"/>` +
    `<stop offset="58%" stop-color="${accent.light}"/>` +
    `<stop offset="100%" stop-color="${accent.base}"/>` +
    `</linearGradient>` +
    `<linearGradient id="${uid}-table" x1="0" y1="0" x2="0.3" y2="1">` +
    `<stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>` +
    `<stop offset="100%" stop-color="#ffffff" stop-opacity="0.06"/>` +
    `</linearGradient>` +
    `<linearGradient id="${uid}-shine" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>` +
    `<stop offset="45%" stop-color="#ffffff" stop-opacity="0.7"/>` +
    `<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>` +
    `</linearGradient>` +
    `</defs>` +
    halo(uid, 128, 128, 112, accent.glow, 0.42) +
    // 宝石主体
    `<path d="${shape}" fill="url(#${uid}-body)"/>` +
    // 顶部台面（左上受光）
    `<path d="M128 20 L216 74 L128 104 L40 74 Z" fill="url(#${uid}-table)"/>` +
    // 左右切面（拉开明暗）
    `<path d="M40 74 L128 104 L128 236 Z" fill="#ffffff" opacity="0.10"/>` +
    `<path d="M216 74 L128 104 L128 236 Z" fill="#000000" opacity="0.22"/>` +
    // 切面棱线
    `<g stroke="#ffffff" stroke-opacity="0.30" stroke-width="2" fill="none">` +
    `<path d="M128 104 L128 236 M40 74 L128 104 L216 74"/>` +
    `</g>` +
    // 高光条（左上 45°）
    `<path d="M86 62 L112 46 L150 130 L124 146 Z" fill="url(#${uid}-shine)" opacity="0.55"/>` +
    // 金质包边
    `<path d="${shape}" fill="none" stroke="url(#${uid}-gold)" stroke-width="6" stroke-linejoin="round"/>` +
    `<path d="${shape}" fill="none" stroke="${C.goldLight}" stroke-width="1.6" stroke-linejoin="round" opacity="0.5"/>` +
    halo(uid, 128, 126, 60, accent.light, 0.28) +
    sigil
  )
}

// ------------------------------------------------------------------
// 族系 C：状态圆徽
// ------------------------------------------------------------------

export function badge(uid: string, accent: Accent, symbol: string): string {
  return (
    `<defs>` +
    accentDefs(uid, accent) +
    goldDefs(uid) +
    `<radialGradient id="${uid}-plate" cx="42%" cy="28%" r="80%">` +
    `<stop offset="0%" stop-color="#33205c"/>` +
    `<stop offset="100%" stop-color="#0a0514"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<circle cx="128" cy="128" r="114" fill="url(#${uid}-plate)"/>` +
    `<circle cx="128" cy="128" r="114" fill="none" stroke="url(#${uid}-acc)" stroke-width="11"/>` +
    `<circle cx="128" cy="128" r="114" fill="none" stroke="#08040f" stroke-width="2.5"/>` +
    `<circle cx="128" cy="128" r="106" fill="none" stroke="${accent.light}" stroke-width="1.8" opacity="0.35"/>` +
    halo(uid, 128, 128, 92, accent.glow, 0.45) +
    symbol
  )
}

// ------------------------------------------------------------------
// 族系 D：UI 符号
// ------------------------------------------------------------------

/**
 * 族系 D：UI 符号
 * 符号需为"无 paint 属性"的几何形状（不写 fill/stroke），
 * 由本函数统一绘制两层：深色描边层（保证任意背景可读）+ 金质填充层
 */
export function glyph(uid: string, accent: Accent, symbol: string): string {
  return (
    `<defs>` +
    goldDefs(uid) +
    accentDefs(uid, accent) +
    `<radialGradient id="${uid}-backing" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="#000000" stop-opacity="0.34"/>` +
    `<stop offset="72%" stop-color="#000000" stop-opacity="0.14"/>` +
    `<stop offset="100%" stop-color="#000000" stop-opacity="0"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<circle cx="128" cy="128" r="116" fill="url(#${uid}-backing)"/>` +
    halo(uid, 128, 130, 88, accent.glow, 0.42) +
    `<g fill="#120a20" stroke="#120a20" stroke-width="14" stroke-linejoin="round" stroke-linecap="round" opacity="0.92">${symbol}</g>` +
    `<g fill="url(#${uid}-gold)" stroke="url(#${uid}-gold)" stroke-width="7.5" stroke-linejoin="round" stroke-linecap="round">${symbol}</g>`
  )
}

/**
 * 族系 E：覆盖标记（叠加在宝石之上的技能石/冻结标记）
 * 无底盘、无边距浪费：深色描边 + 强调色填充，保证在任意彩色宝石上可读
 */
export function mark(uid: string, accent: Accent, symbol: string): string {
  return (
    `<defs>` +
    accentDefs(uid, accent) +
    goldDefs(uid) +
    `<linearGradient id="${uid}-mk" x1="0.15" y1="0" x2="0.85" y2="1">` +
    `<stop offset="0%" stop-color="#ffffff"/>` +
    `<stop offset="42%" stop-color="${accent.light}"/>` +
    `<stop offset="100%" stop-color="${accent.base}"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<g fill="#2a1008" stroke="#2a1008" stroke-opacity="0.75" stroke-width="26" stroke-linejoin="round" stroke-linecap="round">${symbol}</g>` +
    `<g fill="url(#${uid}-mk)" stroke="url(#${uid}-mk)" stroke-width="9" stroke-linejoin="round" stroke-linecap="round">${symbol}</g>`
  )
}

/** 宝石内元素印记：暗色描边层 + 高亮填充层（保证在饱和宝石体上的可读性） */
export function gemSigil(uid: string, symbol: string): string {
  return (
    `<g stroke="#2a1008" stroke-opacity="0.6" stroke-width="12" stroke-linejoin="round" stroke-linecap="round">${symbol}</g>` +
    `<g>${symbol}</g>`
  )
}

/**
 * 解析符号库中的占位渐变引用：
 * `#ACC` → 本图标的强调色渐变，`#GOLD` → 金质渐变
 * （图标文档按 icon id 命名空间隔离，避免多图合成时 id 冲突）
 * @param accSuffix 强调色渐变后缀，宝石印记传 `sigLight` 以使用高亮渐变
 */
export function resolvePlaceholders(svg: string, uid: string, accSuffix = 'acc'): string {
  return svg.replace(/#ACC/g, `#${uid}-${accSuffix}`).replace(/#GOLD/g, `#${uid}-gold`)
}

// ------------------------------------------------------------------
// 通用符号库（供徽章/宝石族系复用，坐标以 128,128 为中心）
// 符号内使用 `url(#ACC)` / `url(#GOLD)` 占位，由 resolvePlaceholders 解析
// ------------------------------------------------------------------

export const SYM = {
  /** 火焰 */
  flame: (cx = 128, cy = 124, s = 1) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})">` +
    `<path d="M0 -46C14 -28 30 -18 30 2C30 22 16 36 0 36C-16 36 -30 22 -30 2C-30 -12 -20 -20 -12 -32C-8 -38 -4 -42 0 -46Z" fill="url(#ACC)"/>` +
    `<path d="M0 -14C7 -4 15 2 15 12C15 22 8 29 0 29C-8 29 -15 22 -15 12C-15 4 -8 -2 0 -14Z" fill="#fff6d8" opacity="0.85"/>` +
    `</g>`,
  /** 水滴 */
  drop: (cx = 128, cy = 126, s = 1) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})">` +
    `<path d="M0 -48C16 -24 32 -6 32 12C32 30 18 44 0 44C-18 44 -32 30 -32 12C-32 -6 -16 -24 0 -48Z" fill="url(#ACC)"/>` +
    `<ellipse cx="-9" cy="8" rx="8" ry="13" fill="#ffffff" opacity="0.45" transform="rotate(-18 -9 8)"/>` +
    `</g>`,
  /** 叶片 */
  leaf: (cx = 128, cy = 128, s = 1) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})">` +
    `<path d="M-34 30C-34 -6 -6 -34 34 -34C34 4 6 30 -34 30Z" fill="url(#ACC)"/>` +
    `<path d="M-30 26C-8 4 8 -8 28 -28" stroke="#eaffef" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>` +
    `<path d="M-14 8L2 -2 M-4 20L12 8 M-24 -4L-10 -14" stroke="#eaffef" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.6"/>` +
    `</g>`,
  /** 太阳（光芒） */
  sun: (cx = 128, cy = 128, s = 1) => {
    let rays = '<g stroke="url(#ACC)" stroke-width="7" stroke-linecap="round">'
    for (let i = 0; i < 8; i++) {
      const long = i % 2 === 0
      rays += `<line x1="0" y1="${long ? -58 : -50}" x2="0" y2="${long ? -34 : -38}" transform="rotate(${i * 45})"/>`
    }
    rays += '</g>'
    return `<g transform="translate(${cx} ${cy}) scale(${s})">${rays}<circle cx="0" cy="0" r="26" fill="url(#ACC)"/><circle cx="-7" cy="-7" r="9" fill="#fffdf0" opacity="0.6"/></g>`
  },
  /** 新月 + 星 */
  moon: (cx = 128, cy = 128, s = 1) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})">` +
    `<path d="M14 -44C-12 -38 -30 -16 -30 8C-30 32 -12 52 14 58C-4 44 -14 26 -14 6C-14 -14 -4 -32 14 -44Z" fill="url(#ACC)"/>` +
    `<path d="M22 -22L27 -12L37 -7L27 -2L22 8L17 -2L7 -7L17 -12Z" fill="#f6ecff"/>` +
    `</g>`,
  /** 闪电 */
  bolt: (cx = 128, cy = 126, s = 1) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})">` +
    `<path d="M14 -50L-26 6L-2 6L-14 50L26 -8L2 -8Z" fill="url(#ACC)"/>` +
    `<path d="M8 -34L-12 0L2 0" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.6" stroke-linecap="round"/>` +
    `</g>`,
  /** 雪花 */
  snow: (cx = 128, cy = 128, s = 1) => {
    let arms = '<g stroke="url(#ACC)" stroke-width="7" stroke-linecap="round" fill="none">'
    for (let i = 0; i < 6; i++) {
      arms +=
        `<g transform="rotate(${i * 60})">` +
        `<line x1="0" y1="6" x2="0" y2="-52"/>` +
        `<path d="M0 -30L-14 -42 M0 -30L14 -42 M0 -48L-10 -56 M0 -48L10 -56"/>` +
        `</g>`
    }
    arms += '</g>'
    return `<g transform="translate(${cx} ${cy}) scale(${s})">${arms}<circle cx="0" cy="0" r="9" fill="#eaffff" opacity="0.9"/></g>`
  },
  /** 剑（竖直，含护手） */
  sword: (cx = 128, cy = 126, s = 1) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})">` +
    `<path d="M0 -54L10 -38L10 16L-10 16L-10 -38Z" fill="url(#GOLD)"/>` +
    `<path d="M0 -54L10 -38L0 -30Z" fill="#ffffff" opacity="0.5"/>` +
    `<rect x="-26" y="16" width="52" height="9" rx="4" fill="url(#GOLD)"/>` +
    `<rect x="-6" y="25" width="12" height="24" rx="4" fill="#5a3f12"/>` +
    `<circle cx="0" cy="53" r="8" fill="url(#GOLD)"/>` +
    `</g>`,
  /** 盾牌 */
  shield: (cx = 128, cy = 128, s = 1) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})">` +
    `<path d="M0 -50C16 -50 34 -44 42 -38C42 -4 34 32 0 50C-34 32 -42 -4 -42 -38C-34 -44 -16 -50 0 -50Z" fill="url(#ACC)"/>` +
    `<path d="M0 -50C16 -50 34 -44 42 -38C42 -4 34 32 0 50C-34 32 -42 -4 -42 -38C-34 -44 -16 -50 0 -50Z" fill="none" stroke="url(#GOLD)" stroke-width="6"/>` +
    `<path d="M0 -30V30" stroke="#ffffff" stroke-width="4" opacity="0.45"/>` +
    `</g>`,
  /** 骷髅 */
  skull: (cx = 128, cy = 126, s = 1) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})">` +
    `<path d="M0 -46C26 -46 42 -28 42 -6C42 8 36 16 30 22L30 36C30 42 24 46 18 46L-18 46C-24 46 -30 42 -30 36L-30 22C-36 16 -42 8 -42 -6C-42 -28 -26 -46 0 -46Z" fill="#e8e2d2"/>` +
    `<ellipse cx="-17" cy="-8" rx="12" ry="14" fill="#160d22"/>` +
    `<ellipse cx="17" cy="-8" rx="12" ry="14" fill="#160d22"/>` +
    `<path d="M0 6L7 18L-7 18Z" fill="#160d22"/>` +
    `<g fill="#160d22"><rect x="-14" y="26" width="6" height="16" rx="2"/><rect x="-2" y="26" width="6" height="16" rx="2"/><rect x="10" y="26" width="6" height="16" rx="2"/></g>` +
    `</g>`,
  /** 锁 */
  lock: (cx = 128, cy = 130, s = 1) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})">` +
    `<path d="M-28 -8V-22C-28 -40 -14 -52 0 -52C14 -52 28 -40 28 -22V-8" fill="none" stroke="url(#GOLD)" stroke-width="11" stroke-linecap="round"/>` +
    `<rect x="-40" y="-10" width="80" height="60" rx="12" fill="url(#GOLD)"/>` +
    `<circle cx="0" cy="16" r="9" fill="#2a1c04"/>` +
    `<path d="M0 20V34" stroke="#2a1c04" stroke-width="7" stroke-linecap="round"/>` +
    `</g>`,
  /** 对勾 */
  check: (cx = 128, cy = 128, s = 1) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})"><path d="M-40 4L-12 32L42 -30" fill="none" stroke="url(#GOLD)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></g>`,
  /** 5 角星 */
  star5: (cx = 128, cy = 124, s = 1) => {
    const pts: string[] = []
    for (let i = 0; i < 10; i++) {
      const ang = (Math.PI / 5) * i - Math.PI / 2
      const rad = i % 2 === 0 ? 46 : 19
      pts.push(`${(Math.cos(ang) * rad).toFixed(1)} ${(Math.sin(ang) * rad).toFixed(1)}`)
    }
    return `<g transform="translate(${cx} ${cy}) scale(${s})"><path d="M${pts.join('L')}Z" fill="url(#GOLD)"/><path d="M0 -46L13 -14L0 -8Z" fill="#fffdf2" opacity="0.55"/></g>`
  }
} as const