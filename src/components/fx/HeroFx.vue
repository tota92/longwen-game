<script setup lang="ts">
/**
 * 英雄侧招式动画片段（纯 SVG + CSS keyframes）
 *
 * 由 BattleFx.vue 包在 <svg viewBox="0 0 300 300"> 内渲染，本组件只输出 <g> 片段。
 *
 * ── 坐标系约定 ─────────────────────────────────────────────
 * 出手方永远画在**左侧**、受击方在**画面中央**（x = 150）：
 *   地面线 y≈238 ｜ 躯干中心 y≈176 ｜ 头顶 y≈112
 * BattleFx 会按出手阵营整体镜像（英雄出手不镜像，怪物出手 scaleX(-1)），
 * 所以所有片段只需按"攻击者在左"这一种朝向绘制。
 *
 * ── 动画纪律 ───────────────────────────────────────────────
 * · 定位与动画分两层：外层静态 transform 摆位，内层挂 CSS 动画。
 *   直接给带 transform 属性的元素加 CSS transform 会覆盖定位坐标，元素飞出画布。
 * · 一律 transform-box: fill-box + transform-origin，Safari/Chrome 才能绕自身中心转。
 * · --d 是命中同步延迟（等出手方冲到对面身前），所有关键帧都从它起算。
 * · 跟随动作用 --t / --tb 做 animation-delay 错位，避免所有部位同起同落。
 *   这两个变量由模板传**裸数字**（秒），CSS 侧一律写成 `var(--t) * 1s`：
 *   calc 不能把时间和纯数字相加，漏掉 `* 1s` 会让整条 animation 简写在计算值阶段
 *   失效——动画静默不播、控制台也不报错，极难查。
 * · 每段动画都以 opacity: 0 收尾，元素被 store 摘掉时不会"啪"地消失。
 */
import { computed } from 'vue'
import type { FxVariant } from '@/config/fxVariants'

const props = defineProps<{ variant: FxVariant; uid: number }>()

/** 渐变引用（id 带 uid，多套特效同屏互不串色） */
const gRad = computed(() => `url(#fx-rad-${props.uid})`)
const gBeam = computed(() => `url(#fx-beam-${props.uid})`)

/** 施法符文阵脚下上升的符文碎块 */
const CAST_MOTES = [
  { x: 96, h: 118, o: 0.9, t: 0 },
  { x: 128, h: 152, o: 1, t: 0.08 },
  { x: 150, h: 176, o: 0.85, t: 0.16 },
  { x: 174, h: 146, o: 1, t: 0.05 },
  { x: 206, h: 112, o: 0.8, t: 0.13 }
] as const

/** 治疗上升光萤（自然之触复用前 5 颗） */
const HEAL_MOTES = [
  { x: 104, h: 96, t: 0, s: 1 },
  { x: 126, h: 132, t: 0.09, s: 0.7 },
  { x: 150, h: 154, t: 0.04, s: 1.2 },
  { x: 176, h: 126, t: 0.15, s: 0.85 },
  { x: 198, h: 100, t: 0.07, s: 1 },
  { x: 214, h: 140, t: 0.2, s: 0.6 },
  { x: 88, h: 118, t: 0.17, s: 0.75 }
] as const

/** 火焰斩尾焰：沿斩击弧线排布的火舌 */
const FLAME_TONGUES = [
  { x: 96, y: 200, a: -28, s: 1, t: 0 },
  { x: 122, y: 172, a: -22, s: 1.25, t: 0.05 },
  { x: 152, y: 146, a: -14, s: 0.95, t: 0.1 },
  { x: 184, y: 126, a: -6, s: 1.35, t: 0.15 },
  { x: 216, y: 112, a: 4, s: 0.85, t: 0.2 }
] as const

/** 火焰斩迸溅的余烬 */
const EMBERS = [
  { x: 176, y: 148, dx: 34, dy: -74, t: 0 },
  { x: 196, y: 132, dx: -22, dy: -96, t: 0.05 },
  { x: 156, y: 164, dx: 46, dy: -56, t: 0.09 },
  { x: 214, y: 122, dx: -38, dy: -84, t: 0.13 },
  { x: 138, y: 180, dx: 26, dy: -66, t: 0.17 },
  { x: 226, y: 140, dx: -14, dy: -104, t: 0.07 }
] as const

/**
 * 流星火雨：起点全部推到画布外，落点散布在地面线上。
 * 外层静态 rotate(121°) 定飞行朝向，内层沿局部 +x 平移 len 即抵达落点
 * （已逐条核对 sx + len·cos121° = lx，sy + len·sin121° = ly）。
 * t = 起飞时刻，tb = 落地起爆时刻（= t + 0.34s 飞行时长）
 */
const METEORS = [
  { sx: 304, sy: -21, lx: 150, ly: 236, len: 300, s: 1, t: 0, tb: 0.34 },
  { sx: 285, sy: -36, lx: 120, ly: 238, len: 320, s: 0.78, t: 0.15, tb: 0.49 },
  { sx: 357, sy: -53, lx: 182, ly: 238, len: 340, s: 1.12, t: 0.28, tb: 0.62 },
  { sx: 289, sy: -10, lx: 140, ly: 238, len: 290, s: 0.62, t: 0.42, tb: 0.76 }
] as const

