/**
 * 图标目录 · 英雄 / 技能 / 敌人
 * 族系：medallion（圆形符文徽章）；生物与器物均以 x=128 轴对称，保证纹章感
 */
import {
  ACCENT,
  C,
  ELEMENT_ACCENT,
  SYM,
  frame,
  halo,
  medallion,
  mirrorX,
  resolvePlaceholders,
  spark,
  type Accent,
  type IconDef
} from '../theme'

/** 主体缩放包装：将主体压入徽章内圈（避免与符文圈冲突） */
function sub(body: string, scale = 0.9): string {
  return `<g transform="translate(128 128) scale(${scale}) translate(-128 -128)">${body}</g>`
}

/** 组装一枚徽章图标 */
function badgeIcon(id: string, accent: Accent, subject: string, scale = 0.9, underlay = ''): string {
  const body = resolvePlaceholders(sub(subject, scale) + underlay, id)
  return frame(medallion({ uid: id, accent, subject: body }))
}

// ==================================================================
// 英雄（3）
// ==================================================================

/** 炎龙骑士：骑士巨盔（火焰羽饰 + 目缝火光 + 护鼻 + 呼吸孔） */
const FLAME_KNIGHT = `
  ${SYM.flame(128, 62, 0.8)}
  <path d="M128 96 C170 96 192 124 192 158 L192 206 C192 214 186 220 178 220 L78 220 C70 220 64 214 64 206 L64 158 C64 124 86 96 128 96 Z" fill="url(#GOLD)"/>
  <path d="M128 104 C164 104 184 128 184 158 L184 210 L72 210 L72 158 C72 128 92 104 128 104 Z" fill="url(#ACC)"/>
  <path d="M116 106 C118 84 138 84 140 106 L140 118 L116 118 Z" fill="url(#GOLD)"/>
  <g transform="translate(128 128)">
    <path d="M-58 8 L58 8 L58 24 L-58 24 Z" fill="#140a1e"/>
    <path d="M-48 14 L48 14 L48 21 L-48 21 Z" fill="#ff8a5c"/>
    <path d="M-48 15 L48 15 L48 18 L-48 18 Z" fill="#ffe6cf" opacity="0.85"/>
  </g>
  <path d="M119 122 L137 122 L137 216 L119 216 Z" fill="url(#GOLD)"/>
  <g fill="#140a1e" opacity="0.85">
    <circle cx="100" cy="172" r="6"/><circle cx="156" cy="172" r="6"/>
    <circle cx="100" cy="192" r="6"/><circle cx="156" cy="192" r="6"/>
    <circle cx="100" cy="212" r="6"/><circle cx="156" cy="212" r="6"/>
    <circle cx="128" cy="200" r="5"/>
  </g>
  <path d="M128 96 C170 96 192 124 192 158" fill="none" stroke="${C.goldLight}" stroke-width="4" opacity="0.55"/>
  ${spark(196, 106, 11, '#ffc59b', 0.7)}
  ${spark(60, 116, 9, '#ffc59b', 0.55)}
`

