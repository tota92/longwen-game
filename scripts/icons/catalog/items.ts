/**
 * 图标目录 · 遗物（8）
 * 族系：medallion；每枚遗物以独特器物纹章表达效果语义
 */
import {
  ACCENT,
  ELEMENT_ACCENT,
  SYM,
  frame,
  medallion,
  mirrorX,
  resolvePlaceholders,
  spark,
  type Accent,
  type IconDef
} from '../theme'

function sub(body: string, scale = 0.9): string {
  return `<g transform="translate(128 128) scale(${scale}) translate(-128 -128)">${body}</g>`
}

function badgeIcon(id: string, accent: Accent, subject: string, scale = 0.9): string {
  return frame(medallion({ uid: id, accent, subject: resolvePlaceholders(sub(subject, scale), id) }))
}

/** 火焰之心：燃烧的宝石心脏 */
const HEART_OF_FLAME = `
  ${SYM.flame(128, 60, 0.72)}
  <path d="M128 216 C62 168 42 136 42 106 C42 76 66 56 92 56 C110 56 122 66 128 82
    C134 66 146 56 164 56 C190 56 214 76 214 106 C214 136 194 168 128 216 Z" fill="url(#ACC)"/>
  <path d="M128 216 C62 168 42 136 42 106 C42 76 66 56 92 56 C110 56 122 66 128 82
    C134 66 146 56 164 56 C190 56 214 76 214 106 C214 136 194 168 128 216 Z" fill="none" stroke="url(#GOLD)" stroke-width="6"/>
  <path d="M84 96 C72 110 68 130 74 148" fill="none" stroke="#ffe6cf" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
  ${SYM.flame(128, 140, 1.05)}
  ${spark(196, 92, 13, '#ffc59b', 0.8)}
  ${spark(58, 104, 10, '#ffc59b', 0.6)}
`

/** 寒冰之触：雪花 + 回环箭头（冻结持续 +1 回合，语义直读） */
const ICE_TOUCH = `
  <path d="M60 176 A82 82 0 1 0 62 92" fill="none" stroke="url(#ACC)" stroke-width="15" stroke-linecap="round"/>
  <path d="M62 40 L98 104 L26 104 Z" fill="url(#ACC)"/>
  ${SYM.snow(128, 132, 0.92)}
  ${spark(196, 190, 12, '#ffffff', 0.7)}
  ${spark(202, 74, 10, '#d8f4ff', 0.6)}
`

/** 自然共鸣：叶片 + 治愈符文 + 五枚木灵石（每 5 木宝石回复生命） */
const NATURE_RESONANCE = `
  ${SYM.leaf(128, 118, 1.5)}
  <path d="M118 118 L138 118 M128 108 L128 128" stroke="#125230" stroke-width="10" stroke-linecap="round"/>
  <path d="M62 176 C86 196 170 196 194 176" fill="none" stroke="url(#ACC)" stroke-width="7" stroke-linecap="round" opacity="0.7"/>
  <g fill="url(#ACC)">
    <circle cx="72" cy="170" r="11"/><circle cx="100" cy="182" r="11"/><circle cx="128" cy="186" r="11"/>
    <circle cx="156" cy="182" r="11"/><circle cx="184" cy="170" r="11"/>
  </g>
  <g fill="#ffffff" opacity="0.75">
    <circle cx="69" cy="166" r="3.4"/><circle cx="97" cy="178" r="3.4"/><circle cx="125" cy="182" r="3.4"/>
    <circle cx="153" cy="178" r="3.4"/><circle cx="181" cy="166" r="3.4"/>
  </g>
  ${spark(58, 84, 12, '#c6f8cf', 0.75)}
  ${spark(196, 92, 10, '#c6f8cf', 0.6)}
`