/** 冰锥：三枚错峰射出 */
const ICE_SHARDS = [
  { y: 148, a: -7, len: 176, s: 1, t: 0 },
  { y: 184, a: 4, len: 172, s: 0.82, t: 0.07 },
  { y: 212, a: 12, len: 162, s: 0.64, t: 0.14 }
] as const

/** 冰锥命中后炸开的碎冰渣（dist = 飞散距离） */
const ICE_CHIPS = [
  { a: -140, dist: 46 }, { a: -95, dist: 62 }, { a: -40, dist: 52 },
  { a: 20, dist: 68 }, { a: 70, dist: 44 }, { a: 130, dist: 58 }
] as const

/** 绝对零度：地面拔起的冰棱（把目标钉在原地） */
const AZ_SPIKES = [
  { x: 96, h: 78, t: 0 },
  { x: 122, h: 108, t: 0.05 },
  { x: 150, h: 132, t: 0.02 },
  { x: 178, h: 104, t: 0.08 },
  { x: 204, h: 74, t: 0.04 }
] as const

/** 自然之触：藤上叶片，随抽打顺序弹出 */
const NL_LEAVES = [
  { x: 62, y: 208, a: -34, t: 0.06 },
  { x: 108, y: 178, a: -22, t: 0.095 },
  { x: 152, y: 166, a: -8, t: 0.13 },
  { x: 198, y: 176, a: 12, t: 0.165 },
  { x: 244, y: 190, a: 26, t: 0.2 }
] as const

/** 生命之树的枝条与树冠光团（整体压在舞台可见带 y≈112~255 内） */
const TL_BRANCHES = [
  { d: 'M150 198 C130 190 116 176 106 158', t: 0.16 },
  { d: 'M150 198 C170 190 184 176 194 158', t: 0.215 },
  { d: 'M150 212 C134 206 122 198 112 186', t: 0.27 },
  { d: 'M150 212 C166 206 178 198 188 186', t: 0.325 }
] as const
const TL_CANOPY = [
  { x: 150, y: 132, r: 34, t: 0.3 },
  { x: 108, y: 152, r: 25, t: 0.36 },
  { x: 192, y: 152, r: 25, t: 0.4 },
  { x: 114, y: 180, r: 18, t: 0.46 },
  { x: 186, y: 180, r: 18, t: 0.5 }
] as const

/** 生命之树的花瓣/光萤 */
const PETALS = [
  { x: 120, y: 156, dx: -30, dy: -70, t: 0, s: 1 },
  { x: 180, y: 154, dx: 34, dy: -80, t: 0.07, s: 0.8 },
  { x: 150, y: 132, dx: 6, dy: -86, t: 0.13, s: 1.15 },
  { x: 104, y: 180, dx: -40, dy: -60, t: 0.2, s: 0.7 },
  { x: 196, y: 178, dx: 44, dy: -66, t: 0.04, s: 0.95 },
  { x: 136, y: 198, dx: -16, dy: -96, t: 0.17, s: 0.6 },
  { x: 166, y: 200, dx: 22, dy: -100, t: 0.24, s: 0.85 },
  { x: 90, y: 166, dx: -48, dy: -50, t: 0.11, s: 0.75 }
] as const
</script>

