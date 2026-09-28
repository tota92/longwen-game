/**
 * 图标目录 · 棋盘元素 / 技能石覆盖标记 / 状态徽记
 *
 * 族系：element=宝石切面（无徽章框，保证 40px 棋盘尺寸可辨识）
 *      overlay=覆盖标记（叠加在宝石之上，深描边保证任意底色可读）
 *      status =状态圆徽（粗环高对比，16~20px 可读）
 */
import {
  ACCENT,
  ELEMENT_ACCENT,
  SYM,
  badge,
  frame,
  gem,
  gemSigil,
  halo,
  mark,
  resolvePlaceholders,
  spark,
  type Accent,
  type IconDef
} from '../theme'

/** 火焰印记：宽底火舌 + 暗色内焰镂空（与水滴印记形成明确区分） */
const SIG_FIRE = `
  <g transform="translate(128 142) scale(1.12)">
    <path d="M0 -52 C9 -35 6 -26 15 -15 C26 -2 34 8 34 22 C34 41 19 54 0 54 C-19 54 -34 41 -34 22 C-34 3 -23 -10 -15 -23 C-7 -35 -4 -43 0 -52 Z" fill="url(#ACC)"/>
    <path d="M0 -6 C7 5 13 12 13 22 C13 34 7 42 0 42 C-7 42 -13 34 -13 22 C-13 13 -7 5 0 -6 Z" fill="#3a0f06" opacity="0.7"/>
  </g>`

/** 光印记：粗光芒 + 双层光球（保证光芒在小尺寸不丢失） */
const SIG_LIGHT = `
  <g transform="translate(128 140)">
    <g stroke="url(#ACC)" stroke-width="16" stroke-linecap="round" fill="none">
      <path d="M0 -58 L0 -36"/><path d="M0 58 L0 36"/>
      <path d="M-58 0 L-36 0"/><path d="M58 0 L36 0"/>
      <path d="M-41 -41 L-26 -26"/><path d="M41 41 L26 26"/>
      <path d="M41 -41 L26 -26"/><path d="M-41 41 L-26 26"/>
    </g>
    <circle cx="0" cy="0" r="27" fill="url(#ACC)"/>
    <circle cx="0" cy="0" r="12" fill="#fffdf0" opacity="0.9"/>
  </g>`

/** 组装一枚元素宝石（印记使用高亮渐变 + 暗色描边，保证在饱和宝石体上可读） */
function gemIcon(id: string, accent: Accent, symbol: string, tip?: string): string {
  const sigil = resolvePlaceholders(symbol, id, 'sigLight')
  return frame(
    gem({
      uid: id,
      accent,
      sigil: gemSigil(id, sigil) + (tip ? resolvePlaceholders(tip, id, 'sigLight') : '')
    })
  )
}

/** 组装一枚状态徽章 */
function badgeIcon(id: string, accent: Accent, symbol: string): string {
  return frame(badge(id, accent, resolvePlaceholders(symbol, id)))
}

/** 组装一枚覆盖标记 */
function markIcon(id: string, accent: Accent, symbol: string): string {
  return frame(mark(id, accent, symbol))
}

// ------------------------------------------------------------------
// 元素宝石（6）
// ------------------------------------------------------------------