/** 冰霜女巫：兜帽 + 雪花 */
const FROST_WITCH = `
  ${SYM.snow(58, 76, 0.42).replace(/scale\(0\.42\)/, 'scale(0.42)')}
  ${SYM.snow(200, 92, 0.34)}
  <path d="M128 52 C176 52 200 96 200 152 L200 206 L56 206 L56 152 C56 96 80 52 128 52 Z" fill="url(#ACC)"/>
  <path d="M128 74 C158 74 176 106 176 146 L176 190 L80 190 L80 146 C80 106 98 74 128 74 Z" fill="#150a24"/>
  <path d="M128 92 C146 92 158 112 158 136 C158 156 146 170 128 170 C110 170 98 156 98 136 C98 112 110 92 128 92 Z" fill="#2b1a44" opacity="0.9"/>
  <g fill="#d8f4ff">
    <ellipse cx="114" cy="130" rx="8" ry="10"/>
    <ellipse cx="142" cy="130" rx="8" ry="10"/>
  </g>
  <path d="M104 152 C114 160 142 160 152 152" fill="none" stroke="#8ee6ff" stroke-width="3.5" stroke-linecap="round" opacity="0.7"/>
  <path d="M128 52 C176 52 200 96 200 152 L200 206" fill="none" stroke="url(#GOLD)" stroke-width="7" opacity="0.95"/>
  <path d="M128 52 C80 52 56 96 56 152 L56 206" fill="none" stroke="url(#GOLD)" stroke-width="7" opacity="0.95"/>
  <path d="M128 176 L142 196 L128 216 L114 196 Z" fill="url(#GOLD)"/>
  <circle cx="128" cy="196" r="6" fill="#bff2fb"/>
`

/** 森林德鲁伊：树灵 + 枝叶冠冕 */
const FOREST_DRUID = `
  ${mirrorX(`<path d="M96 96 C74 78 62 50 68 26 C86 40 104 58 112 78 Z" fill="#2f6b34"/>`)}
  <circle cx="128" cy="78" r="44" fill="url(#ACC)"/>
  <circle cx="88" cy="98" r="30" fill="url(#ACC)"/>
  <circle cx="168" cy="98" r="30" fill="url(#ACC)"/>
  <circle cx="128" cy="78" r="44" fill="none" stroke="#c6f8cf" stroke-width="2.5" opacity="0.35"/>
  <path d="M128 108 C156 108 174 128 174 158 L174 194 C174 204 166 212 156 212 L100 212 C90 212 82 204 82 194 L82 158 C82 128 100 108 128 108 Z" fill="#6b4a24"/>
  <path d="M128 108 C156 108 174 128 174 158 L174 194 C174 204 166 212 156 212 L100 212 C90 212 82 204 82 194 L82 158 C82 128 100 108 128 108 Z" fill="none" stroke="url(#GOLD)" stroke-width="5" opacity="0.8"/>
  <g stroke="#3d2a12" stroke-width="3" opacity="0.55" fill="none">
    <path d="M110 120 L106 206"/><path d="M146 120 L150 206"/><path d="M128 116 L128 208"/>
  </g>
  <g fill="#8bf0bb">
    <ellipse cx="112" cy="152" rx="9" ry="11"/>
    <ellipse cx="144" cy="152" rx="9" ry="11"/>
  </g>
  <path d="M116 180 C124 188 132 188 140 180" fill="none" stroke="#3d2a12" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
  ${SYM.leaf(56, 158, 0.72)}
  ${SYM.leaf(200, 158, 0.72)}
`

// ==================================================================
// 技能（6）
// ==================================================================

/** 火焰斩：焰色剑气 + 斜挥长剑（一眼可读的斩击） */
const FLAME_SLASH = `
  <path d="M44 208 C74 124 128 70 212 46 C186 116 132 172 44 208 Z" fill="url(#ACC)" opacity="0.92"/>
  <path d="M52 200 C80 126 130 78 202 56 C180 120 132 168 52 200 Z" fill="#ffffff" opacity="0.2"/>
  <path d="M32 216 C62 130 118 72 206 40" fill="none" stroke="url(#ACC)" stroke-width="7" stroke-linecap="round" opacity="0.5"/>
  <g transform="rotate(42 128 128)">${SYM.sword(128, 128, 0.92)}</g>
  ${spark(178, 90, 14, '#ffc59b', 0.85)}
  ${spark(92, 178, 11, '#ffc59b', 0.6)}
`