<template>
  <!-- ══════════════ 普攻斩击 ══════════════ -->
  <g v-if="variant === 'slash_basic'" class="fxv">
    <g class="sb-blade">
      <path class="glow" d="M62 212 C96 132 170 86 244 94 C186 114 124 162 96 226 Z" fill="currentColor" opacity=".55" />
      <path d="M66 214 C100 136 172 90 242 96" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" />
      <path d="M78 202 C108 142 168 102 228 104" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".9" />
    </g>
    <g transform="translate(206,120)">
      <g class="sb-spark">
        <path v-for="i in 8" :key="i" :transform="`rotate(${i * 45})`" d="M0 -9 L3.4 -32 L0 -46 L-3.4 -32 Z" fill="#fff" />
      </g>
    </g>
    <circle class="sb-flash" cx="200" cy="126" r="27" :fill="gRad" />
  </g>

  <!-- ══════════════ 暴击·交叉双斩 ══════════════ -->
  <g v-else-if="variant === 'cross_slash'" class="fxv">
    <g class="cs-blade-a">
      <path class="glow" d="M62 212 C96 132 170 86 244 94 C186 114 124 162 96 226 Z" fill="currentColor" opacity=".6" />
      <path d="M66 214 C100 136 172 90 242 96" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" />
    </g>
    <g class="cs-blade-b">
      <path class="glow" d="M238 212 C204 132 130 86 56 94 C114 114 176 162 204 226 Z" fill="currentColor" opacity=".6" />
      <path d="M234 214 C200 136 128 90 58 96" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" />
    </g>
    <circle class="cs-ring" cx="150" cy="168" r="42" fill="none" stroke="currentColor" stroke-width="5" />
    <g transform="translate(150,168)">
      <path class="cs-star" d="M0 -78 L9 -9 L78 0 L9 9 L0 78 L-9 9 L-78 0 L-9 -9 Z" fill="#fff" />
    </g>
    <circle class="cs-flash" cx="150" cy="168" r="40" :fill="gRad" />
  </g>

  <!-- ══════════════ 施法前摇·符文魔法阵 ══════════════ -->
  <g v-else-if="variant === 'arcane_cast'" class="fxv">
    <!-- 脚下符文阵：外层压扁做透视，内层旋转才是"圆盘在转" -->
    <g transform="translate(150,240) scale(1,0.26)">
      <g class="ac-ring">
        <circle r="98" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="20 11" />
        <circle r="76" fill="none" stroke="currentColor" stroke-width="2" opacity=".55" />
        <path v-for="i in 6" :key="i" :transform="`rotate(${i * 60})`" d="M0 -98 L10 -78 L-10 -78 Z" fill="currentColor" />
      </g>
      <g class="ac-ring2">
        <circle r="56" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="7 13" opacity=".9" />
        <path d="M0 -52 L45 26 L-45 26 Z M0 52 L45 -26 L-45 -26 Z" fill="none" stroke="currentColor" stroke-width="2.5" opacity=".8" />
      </g>
    </g>
    <rect class="ac-pillar" x="116" y="14" width="68" height="228" :fill="gBeam" />
    <rect class="ac-core" x="141" y="14" width="18" height="228" fill="#fff" opacity=".8" />
    <circle class="ac-flash" cx="150" cy="182" r="56" :fill="gRad" />
    <g v-for="(p, i) in CAST_MOTES" :key="i" :transform="`translate(${p.x},238)`">
      <rect class="ac-mote" :style="{ '--t': p.t, '--h': p.h }" x="-3.5" y="-3.5" width="7" height="7" fill="currentColor" :opacity="p.o" />
    </g>
  </g>

  <!-- ══════════════ 治疗/护盾·绽放 ══════════════ -->
  <g v-else-if="variant === 'heal_bloom'" class="fxv">
    <ellipse class="hb-ring" cx="150" cy="238" rx="74" ry="19" fill="none" stroke="currentColor" stroke-width="3.5" />
    <ellipse class="hb-ring2" cx="150" cy="238" rx="52" ry="13" fill="none" stroke="#fff" stroke-width="2" />
    <circle class="hb-glow" cx="150" cy="176" r="82" :fill="gRad" />
    <g transform="translate(150,170)">
      <path class="hb-star" d="M0 -70 L7.5 -9 L58 0 L7.5 9 L0 70 L-7.5 9 L-58 0 L-7.5 -9 Z" fill="#fff" />
    </g>
    <g v-for="(m, i) in HEAL_MOTES" :key="i" :transform="`translate(${m.x},236)`">
      <circle class="hb-mote" :style="{ '--t': m.t, '--h': m.h, '--s': m.s }" r="4.5" :fill="i % 3 === 0 ? '#fff' : 'currentColor'" />
    </g>
  </g>

  <!-- ══════════════ 炎龙骑士·火焰斩 ══════════════ -->
  <g v-else-if="variant === 'flame_slash'" class="fxv">
    <g class="fs-blade">
      <path class="glow-wide" d="M58 216 C94 130 172 82 250 90 C188 112 122 164 92 230 Z" fill="currentColor" opacity=".8" />
      <path d="M64 216 C98 138 172 92 246 98" fill="none" stroke="#fff8e0" stroke-width="6" stroke-linecap="round" />
      <path d="M84 200 C112 146 170 108 226 112" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
    </g>
    <g v-for="(f, i) in FLAME_TONGUES" :key="i" :transform="`translate(${f.x},${f.y}) rotate(${f.a})`">
      <g class="fs-tongue" :style="{ '--t': f.t, '--s': f.s }">
        <path d="M0 0 C11 -13 7 -28 0 -44 C-7 -28 -11 -13 0 0 Z" fill="currentColor" opacity=".85" />
        <path d="M0 -4 C6 -13 4 -24 0 -33 C-4 -24 -6 -13 0 -4 Z" fill="#fff2c0" opacity=".9" />
      </g>
    </g>
    <g v-for="(e, i) in EMBERS" :key="'e' + i" :transform="`translate(${e.x},${e.y})`">
      <circle class="fs-ember" :style="{ '--t': e.t, '--dx': e.dx, '--dy': e.dy }" r="3.2" fill="#ffd27a" />
    </g>
    <circle class="fs-flash" cx="196" cy="128" r="34" :fill="gRad" />
  </g>

  <!-- ══════════════ 炎龙骑士·流星火雨 ══════════════ -->
  <g v-else-if="variant === 'meteor_rain'" class="fxv">
    <!-- 天际预热：顶部一团柔和暖光，玩家会下意识抬头看（用径向渐变避免硬边） -->
    <ellipse class="mr-sky" cx="150" cy="86" rx="205" ry="132" :fill="gRad" />

    <g v-for="(m, i) in METEORS" :key="i" :transform="`translate(${m.sx},${m.sy}) rotate(121)`">
      <g class="mr-fly" :style="{ '--t': m.t, '--len': m.len, '--s': m.s }">
        <path class="mr-tail" d="M0 0 C-34 -10 -76 -7 -116 0 C-76 7 -34 10 0 0 Z" fill="currentColor" opacity=".7" />
        <path d="M0 0 C-26 -5.5 -60 -3.5 -92 0 C-60 3.5 -26 5.5 0 0 Z" fill="#ffe9b0" opacity=".85" />
        <circle class="glow" r="13" :fill="gRad" />
        <circle r="5.5" fill="#fff" />
      </g>
    </g>

    <g v-for="(m, i) in METEORS" :key="'b' + i" :transform="`translate(${m.lx},${m.ly})`">
      <g class="mr-boom" :style="{ '--tb': m.tb, '--s': m.s }">
        <circle r="30" :fill="gRad" />
        <circle r="12" fill="#fff6d8" />
      </g>
      <ellipse class="mr-ring" :style="{ '--tb': m.tb }" rx="18" ry="6" fill="none" stroke="currentColor" stroke-width="4" />
      <g class="mr-debris" :style="{ '--tb': m.tb }">
        <path v-for="k in 6" :key="k" :transform="`rotate(${k * 60})`" d="M0 -14 L4.5 -30 L0 -40 L-4.5 -30 Z" fill="#ffb45a" />
      </g>
    </g>
  </g>

  <!-- ══════════════ 冰霜女巫·冰锥 ══════════════ -->
  <g v-else-if="variant === 'ice_shard'" class="fxv">
    <g v-for="(s, i) in ICE_SHARDS" :key="i" :transform="`translate(-70,${s.y}) rotate(${s.a})`">
      <g class="is-fly" :style="{ '--t': s.t, '--len': s.len, '--s': s.s }">
        <path class="glow" d="M-20 -11 L44 -5 L74 0 L44 5 L-20 11 L-8 0 Z" fill="currentColor" opacity=".75" />
        <path d="M-16 -6 L44 -2.5 L68 0 L44 2.5 L-16 6 L-6 0 Z" fill="#eaf8ff" opacity=".95" />
        <path d="M-14 0 L60 0" stroke="#fff" stroke-width="1.6" opacity=".9" />
      </g>
    </g>
    <g transform="translate(152,180)">
      <circle class="is-ring" r="34" fill="none" stroke="currentColor" stroke-width="4" />
      <g class="is-chips">
        <g v-for="(c, i) in ICE_CHIPS" :key="i" :transform="`rotate(${c.a})`">
          <path class="is-chip" :style="{ '--t': i * 0.018, '--dist': c.dist }" d="M0 -12 L5 -22 L0 -30 L-5 -22 Z" fill="#dff3ff" />
        </g>
      </g>
      <circle class="is-flash" r="30" :fill="gRad" />
    </g>
    <ellipse class="is-mist" cx="152" cy="228" rx="66" ry="15" fill="currentColor" opacity=".4" />
  </g>

  <!-- ══════════════ 冰霜女巫·绝对零度 ══════════════ -->
  <g v-else-if="variant === 'absolute_zero'" class="fxv">
    <ellipse class="az-ring" cx="150" cy="238" rx="40" ry="11" fill="none" stroke="#fff" stroke-width="4" />
    <ellipse class="az-ring2" cx="150" cy="238" rx="40" ry="11" fill="none" stroke="currentColor" stroke-width="7" />
    <circle class="az-flash" cx="150" cy="176" r="86" :fill="gRad" />

    <!-- 六出雪花符文：命中瞬间在目标身上绽开并缓转 -->
    <g transform="translate(150,172)">
      <g class="az-flake">
        <g v-for="i in 6" :key="i" :transform="`rotate(${i * 60})`">
          <path d="M0 0 L0 -66 M0 -24 L-14 -38 M0 -24 L14 -38 M0 -46 L-11 -57 M0 -46 L11 -57" fill="none" stroke="#eaf8ff" stroke-width="3.4" stroke-linecap="round" />
        </g>
        <path d="M0 -30 L26 -15 L26 15 L0 30 L-26 15 L-26 -15 Z" fill="none" stroke="currentColor" stroke-width="3" opacity=".9" />
        <circle r="9" fill="#fff" />
      </g>
    </g>

    <!-- 结冰：地面拔起的冰棱 -->
    <g v-for="(sp, i) in AZ_SPIKES" :key="i" :transform="`translate(${sp.x},240)`">
      <path class="az-spike" :style="{ '--t': sp.t }" :d="`M-${9 + i} 0 L-${4 + i} -${sp.h * 0.62} L0 -${sp.h} L${4 + i} -${sp.h * 0.62} L${9 + i} 0 Z`" fill="currentColor" opacity=".72" />
      <path class="az-spike-core" :style="{ '--t': sp.t }" :d="`M-2 0 L0 -${sp.h * 0.92} L2 0 Z`" fill="#fff" opacity=".85" />
    </g>

    <circle v-for="i in 10" :key="'s' + i" class="az-snow" :style="{ '--t': i * 0.045, '--dx': i % 2 === 0 ? 14 : -14 }" :cx="60 + i * 19" cy="40" r="2.6" fill="#fff" />
  </g>

  <!-- ══════════════ 森林德鲁伊·自然之触 ══════════════ -->
  <g v-else-if="variant === 'nature_lash'" class="fxv">
    <path class="nl-vine" d="M-30 228 C42 212 88 168 150 166 C208 164 248 196 296 176" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" pathLength="1" />
    <path class="nl-vine-hi" d="M-30 228 C42 212 88 168 150 166 C208 164 248 196 296 176" fill="none" stroke="#dfffc9" stroke-width="2.6" stroke-linecap="round" pathLength="1" />
    <path class="nl-vine2" d="M-30 194 C48 206 98 228 154 202 C212 176 252 140 300 152" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity=".8" pathLength="1" />
    <g v-for="(lf, i) in NL_LEAVES" :key="i" :transform="`translate(${lf.x},${lf.y}) rotate(${lf.a})`">
      <path class="nl-leaf" :style="{ '--t': lf.t }" d="M0 0 C9 -7 21 -5 26 4 C17 11 5 9 0 0 Z" fill="#b6f58c" />
    </g>
    <g transform="translate(152,178)">
      <circle class="nl-ring" r="30" fill="none" stroke="currentColor" stroke-width="4" />
      <g class="nl-spark">
        <path v-for="k in 7" :key="k" :transform="`rotate(${k * 51})`" d="M0 -10 L3.6 -28 L0 -38 L-3.6 -28 Z" fill="#e6ffd2" />
      </g>
    </g>
    <g v-for="(m, i) in HEAL_MOTES.slice(0, 5)" :key="'m' + i" :transform="`translate(${m.x},232)`">
      <circle class="hb-mote" :style="{ '--t': m.t + 0.18, '--h': m.h * 0.7, '--s': m.s * 0.8 }" r="4" fill="#d9ffc0" />
    </g>
  </g>

  <!-- ══════════════ 森林德鲁伊·生命之树 ══════════════ -->
  <g v-else-if="variant === 'tree_of_life'" class="fxv">
    <ellipse class="tl-ring" cx="150" cy="240" rx="34" ry="10" fill="none" stroke="currentColor" stroke-width="4" />
    <ellipse class="tl-ring2" cx="150" cy="240" rx="24" ry="7" fill="none" stroke="#fff" stroke-width="2.5" />
    <circle class="tl-halo" cx="150" cy="170" r="88" :fill="gRad" />

    <!-- 树干与枝条：pathLength 归一化后描边生长 -->
    <path class="tl-trunk" d="M150 242 C145 220 154 204 150 184" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" pathLength="1" />
    <path class="tl-trunk-hi" d="M150 242 C145 220 154 204 150 184" fill="none" stroke="#eaffd6" stroke-width="3.4" stroke-linecap="round" pathLength="1" />
    <path v-for="(b, i) in TL_BRANCHES" :key="i" class="tl-branch" :style="{ '--t': b.t }" :d="b.d" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" pathLength="1" />

    <g v-for="(c, i) in TL_CANOPY" :key="'c' + i" :transform="`translate(${c.x},${c.y})`">
      <circle class="tl-canopy" :style="{ '--t': c.t }" :r="c.r" :fill="gRad" />
    </g>

    <g v-for="(p, i) in PETALS" :key="'p' + i" :transform="`translate(${p.x},${p.y})`">
      <path class="tl-petal" :style="{ '--t': p.t + 0.34, '--dx': p.dx, '--dy': p.dy, '--s': p.s }" d="M0 -5 C4 -2 4 3 0 6 C-4 3 -4 -2 0 -5 Z" :fill="i % 2 === 0 ? '#fff' : 'currentColor'" />
    </g>
  </g>
