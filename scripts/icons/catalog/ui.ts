/**
 * 图标目录 · 关卡节点标记 / UI 功能按钮 / 结算纹章
 * 族系：node/result=medallion（纹章感）；ui=glyph（金质符号 + 暗色描边，任意背景可读）
 */
import {
  ACCENT,
  ELEMENT_ACCENT,
  SYM,
  frame,
  glyph,
  medallion,
  mirrorX,
  resolvePlaceholders,
  spark,
  type Accent,
  type IconDef
} from '../theme'
import { dragonHead } from './actors'

/** UI 符号中的镂空/刻线颜色（两遍绘制下保持深色） */
const CUT = '#120a20'

function sub(body: string, scale = 0.9): string {
  return `<g transform="translate(128 128) scale(${scale}) translate(-128 -128)">${body}</g>`
}

function badgeIcon(id: string, accent: Accent, subject: string, scale = 0.9): string {
  return frame(medallion({ uid: id, accent, subject: resolvePlaceholders(sub(subject, scale), id) }))
}

/** UI 符号图标：符号须保持无 paint 属性（由 glyph 统一绘制两遍） */
function uiIcon(id: string, accent: Accent, symbol: string): string {
  return frame(glyph(id, accent, symbol))
}

// ==================================================================
// 关卡节点标记（4）
// ==================================================================

const NODE_TUTORIAL = `
  <path d="M50 86 C76 74 106 74 128 90 C150 74 180 74 206 86 L206 176 C180 164 150 164 128 180
    C106 164 76 164 50 176 Z" fill="url(#GOLD)"/>
  <path d="M128 90 L128 180" stroke="#2a1c04" stroke-width="5" opacity="0.55"/>
  <g stroke="#2a1c04" stroke-width="3" opacity="0.35" fill="none">
    <path d="M66 100 L112 94"/><path d="M66 118 L112 112"/><path d="M66 136 L112 130"/>
    <path d="M144 94 L190 100"/><path d="M144 112 L190 118"/><path d="M144 130 L190 136"/>
  </g>
  <circle cx="128" cy="140" r="26" fill="url(#ACC)"/>
  <circle cx="128" cy="140" r="26" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.7"/>
  <path d="M128 122 L136 138 L128 158 L120 138 Z" fill="#ffffff" opacity="0.9"/>
  ${spark(66, 62, 12, '#ffdf7a', 0.8)}
  ${spark(194, 66, 10, '#ffdf7a', 0.65)}
`

const NODE_NORMAL = mirrorX(`<g transform="rotate(38 128 128)">${SYM.sword(128, 126, 0.86)}</g>`)

const NODE_ELITE = `
  ${mirrorX(
    `<path d="M96 118 C68 108 42 116 24 136 C44 140 60 152 68 168 C78 152 88 138 100 130 Z" fill="url(#GOLD)"/>` +
      `<path d="M92 132 C70 126 52 132 38 146 C56 150 68 160 76 172 C82 158 88 144 96 136 Z" fill="#2a1c04" opacity="0.3"/>`
  )}
  <path d="M128 62 L172 116 L128 202 L84 116 Z" fill="url(#ACC)"/>
  <path d="M128 62 L172 116 L128 130 L84 116 Z" fill="#ffffff" opacity="0.35"/>
  <path d="M84 116 L128 130 L128 202 Z" fill="#ffffff" opacity="0.12"/>
  <path d="M172 116 L128 130 L128 202 Z" fill="#000000" opacity="0.26"/>
  <path d="M128 62 L172 116 L128 202 L84 116 Z" fill="none" stroke="url(#GOLD)" stroke-width="6" stroke-linejoin="round"/>
  <path d="M100 40 L128 58 L156 40 L150 74 L106 74 Z" fill="url(#GOLD)"/>
  ${spark(128, 100, 14, '#ffffff', 0.6)}
`