/** 流星火雨：主陨石（宽焰拖尾）+ 两颗余陨 */
const METEOR_RAIN = `
  <path d="M168 96 C128 124 94 148 46 170 C88 174 130 150 168 130 Z" fill="url(#ACC)"/>
  <path d="M162 106 C130 130 102 148 66 164 C100 164 134 144 162 126 Z" fill="#ffe6cf" opacity="0.5"/>
  <path d="M118 152 C104 162 92 170 78 176 C92 172 106 164 118 156 Z" fill="url(#ACC)" opacity="0.8"/>
  <path d="M196 142 C186 154 176 164 164 172 C178 168 190 160 200 150 Z" fill="url(#ACC)" opacity="0.7"/>
  <circle cx="168" cy="110" r="38" fill="#3b2b22"/>
  <circle cx="168" cy="110" r="38" fill="none" stroke="url(#ACC)" stroke-width="10"/>
  <path d="M152 86 C162 78 178 78 186 88" fill="none" stroke="#ffd9a8" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
  <g fill="#241a14" opacity="0.9">
    <circle cx="158" cy="98" r="8"/><circle cx="180" cy="122" r="6.5"/><circle cx="160" cy="130" r="4.5"/>
  </g>
  <path d="M104 186 C88 194 72 200 54 204 C74 200 92 192 108 184 Z" fill="url(#ACC)" opacity="0.65"/>
  <circle cx="106" cy="180" r="15" fill="#3b2b22"/>
  <circle cx="106" cy="180" r="15" fill="none" stroke="url(#ACC)" stroke-width="7"/>
  <circle cx="214" cy="52" r="11" fill="#3b2b22"/>
  <circle cx="214" cy="52" r="11" fill="none" stroke="url(#ACC)" stroke-width="6"/>
  ${spark(90, 108, 13, '#ffc59b', 0.8)}
  ${spark(44, 90, 10, '#ffc59b', 0.55)}
`

/** 冰锥：三枚寒冰尖刺 */
const ICE_SHARD = `
  <path d="M128 34 L162 122 L128 214 L94 122 Z" fill="url(#ACC)"/>
  <path d="M128 34 L128 214 L94 122 Z" fill="#ffffff" opacity="0.28"/>
  <path d="M128 34 L162 122 L128 214" fill="none" stroke="#eafaff" stroke-width="2.5" opacity="0.6"/>
  <path d="M78 92 L98 138 L78 190 L58 138 Z" fill="url(#ACC)" opacity="0.92"/>
  <path d="M178 92 L198 138 L178 190 L158 138 Z" fill="url(#ACC)" opacity="0.92"/>
  <path d="M78 92 L78 190 L58 138 Z" fill="#ffffff" opacity="0.25"/>
  <path d="M178 92 L178 190 L158 138 Z" fill="#ffffff" opacity="0.25"/>
  ${spark(128, 96, 16, '#ffffff', 0.7)}
  ${spark(62, 74, 11, '#d8f4ff', 0.6)}
  ${spark(196, 70, 9, '#d8f4ff', 0.5)}
`

/** 绝对零度：六角冰晶 + 雪花 */
const ABSOLUTE_ZERO = `
  <path d="M128 36 L208 82 L208 174 L128 220 L48 174 L48 82 Z" fill="url(#ACC)" opacity="0.22"/>
  <path d="M128 36 L208 82 L208 174 L128 220 L48 174 L48 82 Z" fill="none" stroke="url(#ACC)" stroke-width="7" stroke-linejoin="round"/>
  ${SYM.snow(128, 128, 1.12)}
  <circle cx="128" cy="128" r="14" fill="#ffffff" opacity="0.9"/>
  ${spark(60, 60, 12, '#d8f4ff', 0.7)}
  ${spark(198, 196, 12, '#d8f4ff', 0.6)}
`

