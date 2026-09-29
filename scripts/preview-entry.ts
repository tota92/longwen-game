/**
 * 浏览器预览入口（仅开发期使用，不参与正式构建）
 *
 * 与 src/main.ts 的唯一区别：挂载后直接进入指定关卡，
 * 便于在浏览器里截图核对战斗展示区 / 宝石区 / 技能区的真实渲染效果。
 *
 * URL 参数：
 *   ?level=N      直接进入第 N 关（默认 2）
 *   ?tab=skill    信息区切到「技能」页
 *   ?detail=gem   自动展开第一张宝石详情
 *   ?detail=skill 自动展开第一个技能详情
 *   ?fx=all       战斗特效画廊：在真实舞台上循环播放全部招式动画
 *   ?fx=a,b       只循环播放指定的几个变体（名字见 config/fxVariants.ts）
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '../src/App.vue'
import { useGameStore } from '../src/stores/game'
import { FX_SPECS, fxFamily, type FxVariant } from '../src/config/fxVariants'
import type { HitFx, HitFxKind } from '../src/types'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

const store = useGameStore()
const params = new URLSearchParams(location.search)

const rawLevel = Number(params.get('level') ?? 2)
const level = Number.isFinite(rawLevel) && rawLevel >= 1 ? Math.floor(rawLevel) : 2
store.startLevel(level)

const tab = params.get('tab')
if (tab === 'skill' || tab === 'gem') store.setBottomTab(tab)

// 详情浮层属于组件内部状态，用一次真实点击把它打开，保证截到的是真实交互结果
const detail = params.get('detail')
if (detail === 'gem' || detail === 'skill') {
  const selector = detail === 'gem' ? '.gem-card' : '.skill-card'
  window.setTimeout(() => document.querySelector<HTMLElement>(selector)?.click(), 700)
}

// ------------------------------------------------------------------
// 战斗特效画廊（?fx=）
// ------------------------------------------------------------------

/** 各变体的主题色：不填则按阵营取默认色（英雄金橙 / 怪物赤红） */
const FX_COLOR: Partial<Record<FxVariant, string>> = {
  ice_shard: '#3ca7ff',
  absolute_zero: '#3ca7ff',
  frost_breath: '#3ca7ff',
  hex_barrier: '#68d8ff',
  nature_lash: '#4cd964',
  tree_of_life: '#4cd964',
  heal_bloom: '#7dedb2',
  toxic_burst: '#a06bff',
  corrupt_wave: '#a06bff',
  soul_drain: '#c86bff',
  thunder_judgment: '#2cc3e6',
  arcane_cast: '#f0b429',
  slash_basic: '#ffd27a',
  cross_slash: '#ffb03c'
}

/** 落在施法者自己身上的变体（增益 / 前摇），其余都打在对面身上 */
const SELF_FX = new Set<FxVariant>(['arcane_cast', 'hex_barrier'])

function kindOf(v: FxVariant): HitFxKind {
  if (v === 'heal_bloom') return 'heal'
  return SELF_FX.has(v) ? 'cast' : 'skill'
}

/**
 * 直接把实例塞进 store.hitFxs：走的是和正式战斗完全相同的渲染路径
 * （BattleStage → BattleFx → HeroFx/EnemyFx），因此不必复制一份舞台样式。
 * 绕过了 spawnHitFx，所以清理也得由画廊自己按 FX_SPECS.life 来做。
 */
function runFxGallery(variants: FxVariant[]): void {
  const caption = document.createElement('div')
  caption.style.cssText =
    'position:fixed;left:8px;top:8px;z-index:999;padding:4px 10px;border-radius:8px;' +
    'background:rgba(0,0,0,.72);border:1px solid #d4af37;color:#f0d878;' +
    'font:600 13px/1.4 system-ui,sans-serif;pointer-events:none'
  document.body.appendChild(caption)

  // 战斗是回合制：不碰棋盘就不会推进，舞台保持静止，画廊独占画面
  store.battle.canInteract = false

  let uid = 900000

  const play = (variant: FxVariant): void => {
    store.hitFxs = []
    const side = fxFamily(variant) === 'hero' ? 'hero' : 'enemy'
    const fx: HitFx = {
      id: uid++,
      kind: kindOf(variant),
      side,
      color: FX_COLOR[variant] ?? (side === 'hero' ? '#ff8a3c' : '#ff5a3c'),
      variant
    }
    caption.textContent = `${variant} · ${side}`
    store.hitFxs.push(fx)
  }

  /** 把整组特效动画暂停并定位到 T 毫秒处（各动画自带 delay，currentTime 从实例挂载起算） */
  const seek = (ms: number): number => {
    const anims = document.getAnimations().filter((a) => {
      const el = (a.effect as KeyframeEffect | null)?.target as Element | null
      return !!el && !!el.closest('.fx-svg')
    })
    anims.forEach((a) => {
      a.pause()
      a.currentTime = ms
    })
    return anims.length
  }

  const clear = (): void => {
    store.hitFxs = []
  }

  // 控制台/自动化驱动入口：一次加载即可逐变体、逐帧核对
  ;(window as unknown as Record<string, unknown>).__fx = { play, seek, clear, variants: Object.keys(FX_SPECS) }

  let index = 0
  const hold = params.has('fxhold')
  const cycle = (): void => {
    const variant = variants[index % variants.length]
    play(variant)
    if (hold) return
    window.setTimeout(() => {
      clear()
      index++
      window.setTimeout(cycle, 320)
    }, FX_SPECS[variant].life)
  }
  cycle()
}

const fxParam = params.get('fx')
if (fxParam) {
  const all = Object.keys(FX_SPECS) as FxVariant[]
  const wanted =
    fxParam === 'all'
      ? all
      : (fxParam.split(',').map((s) => s.trim()) as FxVariant[]).filter((v) => v in FX_SPECS)
  if (wanted.length > 0) window.setTimeout(() => runFxGallery(wanted), 900)
}