const NODE_BOSS = `
  ${mirrorX(
    `<path d="M78 92 C54 74 44 44 52 18 C74 36 92 54 100 74 Z" fill="url(#GOLD)"/>` +
      `<path d="M86 88 C68 74 60 52 64 34 C80 48 92 62 98 78 Z" fill="#2a1c04" opacity="0.32"/>`
  )}
  ${SYM.skull(128, 130, 1.06)}
  <path d="M96 44 L108 60 L128 44 L148 60 L160 44 L160 76 L96 76 Z" fill="url(#GOLD)"/>
  <g fill="#ff5a3c">
    <ellipse cx="111" cy="122" rx="7" ry="7.5"/>
    <ellipse cx="145" cy="122" rx="7" ry="7.5"/>
  </g>
  <path d="M104 168 C114 176 142 176 152 168" fill="none" stroke="#8a0f14" stroke-width="6" stroke-linecap="round" opacity="0.7"/>
  ${spark(58, 152, 12, '#ff6b70', 0.7)}
  ${spark(200, 148, 10, '#ff6b70', 0.6)}
`

// ==================================================================
// UI 功能按钮（14）——符号保持无 paint 属性
// ==================================================================

const UI_PLAY = `<path d="M94 60 L200 128 L94 196 Z"/>`

const UI_TEAM = `
  <path d="M128 34 L168 94 L128 154 L88 94 Z"/>
  <path d="M70 128 L100 172 L70 216 L40 172 Z"/>
  <path d="M186 128 L216 172 L186 216 L156 172 Z"/>
  <path d="M128 34 L168 94 L128 110 L88 94 Z" fill="#f7e7a8"/>
  <path d="M70 128 L100 172 L70 188 L40 172 Z" fill="#f7e7a8"/>
  <path d="M186 128 L216 172 L186 188 L156 172 Z" fill="#f7e7a8"/>
`

const UI_MAP = `
  <path d="M50 76 L100 56 L156 76 L206 56 L206 184 L156 204 L100 184 L50 204 Z"/>
  <g fill="none" stroke="${CUT}" stroke-width="4.5">
    <path d="M100 56 L100 184"/><path d="M156 76 L156 204"/>
  </g>
  <g stroke="${CUT}" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="16 14">
    <path d="M74 150 C96 122 126 164 152 128 C170 104 186 116 196 100"/>
  </g>
  <circle cx="74" cy="150" r="9" fill="${CUT}"/>
  <circle cx="196" cy="98" r="9" fill="${CUT}"/>
`

const UI_SOUND_ON = `
  <path d="M68 104 L102 104 L146 68 L146 188 L102 152 L68 152 Z"/>
  <g fill="none" stroke-width="9" stroke-linecap="round">
    <path d="M168 96 C188 112 188 144 168 160"/>
    <path d="M192 72 C222 98 222 158 192 184"/>
  </g>
`

const UI_SOUND_OFF = `
  <path d="M68 104 L102 104 L146 68 L146 188 L102 152 L68 152 Z"/>
  <g fill="none" stroke-width="14" stroke-linecap="round">
    <path d="M170 100 L210 156"/><path d="M210 100 L170 156"/>
  </g>
`

const UI_PAUSE = `
  <circle cx="128" cy="128" r="94" fill="none" stroke-width="10" stroke-dasharray="34 24" opacity="0.8"/>
  <rect x="84" y="68" width="28" height="120" rx="12"/>
  <rect x="144" y="68" width="28" height="120" rx="12"/>
`

const UI_BACK = `<path d="M148 56 L74 128 L148 200 L148 158 L200 158 L200 98 L148 98 Z"/>`

const UI_NEXT = mirrorX(UI_BACK)

const UI_RETRY = `
  <path d="M60 176 A82 82 0 1 0 62 92" fill="none" stroke-width="18" stroke-linecap="round"/>
  <path d="M62 40 L98 104 L26 104 Z"/>
`

const UI_CHECK = `<path d="M68 130 L112 178 L192 84" fill="none" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`

const UI_LOCK = `
  <path d="M92 114 L92 88 C92 66 108 50 128 50 C148 50 164 66 164 88 L164 114"
    fill="none" stroke-width="16" stroke-linecap="round"/>
  <rect x="66" y="110" width="124" height="98" rx="20"/>
  <circle cx="128" cy="148" r="13" fill="${CUT}"/>
  <path d="M128 156 L128 182" fill="none" stroke="${CUT}" stroke-width="12" stroke-linecap="round"/>
`