/** 自然之触：新芽 + 生命符文 + 治愈十字 */
const NATURES_TOUCH = `
  <path d="M128 214 C126 176 126 150 128 122" fill="none" stroke="#2f6b34" stroke-width="10" stroke-linecap="round"/>
  ${SYM.leaf(96, 140, 0.95)}
  ${SYM.leaf(160, 140, 0.95)}
  <circle cx="128" cy="106" r="30" fill="url(#ACC)"/>
  <circle cx="128" cy="106" r="30" fill="none" stroke="#c6f8cf" stroke-width="3" opacity="0.6"/>
  <path d="M118 106 L138 106 M128 96 L128 116" stroke="#ffffff" stroke-width="9" stroke-linecap="round"/>
  <path d="M92 190 C112 206 144 206 164 190" fill="none" stroke="url(#ACC)" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
  ${spark(80, 92, 12, '#c6f8cf', 0.8)}
  ${spark(184, 100, 10, '#c6f8cf', 0.6)}
`

/** 生命之树：发光树冠 + 根系 */
const TREE_OF_LIFE = `
  ${mirrorX(`<path d="M124 206 C112 200 92 198 74 200 C90 190 110 188 124 192 Z" fill="#6b4a24"/>`)}
  <path d="M118 208 L118 130 L138 130 L138 208 Z" fill="#6b4a24"/>
  <path d="M118 208 L118 130 L138 130 L138 208 Z" fill="none" stroke="url(#GOLD)" stroke-width="3" opacity="0.6"/>
  <path d="M118 156 C104 146 92 140 78 138" fill="none" stroke="#6b4a24" stroke-width="9" stroke-linecap="round"/>
  <path d="M138 156 C152 146 164 140 178 138" fill="none" stroke="#6b4a24" stroke-width="9" stroke-linecap="round"/>
  <circle cx="128" cy="96" r="52" fill="url(#ACC)"/>
  <circle cx="88" cy="118" r="30" fill="url(#ACC)"/>
  <circle cx="168" cy="118" r="30" fill="url(#ACC)"/>
  <circle cx="128" cy="96" r="52" fill="none" stroke="#c6f8cf" stroke-width="2.5" opacity="0.4"/>
  <g fill="#ffffff" opacity="0.85">
    <circle cx="110" cy="80" r="7"/><circle cx="150" cy="98" r="6"/><circle cx="120" cy="118" r="5.5"/><circle cx="164" cy="122" r="5"/>
  </g>
  ${spark(70, 74, 13, '#c6f8cf', 0.75)}
  ${spark(190, 78, 10, '#c6f8cf', 0.6)}
`

// ==================================================================
// 敌人（5）
// ==================================================================

interface DragonHeadOptions {
  /** 角长 */
  horn: number
  /** 眼睛发光强度 */
  glow: string
  /** 侧鬃尖刺数量 */
  spikes: number
  /** 头骨锐利度（0=圆钝幼体，1=棱角成年体） */
  fierce: number
}