/** 连锁反应：三环相扣 + 火花（连击倍率提升） */
const CHAIN_REACTION = `
  <g fill="none" stroke="url(#GOLD)" stroke-width="12">
    <circle cx="94" cy="112" r="36"/>
    <circle cx="162" cy="112" r="36"/>
    <circle cx="128" cy="164" r="36"/>
  </g>
  <g fill="none" stroke="#2a1c04" stroke-width="3" opacity="0.35">
    <circle cx="94" cy="112" r="42"/><circle cx="162" cy="112" r="42"/><circle cx="128" cy="164" r="42"/>
  </g>
  <circle cx="128" cy="128" r="20" fill="url(#ACC)"/>
  <circle cx="128" cy="128" r="20" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.6"/>
  ${spark(128, 70, 15, '#ffdf7a', 0.9)}
  ${spark(60, 176, 12, '#ffdf7a', 0.7)}
  ${spark(198, 172, 11, '#ffdf7a', 0.65)}
`

/** 幸运骰子：斜置骰子 + 星辉（概率不消耗回合） */
const LUCKY_DICE = `
  <g transform="rotate(-14 128 128)">
    <rect x="62" y="62" width="132" height="132" rx="26" fill="url(#GOLD)"/>
    <rect x="62" y="62" width="132" height="132" rx="26" fill="none" stroke="#2a1c04" stroke-width="4" opacity="0.4"/>
    <rect x="74" y="74" width="108" height="52" rx="18" fill="#ffffff" opacity="0.25"/>
    <g fill="#2a1c04">
      <circle cx="98" cy="98" r="11"/><circle cx="158" cy="98" r="11"/>
      <circle cx="128" cy="128" r="11"/>
      <circle cx="98" cy="158" r="11"/><circle cx="158" cy="158" r="11"/>
    </g>
  </g>
  ${spark(60, 70, 14, '#ffdf7a', 0.9)}
  ${spark(200, 92, 11, '#ffdf7a', 0.7)}
  ${spark(186, 196, 13, '#ffdf7a', 0.8)}
`

/** 元素共鸣：秘法宝珠 + 六元素环绕（四消额外生成技能石） */
const ELEMENT_RESONANCE = `
  <circle cx="128" cy="128" r="70" fill="none" stroke="url(#GOLD)" stroke-width="7" opacity="0.85"/>
  <circle cx="128" cy="128" r="70" fill="none" stroke="url(#ACC)" stroke-width="16" opacity="0.25"/>
  <circle cx="128" cy="128" r="40" fill="url(#ACC)"/>
  <circle cx="128" cy="128" r="40" fill="none" stroke="#ffffff" stroke-width="3.5" opacity="0.55"/>
  <ellipse cx="112" cy="112" rx="14" ry="10" fill="#ffffff" opacity="0.5" transform="rotate(-30 112 112)"/>
  ${[0, 60, 120, 180, 240, 300]
    .map((deg) => {
      const rad = (deg * Math.PI) / 180
      const x = 128 + Math.cos(rad) * 70
      const y = 128 + Math.sin(rad) * 70
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="url(#GOLD)"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#ffffff" opacity="0.85"/>`
    })
    .join('')}
  ${spark(128, 40, 13, '#ffdf7a', 0.8)}
`

/** 绝境反击：裂盾 + 斜剑（低血量增伤） */
const DESPERATE_COUNTER = `
  <g transform="rotate(-36 128 128)">
    <path d="M128 42 L142 62 L142 150 L114 150 L114 62 Z" fill="url(#GOLD)"/>
    <rect x="96" y="150" width="64" height="11" rx="5" fill="url(#GOLD)"/>
    <rect x="122" y="161" width="12" height="34" rx="5" fill="#5a3f12"/>
    <circle cx="128" cy="204" r="10" fill="url(#GOLD)"/>
  </g>
  <path d="M128 96 C150 96 172 104 184 112 C184 152 172 192 128 212 C84 192 72 152 72 112 C84 104 106 96 128 96 Z"
    fill="url(#ACC)" opacity="0.95"/>
  <path d="M128 96 C150 96 172 104 184 112 C184 152 172 192 128 212 C84 192 72 152 72 112 C84 104 106 96 128 96 Z"
    fill="none" stroke="url(#GOLD)" stroke-width="6"/>
  <path d="M118 108 L134 132 L114 146 L138 166 L124 190" fill="none" stroke="#2a0508" stroke-width="7" stroke-linecap="round" opacity="0.8"/>
  ${spark(196, 84, 14, '#ff6b70', 0.85)}
  ${spark(62, 76, 11, '#ff6b70', 0.65)}