export const ELEMENT_ICONS: IconDef[] = [
  {
    id: 'el_fire',
    name: '火元素宝石',
    group: 'element',
    usage: '棋盘火属性宝石',
    svg: gemIcon('el_fire', ELEMENT_ACCENT.fire, SIG_FIRE)
  },
  {
    id: 'el_water',
    name: '水元素宝石',
    group: 'element',
    usage: '棋盘水属性宝石',
    svg: gemIcon('el_water', ELEMENT_ACCENT.water, SYM.drop(128, 140, 1.3))
  },
  {
    id: 'el_wood',
    name: '木元素宝石',
    group: 'element',
    usage: '棋盘木属性宝石',
    svg: gemIcon('el_wood', ELEMENT_ACCENT.wood, SYM.leaf(128, 138, 1.35))
  },
  {
    id: 'el_light',
    name: '光元素宝石',
    group: 'element',
    usage: '棋盘光属性宝石',
    svg: gemIcon('el_light', ELEMENT_ACCENT.light, SIG_LIGHT)
  },
  {
    id: 'el_dark',
    name: '暗元素宝石',
    group: 'element',
    usage: '棋盘暗属性宝石',
    svg: gemIcon('el_dark', ELEMENT_ACCENT.dark, SYM.moon(128, 140, 1.0))
  },
  {
    id: 'el_thunder',
    name: '雷元素宝石',
    group: 'element',
    usage: '棋盘雷属性宝石',
    svg: gemIcon('el_thunder', ELEMENT_ACCENT.thunder, SYM.bolt(128, 140, 1.06))
  }
]

// ------------------------------------------------------------------
// 技能石 / 冻结 覆盖标记（4）
// ------------------------------------------------------------------

/** 四角星（无 paint 属性，供覆盖标记两层绘制） */
const STAR4_PATH =
  'M128 30 C142 96 160 114 226 128 C160 142 142 160 128 226 C114 160 96 142 30 128 C96 114 114 96 128 30 Z'

/** 五角星（无 paint 属性） */
function star5Path(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2
    const rad = i % 2 === 0 ? outer : inner
    pts.push(`${(cx + Math.cos(ang) * rad).toFixed(1)} ${(cy + Math.sin(ang) * rad).toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}

/** 雪花（无 paint 属性） */
function snowPath(cx: number, cy: number, r: number): string {
  let out = ''
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i
    const dx = Math.cos(a)
    const dy = Math.sin(a)
    const bx = cx + dx * r * 0.42
    const by = cy + dy * r * 0.42
    out +=
      `<line x1="${cx}" y1="${cy}" x2="${(cx + dx * r).toFixed(1)}" y2="${(cy + dy * r).toFixed(1)}"/>` +
      `<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx + Math.cos(a - 0.9) * r * 0.34).toFixed(1)}" y2="${(by + Math.sin(a - 0.9) * r * 0.34).toFixed(1)}"/>` +
      `<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx + Math.cos(a + 0.9) * r * 0.34).toFixed(1)}" y2="${(by + Math.sin(a + 0.9) * r * 0.34).toFixed(1)}"/>`
  }
  return out
}

export const OVERLAY_ICONS: IconDef[] = [
  {
    id: 'ov_small',
    name: '小技能石标记',
    group: 'overlay',
    usage: '四消产物，叠加于宝石左上角',
    svg: markIcon('ov_small', ACCENT.gold, `<path d="${STAR4_PATH}" transform="translate(0 0)"/>`)
  },
  {
    id: 'ov_ultimate',
    name: '终极技能石标记',
    group: 'overlay',
    usage: '五消产物，叠加于宝石左上角',
    svg: markIcon(
      'ov_ultimate',
      ACCENT.shadow,
      `<path d="${star5Path(128, 124, 96, 40)}" stroke-width="12"/>` +
        `<circle cx="128" cy="124" r="104" fill="none" stroke-width="10" stroke-dasharray="26 18"/>`
    )
  },
  {
    id: 'ov_bomb',
    name: '炸弹石标记',
    group: 'overlay',
    usage: 'L/T 型产物，叠加于宝石左上角',
    svg: markIcon(
      'ov_bomb',
      ACCENT.blood,
      // 暗铁球体（显式深色填充，两遍绘制下保持暗色）+ 强调色引信与裂纹
      `<circle cx="120" cy="158" r="66" fill="#241018" stroke-width="11"/>` +
        `<path d="M96 122 C106 108 122 100 138 100" fill="none" stroke="#ff8a6a" stroke-width="12" stroke-linecap="round" opacity="0.9"/>` +
        `<path d="M120 158 L104 190 M120 158 L150 184 M120 158 L142 130" fill="none" stroke="#ffd25c" stroke-width="9" stroke-linecap="round"/>` +
        `<path d="M120 158 L120 202" fill="none" stroke="#ffd25c" stroke-width="8" stroke-linecap="round"/>` +
        `<path d="M158 96 C174 80 174 58 162 44" fill="none" stroke-width="16"/>` +
        `<path d="M162 44 C180 30 200 36 206 52 C188 54 174 62 170 74 Z" stroke-width="10"/>` +
        `<path d="M198 24 C202 14 206 8 214 4" fill="none" stroke-width="11" stroke-linecap="round"/>`
    )
  },
  {
    id: 'ov_freeze',
    name: '冻结标记',
    group: 'overlay',
    usage: '被冻结宝石的角标（REQ-ENEMY-101）',
    svg: markIcon(
      'ov_freeze',
      ACCENT.frost,
      `<g stroke-width="20" stroke-linecap="round" fill="none">${snowPath(128, 128, 100)}</g>`
    )
  }
]