/** 对称龙首（正面纹章式；幼龙/巨龙/徽记共用构造，靠参数区分） */
export function dragonHead({ horn, glow, spikes, fierce }: DragonHeadOptions): string {
  const jawY = 208 - fierce * 6
  const horns = mirrorX(
    `<path d="M74 78 C${74 - horn * 0.5} ${78 - horn * 0.62} ${62 - horn * 0.72} ${40 - horn * 0.5} ${68 - horn * 0.3} ${18 - horn * 0.34}
      C${94 - horn * 0.2} ${34 - horn * 0.2} ${106} ${52} ${112} 70 Z" fill="url(#GOLD)"/>` +
      `<path d="M86 74 C${82 - horn * 0.36} ${70 - horn * 0.4} ${74 - horn * 0.5} ${44 - horn * 0.3} ${78 - horn * 0.2} ${28 - horn * 0.22}
      C96 42 104 56 108 68 Z" fill="#2a1c04" opacity="0.35"/>`
  )
  const mane = mirrorX(
    Array.from({ length: spikes }, (_, i) => {
      const y = 96 + i * 30
      const len = 30 - i * 3 + fierce * 8
      return `<path d="M62 ${y} C${62 - len * 0.7} ${y + 8} ${62 - len * 0.8} ${y + 26} ${66} ${y + 34} C70 ${y + 24} 70 ${y + 12} 62 ${y}Z" fill="url(#ACC)"/>`
    }).join('')
  )
  return `
    ${mane}
    <path d="M128 58 C170 58 198 84 200 120 C201 142 194 158 180 168 L${186 + fierce * 4} ${jawY - 18}
      C${188 + fierce * 4} ${jawY - 6} 182 ${jawY} 172 ${jawY} L84 ${jawY}
      C74 ${jawY} 68 ${jawY - 6} 70 ${jawY - 18} L${76 - fierce * 4} ${168}
      C62 158 55 142 56 120 C58 84 86 58 128 58 Z" fill="url(#ACC)"/>
    <path d="M128 58 C170 58 198 84 200 120 C201 142 194 158 180 168 L186 ${jawY - 18}
      C188 ${jawY - 6} 182 ${jawY} 172 ${jawY} L84 ${jawY} C74 ${jawY} 68 ${jawY - 6} 70 ${jawY - 18}
      L76 168 C62 158 55 142 56 120 C58 84 86 58 128 58 Z" fill="none" stroke="url(#GOLD)" stroke-width="5"/>
    ${horns}
    <path d="M128 58 C150 58 170 68 182 84 L74 84 C86 68 106 58 128 58 Z" fill="#ffffff" opacity="0.16"/>
    ${mirrorX(
      `<path d="M84 118 L124 104 L128 126 L88 138 Z" fill="#160d22"/>` +
        `<path d="M92 120 L118 112 L120 124 L96 131 Z" fill="${glow}"/>`
    )}
    <path d="M104 150 C112 144 144 144 152 150 C144 158 112 158 104 150 Z" fill="#2a1c04" opacity="0.5"/>
    ${mirrorX(`<ellipse cx="106" cy="186" rx="9" ry="7" fill="#160d22"/>`)}
    ${mirrorX(`<path d="M96 ${jawY - 10} L108 ${jawY - 10} L102 ${jawY + 12} Z" fill="#f5f0e6"/>`)}
    ${mirrorX(`<path d="M134 ${jawY - 10} L146 ${jawY - 10} L140 ${jawY + 10} Z" fill="#f5f0e6" opacity="0.9"/>`)}
    <path d="M118 84 C122 78 134 78 138 84" fill="none" stroke="#2a1c04" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
  `
}

/** 史莱姆：黏液团 */
const SLIME = `
  <path d="M128 62 C178 62 210 114 210 166 C210 190 192 204 168 204 L88 204 C64 204 46 190 46 166 C46 114 78 62 128 62 Z" fill="url(#ACC)"/>
  <path d="M128 62 C178 62 210 114 210 166 C210 190 192 204 168 204 L88 204 C64 204 46 190 46 166 C46 114 78 62 128 62 Z" fill="none" stroke="#c6f8cf" stroke-width="4" opacity="0.45"/>
  <ellipse cx="96" cy="106" rx="34" ry="22" fill="#ffffff" opacity="0.35" transform="rotate(-24 96 106)"/>
  <g fill="#160d22">
    <ellipse cx="104" cy="146" rx="13" ry="16"/><ellipse cx="152" cy="146" rx="13" ry="16"/>
  </g>
  <g fill="#ffffff" opacity="0.9">
    <circle cx="100" cy="140" r="4.5"/><circle cx="148" cy="140" r="4.5"/>
  </g>
  <path d="M116 176 C124 186 132 186 140 176" fill="none" stroke="#160d22" stroke-width="5" stroke-linecap="round"/>
  <g fill="url(#ACC)" opacity="0.85">
    <circle cx="76" cy="192" r="10"/><circle cx="188" cy="196" r="8"/><circle cx="158" cy="200" r="6"/>
  </g>
  ${spark(196, 84, 12, '#c6f8cf', 0.7)}
  ${spark(60, 92, 9, '#c6f8cf', 0.55)}
`