</template>

<style scoped>
/* 共用发光：drop-shadow 取 currentColor，自动跟着元素色走 */
.glow { filter: drop-shadow(0 0 6px currentColor); }
.glow-wide { filter: drop-shadow(0 0 12px currentColor); }

/* 描边生长类（pathLength="1" 归一化，不用手算路径长度） */
.nl-vine,
.nl-vine-hi,
.nl-vine2,
.tl-trunk,
.tl-trunk-hi,
.tl-branch {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}

/* ---------- 普攻斩击 ---------- */
.sb-blade {
  transform-box: fill-box;
  transform-origin: 6% 90%;
  animation: sb-swing 0.34s cubic-bezier(0.16, 0.9, 0.24, 1) var(--d, 0s) both;
}
@keyframes sb-swing {
  0% { opacity: 0; transform: rotate(-28deg) scale(0.4, 0.26); }
  18% { opacity: 1; }
  60% { opacity: 0.95; transform: rotate(6deg) scale(1.06, 1.06); }
  100% { opacity: 0; transform: rotate(15deg) scale(1.24, 1.16); }
}
.sb-spark,
.nl-spark,
.mr-debris {
  transform-box: fill-box;
  transform-origin: center;
  animation: burst-out 0.38s ease-out calc(var(--d, 0s) + 0.05s) both;
}
@keyframes burst-out {
  0% { opacity: 0; transform: scale(0.18) rotate(-20deg); }
  26% { opacity: 1; }
  100% { opacity: 0; transform: scale(1.55) rotate(16deg); }
}
.sb-flash,
.fs-flash,
.is-flash,
.cs-flash,
.ac-flash,
.az-flash {
  transform-box: fill-box;
  transform-origin: center;
  animation: flash-pop 0.32s ease-out calc(var(--d, 0s) + 0.02s) both;
}
@keyframes flash-pop {
  0% { opacity: 0; transform: scale(0.28); }
  28% { opacity: 0.95; }
  100% { opacity: 0; transform: scale(1.95); }
}