`

/** 宝石精通：切面宝石 + 环绕碎晶（基础宝石伤害 +2） */
const GEM_MASTERY = `
  <path d="M128 42 L192 100 L128 214 L64 100 Z" fill="url(#ACC)"/>
  <path d="M128 42 L192 100 L128 118 L64 100 Z" fill="#ffffff" opacity="0.32"/>
  <path d="M64 100 L128 118 L128 214 Z" fill="#ffffff" opacity="0.12"/>
  <path d="M192 100 L128 118 L128 214 Z" fill="#000000" opacity="0.24"/>
  <g stroke="#ffffff" stroke-opacity="0.45" stroke-width="2.5" fill="none">
    <path d="M128 42 L128 118 M64 100 L128 118 L192 100 M128 118 L128 214"/>
  </g>
  <path d="M128 42 L192 100 L128 214 L64 100 Z" fill="none" stroke="url(#GOLD)" stroke-width="6" stroke-linejoin="round"/>
  <g fill="url(#GOLD)">
    <path d="M56 52 L70 66 L56 80 L42 66 Z"/>
    <path d="M206 60 L218 72 L206 84 L194 72 Z"/>
    <path d="M206 186 L218 198 L206 210 L194 198 Z"/>
  </g>
  ${spark(128, 92, 15, '#ffffff', 0.6)}
`

export const RELIC_ICONS: IconDef[] = [
  {
    id: 'relic_heart_of_flame',
    name: '火焰之心',
    group: 'relic',
    usage: '遗物：火属性技能伤害 +30%',
    svg: badgeIcon('relic_heart_of_flame', ELEMENT_ACCENT.fire, HEART_OF_FLAME, 0.88)
  },
  {
    id: 'relic_ice_touch',
    name: '寒冰之触',
    group: 'relic',
    usage: '遗物：冻结持续时间 +1 回合',
    svg: badgeIcon('relic_ice_touch', ACCENT.frost, ICE_TOUCH, 0.9)
  },
  {
    id: 'relic_nature_resonance',
    name: '自然共鸣',
    group: 'relic',
    usage: '遗物：每消除 5 个木宝石回复 3 生命',
    svg: badgeIcon('relic_nature_resonance', ELEMENT_ACCENT.wood, NATURE_RESONANCE, 0.9)
  },
  {
    id: 'relic_chain_reaction',
    name: '连锁反应',
    group: 'relic',
    usage: '遗物：连击倍率 +0.3',
    svg: badgeIcon('relic_chain_reaction', ACCENT.gold, CHAIN_REACTION, 0.9)
  },
  {
    id: 'relic_lucky_dice',
    name: '幸运骰子',
    group: 'relic',
    usage: '遗物：有效交换 20% 概率不消耗回合',
    svg: badgeIcon('relic_lucky_dice', ACCENT.gold, LUCKY_DICE, 0.86)
  },
  {
    id: 'relic_element_resonance',
    name: '元素共鸣',
    group: 'relic',
    usage: '遗物：四消 30% 概率额外生成技能石',
    svg: badgeIcon('relic_element_resonance', ACCENT.arcane, ELEMENT_RESONANCE, 0.86)
  },
  {
    id: 'relic_desperate_counter',
    name: '绝境反击',
    group: 'relic',
    usage: '遗物：生命低于 30% 时全部伤害 +50%',
    svg: badgeIcon('relic_desperate_counter', ACCENT.blood, DESPERATE_COUNTER, 0.88)
  },
  {
    id: 'relic_gem_mastery',
    name: '宝石精通',
    group: 'relic',
    usage: '遗物：基础宝石伤害 +2',
    svg: badgeIcon('relic_gem_mastery', ACCENT.arcane, GEM_MASTERY, 0.88)
  }
]