const UI_TIP = `
  <path d="M128 40 C166 40 194 68 194 106 C194 130 180 146 170 160 C162 172 160 182 160 192 L96 192
    C96 182 94 172 86 160 C76 146 62 130 62 106 C62 68 90 40 128 40 Z"/>
  <rect x="100" y="198" width="56" height="15" rx="7"/>
  <rect x="108" y="219" width="40" height="13" rx="6"/>
  <path d="M128 82 L140 112 L128 150 L116 112 Z" fill="${CUT}"/>
  <path d="M128 100 L128 168" fill="none" stroke="${CUT}" stroke-width="8" stroke-linecap="round" opacity="0.65"/>
  <g fill="none" stroke-width="8" stroke-linecap="round" opacity="0.85">
    <path d="M40 62 L64 80"/><path d="M216 62 L192 80"/><path d="M128 12 L128 28"/>
  </g>
`

const UI_TARGET = `
  <circle cx="128" cy="128" r="86" fill="none" stroke-width="13"/>
  <circle cx="128" cy="128" r="50" fill="none" stroke-width="11" stroke-dasharray="16 13"/>
  <circle cx="128" cy="128" r="15"/>
  <path d="M128 128 L212 44" fill="none" stroke-width="13" stroke-linecap="round"/>
  <path d="M186 26 L230 22 L226 66 Z"/>
`

// ==================================================================
// 导出
// ==================================================================

export const NODE_ICONS: IconDef[] = [
  {
    id: 'node_tutorial',
    name: '教学关卡标记',
    group: 'node',
    usage: '关卡选择 · 教学关节点',
    svg: badgeIcon('node_tutorial', ACCENT.gold, NODE_TUTORIAL, 0.9)
  },
  {
    id: 'node_normal',
    name: '普通关卡标记',
    group: 'node',
    usage: '关卡选择 · 标准战斗关节点',
    svg: badgeIcon('node_normal', ELEMENT_ACCENT.light, NODE_NORMAL, 0.86)
  },
  {
    id: 'node_elite',
    name: '精英关卡标记',
    group: 'node',
    usage: '关卡选择 · 精英关节点（每 5 关）',
    svg: badgeIcon('node_elite', ACCENT.arcane, NODE_ELITE, 0.9)
  },
  {
    id: 'node_boss',
    name: 'Boss 关卡标记',
    group: 'node',
    usage: '关卡选择 · Boss 关节点（每 10 关）',
    svg: badgeIcon('node_boss', ACCENT.blood, NODE_BOSS, 0.9)
  }
]