/* ---------- 暴击·交叉双斩 ---------- */
.cs-blade-a {
  transform-box: fill-box;
  transform-origin: 6% 90%;
  animation: sb-swing 0.3s cubic-bezier(0.16, 0.9, 0.24, 1) var(--d, 0s) both;
}
.cs-blade-b {
  transform-box: fill-box;
  transform-origin: 94% 90%;
  animation: cs-swing-b 0.3s cubic-bezier(0.16, 0.9, 0.24, 1) calc(var(--d, 0s) + 0.09s) both;
}
@keyframes cs-swing-b {
  0% { opacity: 0; transform: rotate(28deg) scale(0.4, 0.26); }
  18% { opacity: 1; }
  60% { opacity: 0.95; transform: rotate(-6deg) scale(1.06, 1.06); }
  100% { opacity: 0; transform: rotate(-15deg) scale(1.24, 1.16); }
}
.cs-ring,
.is-ring,
.nl-ring {
  transform-box: fill-box;
  transform-origin: center;
  animation: ring-out 0.5s ease-out calc(var(--d, 0s) + 0.14s) both;
}
@keyframes ring-out {
  0% { opacity: 0.95; transform: scale(0.24); }
  100% { opacity: 0; transform: scale(2.7); }
}
.cs-star {
  transform-box: fill-box;
  transform-origin: center;
  animation: star-flare 0.44s cubic-bezier(0.2, 1.4, 0.4, 1) calc(var(--d, 0s) + 0.12s) both;
}
@keyframes star-flare {
  0% { opacity: 0; transform: scale(0.1) rotate(-40deg); }
  30% { opacity: 1; transform: scale(1.15) rotate(0deg); }
  100% { opacity: 0; transform: scale(1.5) rotate(28deg); }
}