/** 火蜥蜴：带火冠的蜥蜴首 */
const FIRE_LIZARD = `
  ${mirrorX(`<path d="M70 108 C56 88 52 62 60 40 C74 58 86 76 92 96 Z" fill="url(#ACC)"/>`)}
  <path d="M128 74 C170 74 194 102 194 138 C194 172 170 204 128 204 C86 204 62 172 62 138 C62 102 86 74 128 74 Z" fill="url(#ACC)"/>
  <path d="M128 74 C170 74 194 102 194 138 C194 172 170 204 128 204 C86 204 62 172 62 138 C62 102 86 74 128 74 Z" fill="none" stroke="url(#GOLD)" stroke-width="5"/>
  <path d="M128 84 C162 84 184 106 186 134 L70 134 C72 106 94 84 128 84 Z" fill="#ffffff" opacity="0.16"/>
  ${mirrorX(
    `<ellipse cx="102" cy="128" rx="17" ry="14" fill="#ffe9a8"/>` +
      `<ellipse cx="102" cy="128" rx="5" ry="13" fill="#160d22"/>`
  )}
  <path d="M100 162 C112 154 144 154 156 162 C144 172 112 172 100 162 Z" fill="#160d22" opacity="0.6"/>
  ${mirrorX(`<path d="M92 178 L110 178 L100 200 Z" fill="#f5f0e6"/>`)}
  <g fill="#ffd9a8" opacity="0.8">
    <circle cx="84" cy="152" r="4"/><circle cx="172" cy="152" r="4"/><circle cx="128" cy="188" r="3.5"/>
  </g>
  ${spark(196, 78, 12, '#ffc59b', 0.75)}
`

/** 冰霜幽灵：飘浮亡灵 */
const FROST_GHOST = `
  <path d="M128 54 C178 54 204 92 204 134 L204 176 C204 176 190 192 174 176 C158 160 146 190 128 190
    C110 190 98 160 82 176 C66 192 52 176 52 176 L52 134 C52 92 78 54 128 54 Z" fill="url(#ACC)"/>
  <path d="M128 54 C178 54 204 92 204 134 L204 176 C204 176 190 192 174 176 C158 160 146 190 128 190
    C110 190 98 160 82 176 C66 192 52 176 52 176 L52 134 C52 92 78 54 128 54 Z" fill="none" stroke="#d8f4ff" stroke-width="4" opacity="0.55"/>
  <path d="M128 62 C170 62 194 94 196 130 L60 130 C62 94 86 62 128 62 Z" fill="#ffffff" opacity="0.2"/>
  <g fill="#0d2436">
    <ellipse cx="102" cy="128" rx="16" ry="20"/><ellipse cx="154" cy="128" rx="16" ry="20"/>
  </g>
  <g fill="#d8f4ff">
    <ellipse cx="102" cy="128" rx="7" ry="10"/><ellipse cx="154" cy="128" rx="7" ry="10"/>
  </g>
  <path d="M112 166 C120 176 136 176 144 166 C140 180 116 180 112 166 Z" fill="#0d2436" opacity="0.85"/>
  ${SYM.snow(216, 92, 0.3)}
  ${SYM.snow(40, 108, 0.26)}
  ${spark(190, 168, 11, '#d8f4ff', 0.6)}
`

// ==================================================================
// 导出
// ==================================================================

export const HERO_ICONS: IconDef[] = [
  {
    id: 'hero_flame_knight',
    name: '炎龙骑士',
    group: 'hero',
    usage: '主战英雄头像 · 火元素',
    svg: badgeIcon('hero_flame_knight', ELEMENT_ACCENT.fire, FLAME_KNIGHT, 0.92)
  },
  {
    id: 'hero_frost_witch',
    name: '冰霜女巫',
    group: 'hero',
    usage: '英雄头像 · 水元素',
    svg: badgeIcon('hero_frost_witch', ELEMENT_ACCENT.water, FROST_WITCH, 0.92)
  },
  {
    id: 'hero_forest_druid',
    name: '森林德鲁伊',
    group: 'hero',
    usage: '英雄头像 · 木元素',
    svg: badgeIcon('hero_forest_druid', ELEMENT_ACCENT.wood, FOREST_DRUID, 0.92)
  }
]