export const UI_ICONS: IconDef[] = [
  { id: 'ui_play', name: '开始/继续', group: 'ui', usage: '主界面开始游戏按钮', svg: uiIcon('ui_play', ACCENT.gold, UI_PLAY) },
  { id: 'ui_team', name: '编队', group: 'ui', usage: '主界面编队入口', svg: uiIcon('ui_team', ACCENT.arcane, UI_TEAM) },
  { id: 'ui_map', name: '关卡地图', group: 'ui', usage: '主界面关卡入口/章节地图', svg: uiIcon('ui_map', ACCENT.gold, UI_MAP) },
  { id: 'ui_sound_on', name: '音效开', group: 'ui', usage: '音效开关（开启态）', svg: uiIcon('ui_sound_on', ELEMENT_ACCENT.light, UI_SOUND_ON) },
  { id: 'ui_sound_off', name: '音效关', group: 'ui', usage: '音效开关（关闭态）', svg: uiIcon('ui_sound_off', ACCENT.bone, UI_SOUND_OFF) },
  { id: 'ui_pause', name: '暂停', group: 'ui', usage: '战斗界面暂停按钮（REQ-UI 9.2）', svg: uiIcon('ui_pause', ACCENT.gold, UI_PAUSE) },
  { id: 'ui_back', name: '返回', group: 'ui', usage: '各页头返回按钮', svg: uiIcon('ui_back', ACCENT.gold, UI_BACK) },
  { id: 'ui_next', name: '下一关', group: 'ui', usage: '结算界面下一关按钮', svg: uiIcon('ui_next', ACCENT.gold, UI_NEXT) },
  { id: 'ui_retry', name: '重开', group: 'ui', usage: '结算界面立即重开按钮（REQ-LEVEL-005）', svg: uiIcon('ui_retry', ELEMENT_ACCENT.fire, UI_RETRY) },
  { id: 'ui_check', name: '通关确认', group: 'ui', usage: '关卡已通关标记 / 确认', svg: uiIcon('ui_check', ACCENT.emerald, UI_CHECK) },
  { id: 'ui_lock', name: '关卡锁定', group: 'ui', usage: '未解锁关卡节点', svg: uiIcon('ui_lock', ACCENT.bone, UI_LOCK) },
  { id: 'ui_tip', name: '教学提示', group: 'ui', usage: '引导条图标（REQ-TUTO-001 无弹窗引导）', svg: uiIcon('ui_tip', ELEMENT_ACCENT.light, UI_TIP) },
  { id: 'ui_target', name: '关卡目标', group: 'ui', usage: '教学关目标标记', svg: uiIcon('ui_target', ACCENT.blood, UI_TARGET) },
  {
    id: 'ui_emblem',
    name: '龙纹徽记',
    group: 'ui',
    usage: '主界面游戏徽记',
    svg: badgeIcon('ui_emblem', ACCENT.gold, dragonHead({ horn: 54, glow: '#ffd25c', spikes: 3, fierce: 1 }), 0.82)
  }
]

// ==================================================================
// 结算纹章（2）
// ==================================================================

const RES_VICTORY = `
  <g opacity="0.85">
    <g transform="rotate(38 128 132)">${SYM.sword(128, 132, 0.8)}</g>
    <g transform="rotate(-38 128 132)">${SYM.sword(128, 132, 0.8)}</g>
  </g>
  <path d="M128 26 L138 66 L180 70 L146 98 L156 140 L128 116 L100 140 L110 98 L76 70 L118 66 Z" fill="url(#GOLD)"/>
  <path d="M128 26 L138 66 L128 74 Z" fill="#fffdf2" opacity="0.6"/>
  <circle cx="128" cy="132" r="34" fill="url(#ACC)" opacity="0.85"/>
  <circle cx="128" cy="132" r="34" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.5"/>
  ${spark(52, 62, 15, '#ffdf7a', 0.9)}
  ${spark(206, 66, 12, '#ffdf7a', 0.75)}
  ${spark(190, 196, 13, '#ffdf7a', 0.8)}
  ${spark(64, 192, 10, '#ffdf7a', 0.65)}
`

const RES_DEFEAT = `
  ${mirrorX(`<g transform="rotate(-30 128 168)">${SYM.sword(128, 168, 0.62)}</g>`)}
  ${SYM.skull(128, 118, 1.02)}
  <path d="M112 84 L130 108 L108 122 L132 142 L118 172" fill="none" stroke="#5a4b3a" stroke-width="6" stroke-linecap="round" opacity="0.85"/>
  <path d="M104 178 C116 188 140 188 152 178" fill="none" stroke="#8a0f14" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
  <g fill="#e5484d" opacity="0.85">
    <ellipse cx="111" cy="110" rx="7" ry="7.5"/>
    <ellipse cx="145" cy="110" rx="7" ry="7.5"/>
  </g>
  ${spark(56, 70, 12, '#a97bff', 0.5)}
  ${spark(200, 182, 10, '#a97bff', 0.45)}
`

export const RESULT_ICONS: IconDef[] = [
  {
    id: 'res_victory',
    name: '胜利纹章',
    group: 'result',
    usage: '结算界面胜利标识',
    svg: badgeIcon('res_victory', ACCENT.gold, RES_VICTORY, 0.88)
  },
  {
    id: 'res_defeat',
    name: '战败纹章',
    group: 'result',
    usage: '结算界面战败标识',
    svg: badgeIcon('res_defeat', ACCENT.shadow, RES_DEFEAT, 0.88)
  }
]