// ------------------------------------------------------------------
// 状态徽记（6）
// ------------------------------------------------------------------

export const STATUS_ICONS: IconDef[] = [
  {
    id: 'status_burn',
    name: '燃烧状态',
    group: 'status',
    usage: '敌人面板燃烧状态角标',
    svg: badgeIcon('status_burn', ELEMENT_ACCENT.fire, SYM.flame(128, 138, 1.42))
  },
  {
    id: 'status_poison',
    name: '中毒状态',
    group: 'status',
    usage: '敌人面板中毒状态角标',
    svg: badgeIcon('status_poison', ACCENT.emerald, SYM.skull(128, 132, 1.0))
  },
  {
    id: 'status_freeze',
    name: '冻结状态',
    group: 'status',
    usage: '敌人冻结状态角标（倒计时暂停）',
    svg: badgeIcon('status_freeze', ACCENT.frost, SYM.snow(128, 130, 1.22))
  },
  {
    id: 'status_stun',
    name: '眩晕状态',
    group: 'status',
    usage: '敌人眩晕状态角标（跳过行动）',
    svg: badgeIcon(
      'status_stun',
      ELEMENT_ACCENT.light,
      // 眩晕：三颗环绕星（小尺寸下比旋涡更易辨识）
      `<circle cx="128" cy="128" r="15" fill="url(#ACC)"/>` +
        `<path d="M128 74 A54 54 0 0 1 175 101" fill="none" stroke="url(#ACC)" stroke-width="7" stroke-linecap="round" opacity="0.6"/>` +
        `<path d="M175 101 A54 54 0 0 1 148 175" fill="none" stroke="url(#ACC)" stroke-width="7" stroke-linecap="round" opacity="0.6"/>` +
        spark(128, 62, 30, 'url(#ACC)') +
        spark(186, 160, 26, 'url(#ACC)') +
        spark(70, 160, 24, 'url(#ACC)')
    )
  },
  {
    id: 'status_shield',
    name: '护盾状态',
    group: 'status',
    usage: '玩家护盾值角标（REQ-HERO-103）',
    svg: frame(
      badge(
        'status_shield',
        ACCENT.frost,
        resolvePlaceholders(SYM.shield(128, 132, 1.16), 'status_shield')
      )
    )
  },
  {
    id: 'status_combo',
    name: '连击状态',
    group: 'status',
    usage: '连击数展示（REQ-FEEL-001）',
    svg: badgeIcon(
      'status_combo',
      ELEMENT_ACCENT.thunder,
      `<g fill="none" stroke="url(#ACC)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">` +
        `<path d="M72 108 L128 62 L184 108"/>` +
        `<path d="M72 156 L128 110 L184 156"/>` +
        `<path d="M72 200 L128 154 L184 200"/>` +
        `</g>` +
        halo('status_combo', 128, 130, 60, '#ffffff', 0.25)
    )
  }
]