export const SKILL_ICONS: IconDef[] = [
  {
    id: 'skill_flame_slash',
    name: '火焰斩',
    group: 'skill',
    usage: '炎龙骑士四消技能',
    svg: badgeIcon('skill_flame_slash', ELEMENT_ACCENT.fire, FLAME_SLASH, 0.9)
  },
  {
    id: 'skill_meteor_rain',
    name: '流星火雨',
    group: 'skill',
    usage: '炎龙骑士五消技能',
    svg: badgeIcon('skill_meteor_rain', ELEMENT_ACCENT.fire, METEOR_RAIN, 0.9)
  },
  {
    id: 'skill_ice_shard',
    name: '冰锥',
    group: 'skill',
    usage: '冰霜女巫四消技能',
    svg: badgeIcon('skill_ice_shard', ELEMENT_ACCENT.water, ICE_SHARD, 0.9)
  },
  {
    id: 'skill_absolute_zero',
    name: '绝对零度',
    group: 'skill',
    usage: '冰霜女巫五消技能',
    svg: badgeIcon('skill_absolute_zero', ACCENT.frost, ABSOLUTE_ZERO, 0.9)
  },
  {
    id: 'skill_natures_touch',
    name: '自然之触',
    group: 'skill',
    usage: '森林德鲁伊四消技能',
    svg: badgeIcon('skill_natures_touch', ELEMENT_ACCENT.wood, NATURES_TOUCH, 0.9)
  },
  {
    id: 'skill_tree_of_life',
    name: '生命之树',
    group: 'skill',
    usage: '森林德鲁伊五消技能',
    svg: badgeIcon('skill_tree_of_life', ELEMENT_ACCENT.wood, TREE_OF_LIFE, 0.9)
  }
]

export const ENEMY_ICONS: IconDef[] = [
  {
    id: 'enemy_slime',
    name: '史莱姆',
    group: 'enemy',
    usage: '第一章普通敌人头像',
    svg: badgeIcon('enemy_slime', ELEMENT_ACCENT.wood, SLIME, 0.9)
  },
  {
    id: 'enemy_fire_lizard',
    name: '火蜥蜴',
    group: 'enemy',
    usage: '第二章普通敌人头像',
    svg: badgeIcon('enemy_fire_lizard', ELEMENT_ACCENT.fire, FIRE_LIZARD, 0.9)
  },
  {
    id: 'enemy_frost_ghost',
    name: '冰霜幽灵',
    group: 'enemy',
    usage: '精英敌人头像（冻结棋盘）',
    svg: badgeIcon('enemy_frost_ghost', ACCENT.frost, FROST_GHOST, 0.9)
  },
  {
    id: 'enemy_dragon_whelp',
    name: '幼龙',
    group: 'enemy',
    usage: '教学关两阶段 Boss 头像',
    svg: badgeIcon(
      'enemy_dragon_whelp',
      ELEMENT_ACCENT.fire,
      dragonHead({ horn: 26, glow: '#ffd25c', spikes: 2, fierce: 0 }),
      0.84
    )
  },
  {
    id: 'enemy_ancient_dragon',
    name: '远古巨龙',
    group: 'enemy',
    usage: '章节 Boss 头像（两阶段）',
    svg: badgeIcon(
      'enemy_ancient_dragon',
      ELEMENT_ACCENT.fire,
      dragonHead({ horn: 62, glow: '#ff7a59', spikes: 4, fierce: 1 }),
      0.84
    )
  }
]