/* ---------- 施法符文阵 ---------- */
.ac-ring,
.ac-ring2 {
  transform-box: fill-box;
  transform-origin: center;
}
/* 旋转与淡入淡出拆成两条动画：各自只写一个属性，互不覆盖 */
.ac-ring { animation: spin-cw 2.6s linear infinite, fade-io 0.94s ease-out var(--d, 0s) both; }
.ac-ring2 { animation: spin-ccw 1.9s linear infinite, fade-io 0.94s ease-out var(--d, 0s) both; }
@keyframes spin-cw { to { transform: rotate(360deg); } }
@keyframes spin-ccw { to { transform: rotate(-360deg); } }
@keyframes fade-io {
  0% { opacity: 0; }
  14% { opacity: 1; }
  72% { opacity: 0.9; }
  100% { opacity: 0; }
}
.ac-pillar,
.ac-core {
  transform-box: fill-box;
  transform-origin: 50% 100%;
}
.ac-pillar { animation: pillar-up 0.68s cubic-bezier(0.2, 0.9, 0.3, 1) var(--d, 0s) both; }
.ac-core { animation: pillar-up 0.56s cubic-bezier(0.2, 0.9, 0.3, 1) calc(var(--d, 0s) + 0.04s) both; }
@keyframes pillar-up {
  0% { opacity: 0; transform: scaleY(0.06) scaleX(1.5); }
  26% { opacity: 1; transform: scaleY(1) scaleX(1); }
  100% { opacity: 0; transform: scaleY(1.08) scaleX(0.5); }
}
.ac-mote {
  transform-box: fill-box;
  transform-origin: center;
  animation: mote-rise 0.9s cubic-bezier(0.3, 0.7, 0.4, 1) calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes mote-rise {
  0% { opacity: 0; transform: translateY(0) scale(0.4) rotate(0deg); }
  22% { opacity: 1; }
  100% { opacity: 0; transform: translateY(calc(var(--h) * -1px)) scale(1.05) rotate(150deg); }
}

/* ---------- 治疗绽放 ---------- */
.hb-ring,
.hb-ring2,
.tl-ring,
.tl-ring2 {
  transform-box: fill-box;
  transform-origin: center;
  animation: ring-rise 0.82s ease-out var(--d, 0s) both;
}
.hb-ring2,
.tl-ring2 { animation-delay: calc(var(--d, 0s) + 0.12s); }
@keyframes ring-rise {
  0% { opacity: 0.9; transform: scale(0.3) translateY(0); }
  100% { opacity: 0; transform: scale(1.7) translateY(-58px); }
}
.hb-glow,
.tl-halo {
  transform-box: fill-box;
  transform-origin: center;
  animation: glow-breathe 0.96s ease-out var(--d, 0s) both;
}
@keyframes glow-breathe {
  0% { opacity: 0; transform: scale(0.4); }
  30% { opacity: 0.85; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.22); }
}
.hb-star {
  transform-box: fill-box;
  transform-origin: center;
  animation: star-spin 0.92s cubic-bezier(0.2, 1.1, 0.4, 1) calc(var(--d, 0s) + 0.06s) both;
}
@keyframes star-spin {
  0% { opacity: 0; transform: scale(0.1) rotate(-70deg); }
  26% { opacity: 1; transform: scale(1.05) rotate(0deg); }
  100% { opacity: 0; transform: scale(1.35) rotate(96deg); }
}
.hb-mote {
  transform-box: fill-box;
  transform-origin: center;
  animation: mote-float 0.9s cubic-bezier(0.28, 0.6, 0.4, 1) calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes mote-float {
  0% { opacity: 0; transform: translateY(0) scale(0.2); }
  20% { opacity: 1; transform: translateY(calc(var(--h) * -0.22px)) scale(var(--s, 1)); }
  100% { opacity: 0; transform: translateY(calc(var(--h) * -1px)) scale(calc(var(--s, 1) * 0.45)); }
}

/* ---------- 火焰斩 ---------- */
.fs-blade {
  transform-box: fill-box;
  transform-origin: 6% 90%;
  animation: fs-swing 0.44s cubic-bezier(0.16, 0.9, 0.24, 1) var(--d, 0s) both;
}
@keyframes fs-swing {
  0% { opacity: 0; transform: rotate(-30deg) scale(0.36, 0.22); }
  16% { opacity: 1; }
  54% { opacity: 1; transform: rotate(4deg) scale(1.08, 1.08); }
  100% { opacity: 0; transform: rotate(13deg) scale(1.3, 1.2); }
}
.fs-tongue {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: tongue-lick 0.54s ease-out calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes tongue-lick {
  0% { opacity: 0; transform: scale(0.2, 0.1); }
  26% { opacity: 1; transform: scale(var(--s, 1), calc(var(--s, 1) * 1.35)); }
  56% { transform: scale(calc(var(--s, 1) * 0.82), calc(var(--s, 1) * 0.95)); }
  100% { opacity: 0; transform: scale(var(--s, 1), calc(var(--s, 1) * 1.5)); }
}
.fs-ember {
  transform-box: fill-box;
  transform-origin: center;
  animation: ember-fly 0.66s cubic-bezier(0.2, 0.7, 0.5, 1) calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes ember-fly {
  0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
  18% { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(var(--dx) * 1px), calc(var(--dy) * 1px)) scale(0.2); }
}

/* ---------- 流星火雨 ---------- */
.mr-sky {
  transform-box: fill-box;
  transform-origin: 50% 0%;
  animation: mr-sky-glow 1.16s ease-out var(--d, 0s) both;
}
@keyframes mr-sky-glow {
  0% { opacity: 0; }
  14% { opacity: 0.5; }
  60% { opacity: 0.26; }
  100% { opacity: 0; }
}
/* 飞行：translateX 走局部 +x（已被外层 rotate 定向），落地瞬间淡出交给爆炸接手 */
.mr-fly,
.is-fly {
  animation: fly-in 0.34s linear calc(var(--d, 0s) + var(--t) * 1s) both;
}
.is-fly { animation-duration: 0.26s; animation-timing-function: cubic-bezier(0.3, 0.6, 0.4, 1); }
@keyframes fly-in {
  0% { opacity: 1; transform: translateX(0) scale(var(--s, 1)); }
  86% { opacity: 1; }
  100% { opacity: 0; transform: translateX(calc(var(--len) * 1px)) scale(var(--s, 1)); }
}
.mr-tail {
  transform-box: fill-box;
  transform-origin: 100% 50%;
  animation: tail-flicker 0.16s ease-in-out infinite alternate;
}
@keyframes tail-flicker {
  from { transform: scaleX(0.86) scaleY(0.9); }
  to { transform: scaleX(1.12) scaleY(1.14); }
}
.mr-boom {
  transform-box: fill-box;
  transform-origin: center;
  animation: boom-pop 0.46s cubic-bezier(0.1, 0.9, 0.3, 1) calc(var(--d, 0s) + var(--tb) * 1s) both;
}
@keyframes boom-pop {
  0% { opacity: 0; transform: scale(0.1); }
  22% { opacity: 1; transform: scale(calc(var(--s, 1) * 1.35)); }
  100% { opacity: 0; transform: scale(calc(var(--s, 1) * 2.1)); }
}
.mr-ring {
  transform-box: fill-box;
  transform-origin: center;
  animation: ring-flat 0.52s ease-out calc(var(--d, 0s) + var(--tb) * 1s) both;
}
@keyframes ring-flat {
  0% { opacity: 0.95; transform: scale(0.3); }
  100% { opacity: 0; transform: scale(3.4); }
}
.mr-debris { animation-delay: calc(var(--d, 0s) + var(--tb) * 1s); }

/* ---------- 冰锥 ---------- */
.is-chip {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: chip-fly 0.5s cubic-bezier(0.15, 0.8, 0.5, 1) calc(var(--d, 0s) + 0.24s + var(--t) * 1s) both;
}
/* 碎裂反馈要等冰锥真的飞到（首枚 0.26s 抵达），不能跟着斩击的节拍提前炸 */
.is-ring { animation-delay: calc(var(--d, 0s) + 0.24s); }
.is-flash { animation-delay: calc(var(--d, 0s) + 0.22s); }
@keyframes chip-fly {
  0% { opacity: 1; transform: translateY(0) scale(0.5); }
  100% { opacity: 0; transform: translateY(calc(var(--dist) * -0.4px)) scale(1.2) rotate(60deg); }
}
.is-mist {
  transform-box: fill-box;
  transform-origin: center;
  animation: mist-spread 0.66s ease-out calc(var(--d, 0s) + 0.26s) both;
}
@keyframes mist-spread {
  0% { opacity: 0; transform: scale(0.3, 0.4); }
  34% { opacity: 0.45; }
  100% { opacity: 0; transform: scale(1.5, 1.1); }
}

/* ---------- 绝对零度 ---------- */
.az-ring,
.az-ring2 {
  transform-box: fill-box;
  transform-origin: center;
  animation: ring-flat 0.76s ease-out var(--d, 0s) both;
}
.az-ring2 { animation-delay: calc(var(--d, 0s) + 0.1s); }
.az-flake {
  transform-box: fill-box;
  transform-origin: center;
  animation: flake-bloom 1.16s cubic-bezier(0.16, 1, 0.3, 1) calc(var(--d, 0s) + 0.06s) both;
}
@keyframes flake-bloom {
  0% { opacity: 0; transform: scale(0.05) rotate(-90deg); }
  20% { opacity: 1; transform: scale(1.12) rotate(0deg); }
  68% { opacity: 0.9; transform: scale(1.02) rotate(46deg); }
  100% { opacity: 0; transform: scale(1.3) rotate(76deg); }
}
.az-spike,
.az-spike-core {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: spike-grow 1.12s cubic-bezier(0.2, 1.5, 0.4, 1) calc(var(--d, 0s) + 0.16s + var(--t) * 1s) both;
}
@keyframes spike-grow {
  0% { opacity: 0; transform: scaleY(0.02) scaleX(1.5); }
  20% { opacity: 1; transform: scaleY(1.1) scaleX(0.92); }
  36% { transform: scaleY(0.97) scaleX(1); }
  74% { opacity: 0.9; transform: scaleY(1) scaleX(1); }
  100% { opacity: 0; transform: scaleY(1.04) scaleX(1); }
}
.az-snow {
  transform-box: fill-box;
  transform-origin: center;
  animation: snow-fall 0.94s linear calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes snow-fall {
  0% { opacity: 0; transform: translate(0, -20px); }
  14% { opacity: 0.95; }
  100% { opacity: 0; transform: translate(calc(var(--dx) * 1px), 196px); }
}

/* ---------- 自然之触 ---------- */
.nl-vine { animation: vine-draw 0.74s cubic-bezier(0.3, 0.8, 0.4, 1) var(--d, 0s) both; }
.nl-vine-hi { animation: vine-draw 0.74s cubic-bezier(0.3, 0.8, 0.4, 1) calc(var(--d, 0s) + 0.03s) both; }
.nl-vine2 { animation: vine-draw 0.78s cubic-bezier(0.3, 0.8, 0.4, 1) calc(var(--d, 0s) + 0.08s) both; }
@keyframes vine-draw {
  0% { stroke-dashoffset: 1; opacity: 0; }
  10% { opacity: 1; }
  42% { stroke-dashoffset: 0; }
  74% { opacity: 0.95; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}
.nl-leaf {
  transform-box: fill-box;
  transform-origin: 0% 50%;
  animation: leaf-pop 0.48s cubic-bezier(0.2, 1.6, 0.4, 1) calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes leaf-pop {
  0% { opacity: 0; transform: scale(0.1) rotate(-40deg); }
  40% { opacity: 1; transform: scale(1.2) rotate(10deg); }
  100% { opacity: 0; transform: scale(0.9) rotate(34deg); }
}
.nl-spark { animation-delay: calc(var(--d, 0s) + 0.2s); }

/* ---------- 生命之树 ---------- */
.tl-trunk { animation: draw-grow 1.42s cubic-bezier(0.24, 0.8, 0.34, 1) var(--d, 0s) both; }
.tl-trunk-hi { animation: draw-grow 1.42s cubic-bezier(0.24, 0.8, 0.34, 1) calc(var(--d, 0s) + 0.04s) both; }
.tl-branch { animation: draw-grow 1.16s ease-out calc(var(--d, 0s) + var(--t) * 1s) both; }
@keyframes draw-grow {
  0% { stroke-dashoffset: 1; opacity: 0; }
  9% { opacity: 1; }
  30% { stroke-dashoffset: 0; }
  80% { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}
.tl-canopy {
  transform-box: fill-box;
  transform-origin: center;
  animation: canopy-bloom 1.06s cubic-bezier(0.2, 1.2, 0.4, 1) calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes canopy-bloom {
  0% { opacity: 0; transform: scale(0.08); }
  24% { opacity: 0.95; transform: scale(1.14); }
  52% { transform: scale(0.96); }
  76% { opacity: 0.8; transform: scale(1.02); }
  100% { opacity: 0; transform: scale(1.18); }
}
.tl-petal {
  transform-box: fill-box;
  transform-origin: center;
  animation: petal-rise 1s cubic-bezier(0.3, 0.6, 0.5, 1) calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes petal-rise {
  0% { opacity: 0; transform: translate(0, 0) scale(0.3) rotate(0deg); }
  18% { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(var(--dx) * 1px), calc(var(--dy) * 1px)) scale(var(--s, 1)) rotate(220deg); }
}
</style>
