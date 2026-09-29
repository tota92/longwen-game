<script setup lang="ts">
/**
 * 怪物侧招式动画片段（纯 SVG + CSS keyframes）
 *
 * 坐标约定与 HeroFx.vue 完全一致：出手方（怪物）画在左侧、受击方（英雄）在画面中央，
 * BattleFx 会按阵营整体镜像。因此"吐息/光束/爪击"一律从左往右打。
 *
 * 错峰延迟约定：模板传入的 --t 是**裸数字**（秒），CSS 里必须写成 `var(--t) * 1s`
 * 才能与 var(--d) 相加；漏掉 `* 1s` 会让整条 animation 简写失效、动画静默不播。
 *
 * 覆盖的招式与敌人行动轮换（EnemyAction.kind）一一对应，
 * 让"读招—应对"的博弈在视觉上也读得出来：看到冰雾就知道要冻棋盘，看到光束就是蓄力炸了。
 */
import { computed } from 'vue'
import type { FxVariant } from '@/config/fxVariants'

const props = defineProps<{ variant: FxVariant; uid: number }>()

const gRad = computed(() => `url(#fx-rad-${props.uid})`)
const gBeam = computed(() => `url(#fx-beam-${props.uid})`)
const gFade = computed(() => `url(#fx-fadeh-${props.uid})`)

/** 爪击：三道错峰撕开的爪痕 */
const CLAWS = [
  { x: -40, a: -9, t: 0 },
  { x: 0, a: -4, t: 0.06 },
  { x: 40, a: 2, t: 0.12 }
] as const

/** 重击迸飞的碎块（dx/dy 决定抛物线落点，dy 为负 = 先向上再被重力拽回） */
const CHUNKS = [
  { dx: -62, dy: -54, t: 0 }, { dx: -22, dy: -86, t: 0.03 },
  { dx: 26, dy: -78, t: 0.01 }, { dx: 66, dy: -46, t: 0.05 },
  { dx: -44, dy: -28, t: 0.07 }, { dx: 48, dy: -22, t: 0.04 },
  { dx: 4, dy: -104, t: 0.02 }, { dx: -80, dy: -14, t: 0.06 }
] as const

/** 冰霜吐息里被卷着走的雪花（沿锥体从出口排到受击者） */
const FLAKES = [
  { x: -110, y: 172, t: 0, s: 0.7 }, { x: -58, y: 196, t: 0.07, s: 1 },
  { x: -8, y: 148, t: 0.13, s: 0.8 }, { x: 42, y: 208, t: 0.04, s: 1.15 },
  { x: 92, y: 176, t: 0.18, s: 0.9 }, { x: -32, y: 224, t: 0.1, s: 0.6 },
  { x: 132, y: 142, t: 0.22, s: 0.75 }
] as const

/** 毒泡：先上浮晃动，到顶炸开 */
const BUBBLES = [
  { x: 118, y: 232, h: 92, r: 7, t: 0 }, { x: 150, y: 236, h: 122, r: 10, t: 0.06 },
  { x: 182, y: 230, h: 78, r: 6, t: 0.12 }, { x: 134, y: 234, h: 108, r: 8, t: 0.18 },
  { x: 168, y: 234, h: 134, r: 11, t: 0.09 }, { x: 100, y: 232, h: 66, r: 5, t: 0.24 },
  { x: 200, y: 232, h: 98, r: 7, t: 0.15 }, { x: 156, y: 236, h: 148, r: 6, t: 0.21 },
  { x: 126, y: 234, h: 84, r: 9, t: 0.27 }
] as const

/** 火焰吐息的火舌：顺着吐息方向朝受击者舔出，沿锥体从出口排到受击者 */
const TONGUES = [
  { x: -96, y: 176, a: 90, s: 1.1, t: 0 },
  { x: -52, y: 158, a: 80, s: 1.25, t: 0.05 },
  { x: -52, y: 196, a: 100, s: 1.15, t: 0.09 },
  { x: 6, y: 146, a: 76, s: 1, t: 0.14 },
  { x: 6, y: 208, a: 104, s: 1.05, t: 0.18 },
  { x: 78, y: 176, a: 90, s: 1.35, t: 0.11 }
] as const

/** 光束上顺次冲过的环状冲击 */
const BEAM_RINGS = [
  { t: 0.16, s: 1 }, { t: 0.3, s: 0.82 }, { t: 0.44, s: 1.16 }
] as const

/** 灵魂汲取：被抽出的魂缕（先横向匀速、再纵向缓动 = 自然的弧线） */
const WISPS = [
  { dx: -186, dy: -34, t: 0, s: 1 }, { dx: -204, dy: 18, t: 0.07, s: 0.8 },
  { dx: -168, dy: -62, t: 0.13, s: 1.15 }, { dx: -222, dy: 46, t: 0.04, s: 0.7 },
  { dx: -152, dy: 8, t: 0.19, s: 0.95 }, { dx: -196, dy: -14, t: 0.24, s: 1.05 },
  { dx: -230, dy: 30, t: 0.1, s: 0.62 }
] as const

/** 污染触手：从目标身上往四面八方蔓延 */
const TENDRILS = [
  { d: 'M150 176 C120 190 96 214 74 246', t: 0 },
  { d: 'M150 176 C180 190 206 212 228 244', t: 0.05 },
  { d: 'M150 176 C136 150 118 128 92 108', t: 0.1 },
  { d: 'M150 176 C166 150 184 130 210 112', t: 0.15 },
  { d: 'M150 176 C148 206 152 226 150 254', t: 0.08 }
] as const

/** 凝甲：胸前拼合的六边形甲片（尖顶六边形蜂窝排布，正好盖住躯干） */
const HEXES = [
  { x: 150, y: 176, t: 0 }, { x: 112, y: 176, t: 0.05 }, { x: 188, y: 176, t: 0.05 },
  { x: 131, y: 143, t: 0.1 }, { x: 169, y: 143, t: 0.1 },
  { x: 131, y: 209, t: 0.14 }, { x: 169, y: 209, t: 0.14 },
  { x: 150, y: 116, t: 0.19 }, { x: 150, y: 238, t: 0.19 }
] as const

/** 雷霆审判：三道自天而降的折线闪电 */
const BOLTS = [
  { d: 'M150 -20 L136 46 L162 62 L130 128 L158 142 L126 236', x: 126, t: 0, w: 1 },
  { d: 'M92 -20 L82 40 L100 54 L78 110 L96 122 L86 206', x: 86, t: 0.1, w: 0.66 },
  { d: 'M212 -20 L200 50 L222 66 L196 130 L214 146 L206 212', x: 206, t: 0.18, w: 0.72 }
] as const
</script>

<template>
  <!-- ══════════════ 爪击撕裂 ══════════════ -->
  <g v-if="variant === 'claw_swipe'" class="fxv">
    <g transform="translate(150,172)">
      <g v-for="(c, i) in CLAWS" :key="i" :transform="`translate(${c.x},0) rotate(${c.a})`">
        <g class="cw-mark" :style="{ '--t': c.t }">
          <path class="glow-wide" d="M-9 -78 C13 -26 21 26 8 84 C26 24 19 -28 3 -80 Z" fill="currentColor" opacity=".85" />
          <path d="M-3 -74 C14 -26 20 24 10 76" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".92" />
        </g>
      </g>
      <circle class="cw-flash" r="34" :fill="gRad" />
    </g>
    <g transform="translate(150,178)">
      <g class="cw-debris">
        <path v-for="k in 6" :key="k" :transform="`rotate(${k * 60 + 18})`" d="M0 -16 L6 -34 L0 -46 L-6 -34 Z" fill="#ffb9a0" />
      </g>
    </g>
  </g>

  <!-- ══════════════ 重击冲击波 ══════════════ -->
  <g v-else-if="variant === 'heavy_impact'" class="fxv">
    <g transform="translate(150,176)">
      <circle class="hi-ring" r="30" fill="none" stroke="#fff" stroke-width="5" />
      <circle class="hi-ring2" r="30" fill="none" stroke="currentColor" stroke-width="9" />
      <g class="hi-cracks">
        <path v-for="k in 10" :key="k" :transform="`rotate(${k * 36})`" d="M0 -26 L5 -50 L0 -78 L-5 -50 Z" fill="currentColor" opacity=".8" />
      </g>
      <circle class="hi-core" r="40" :fill="gRad" />
      <g class="hi-chunks">
        <g v-for="(c, i) in CHUNKS" :key="i">
          <path class="hi-chunk" :style="{ '--t': c.t, '--dx': c.dx, '--dy': c.dy }" d="M-6 -5 L2 -8 L8 -1 L3 7 L-5 5 Z" fill="#ffcbb2" />
        </g>
      </g>
    </g>
    <!-- 地面扬尘：冲击波把尘土往两侧推开 -->
    <ellipse class="hi-dust hi-dust-l" cx="112" cy="238" rx="30" ry="10" fill="currentColor" opacity=".35" />
    <ellipse class="hi-dust hi-dust-r" cx="190" cy="238" rx="30" ry="10" fill="currentColor" opacity=".35" />
  </g>

  <!-- ══════════════ 冰霜吐息 ══════════════ -->
  <g v-else-if="variant === 'frost_breath'" class="fxv">
    <path class="fb-cone fb-cone-3" d="M-120 178 C-20 150 70 106 190 92 C222 146 222 214 186 258 C70 244 -20 206 -120 184 Z" :fill="gFade" opacity=".34" />
    <path class="fb-cone fb-cone-2" d="M-120 178 C-30 154 50 122 172 112 C198 152 198 204 170 240 C50 230 -30 202 -120 184 Z" fill="currentColor" opacity=".4" />
    <path class="fb-cone" d="M-120 179 C-40 164 30 142 152 134 C172 158 172 198 150 220 C30 214 -40 198 -120 183 Z" fill="#eaf8ff" opacity=".5" />
    <!-- 被吐息卷着走的雪花 -->
    <g v-for="(f, i) in FLAKES" :key="i" :transform="`translate(${f.x},${f.y})`">
      <g class="fb-flake" :style="{ '--t': f.t, '--s': f.s }">
        <path v-for="k in 3" :key="k" :transform="`rotate(${k * 60})`" d="M0 -9 L0 9" stroke="#fff" stroke-width="2.4" stroke-linecap="round" />
      </g>
    </g>
    <!-- 地面结出的冰壳 -->
    <path class="fb-crust" d="M52 240 L74 226 L96 240 L120 220 L146 240 L172 224 L198 240 L224 228 L248 240" fill="none" stroke="#dff3ff" stroke-width="3.4" stroke-linejoin="round" pathLength="1" />
    <circle class="fb-flash" cx="168" cy="178" r="42" :fill="gRad" />
  </g>

  <!-- ══════════════ 毒液喷溅 ══════════════ -->
  <g v-else-if="variant === 'toxic_burst'" class="fxv">
    <!-- 紫绿毒雾：三团软blob错峰漫开 -->
    <circle class="tb-smoke tb-smoke-1" cx="128" cy="200" r="42" :fill="gRad" />
    <circle class="tb-smoke tb-smoke-2" cx="176" cy="186" r="50" :fill="gRad" />
    <circle class="tb-smoke tb-smoke-3" cx="152" cy="150" r="36" :fill="gRad" />
    <!-- 上浮毒泡：到顶炸开 -->
    <g v-for="(b, i) in BUBBLES" :key="i" :transform="`translate(${b.x},${b.y})`">
      <g class="tb-rise" :style="{ '--t': b.t, '--h': b.h }">
        <circle class="tb-bubble" :style="{ '--t': b.t }" :r="b.r" fill="none" stroke="currentColor" stroke-width="2.4" />
        <circle class="tb-bubble" :style="{ '--t': b.t }" :r="b.r * 0.42" fill="#e9d6ff" opacity=".7" />
      </g>
    </g>
    <!-- 落地毒渍 -->
    <ellipse class="tb-pool" cx="152" cy="240" rx="52" ry="12" fill="currentColor" opacity=".45" />
  </g>

  <!-- ══════════════ 火焰吐息 ══════════════ -->
  <g v-else-if="variant === 'flame_breath'" class="fxv">
    <path class="fb2-cone fb2-cone-2" d="M-120 178 C-20 142 70 100 194 90 C226 146 226 214 190 260 C70 246 -20 208 -120 184 Z" fill="currentColor" opacity=".55" />
    <path class="fb2-cone" d="M-120 179 C-40 160 30 138 158 130 C180 156 180 200 156 224 C30 216 -40 198 -120 183 Z" fill="#ffe6a8" opacity=".6" />
    <g v-for="(t, i) in TONGUES" :key="i" :transform="`translate(${t.x},${t.y}) rotate(${t.a})`">
      <g class="fb2-tongue" :style="{ '--t': t.t, '--s': t.s }">
        <path d="M0 26 C22 8 20 -18 0 -46 C-20 -18 -22 8 0 26 Z" fill="currentColor" opacity=".9" />
        <path d="M0 18 C12 4 11 -12 0 -30 C-11 -12 -12 4 0 18 Z" fill="#fff3c8" opacity=".95" />
      </g>
    </g>
    <g v-for="i in 8" :key="'e' + i" :transform="`translate(${40 + i * 22},${150 + (i % 3) * 26})`">
      <circle class="fb2-ember" :style="{ '--t': i * 0.035, '--dx': 30 + i * 8, '--dy': -50 - (i % 4) * 16 }" r="3" fill="#ffcf7a" />
    </g>
    <circle class="fb2-flash" cx="176" cy="178" r="46" :fill="gRad" />
  </g>

  <!-- ══════════════ 蓄力大招·贯穿光束 ══════════════ -->
  <g v-else-if="variant === 'beam_burst'" class="fxv">
    <!-- 出口蓄能爆闪（在出手方身侧） -->
    <circle class="bb-muzzle" cx="-140" cy="176" r="46" :fill="gRad" />
    <!-- 光柱：外晕 + 白芯，纵向撑开后塌缩 -->
    <rect class="bb-halo" x="-140" y="146" width="500" height="60" :fill="gBeam" />
    <rect class="bb-core" x="-140" y="165" width="500" height="22" fill="#fff" />
    <!-- 顺次冲过的环状冲击：从出口一路推到受击者 -->
    <g v-for="(r, i) in BEAM_RINGS" :key="i">
      <ellipse class="bb-ring" :style="{ '--t': r.t, '--s': r.s }" cx="-140" cy="176" rx="9" ry="26" fill="none" stroke="#fff" stroke-width="4" />
    </g>
    <!-- 溢出的电弧 -->
    <path class="bb-arc bb-arc-1" d="M-120 148 L-92 122 L-68 146 L-38 112 L-10 140" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" pathLength="1" />
    <path class="bb-arc bb-arc-2" d="M-90 206 L-60 232 L-34 208 L-2 240 L30 210" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" pathLength="1" />
    <path class="bb-arc bb-arc-3" d="M20 150 L46 126 L70 152 L100 124" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round" pathLength="1" />
    <!-- 命中点爆发 -->
    <g transform="translate(158,176)">
      <circle class="bb-impact" r="34" :fill="gRad" />
      <circle class="bb-impact-ring" r="24" fill="none" stroke="#fff" stroke-width="4" />
    </g>
  </g>

  <!-- ══════════════ 汲取·灵魂抽离 ══════════════ -->
  <g v-else-if="variant === 'soul_drain'" class="fxv">
    <!-- 目标身上的暗色漩涡 -->
    <g transform="translate(150,176)">
      <g class="sd-vortex">
        <path d="M0 0 C14 -10 30 4 24 20 C16 40 -14 42 -28 22 C-44 -2 -24 -38 8 -44" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".9" />
        <path d="M0 0 C-10 8 -22 -2 -18 -14 C-12 -28 10 -30 20 -18" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7" />
      </g>
      <circle class="sd-glow" r="52" :fill="gRad" />
    </g>
    <!-- 魂缕：横向匀速 + 纵向缓动 = 自然弧线，被抽向怪物一侧 -->
    <g transform="translate(150,176)">
      <g v-for="(w, i) in WISPS" :key="i">
        <g class="sd-x" :style="{ '--t': w.t, '--dx': w.dx }">
          <g class="sd-y" :style="{ '--t': w.t, '--dy': w.dy }">
            <path class="sd-wisp" :style="{ '--t': w.t, '--s': w.s }" d="M0 0 C-16 -8 -38 -6 -54 0 C-38 6 -16 8 0 0 Z" fill="#ffd9e6" opacity=".85" />
          </g>
        </g>
      </g>
    </g>
    <!-- 怪物一侧的吸收闪光：魂缕被抽过去后在这里汇聚爆开 -->
    <circle class="sd-absorb" cx="-120" cy="176" r="38" :fill="gRad" />
  </g>

  <!-- ══════════════ 污染蔓延 ══════════════ -->
  <g v-else-if="variant === 'corrupt_wave'" class="fxv">
    <path v-for="(t, i) in TENDRILS" :key="i" class="cp-tendril" :style="{ '--t': t.t }" :d="t.d" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" pathLength="1" />
    <path v-for="(t, i) in TENDRILS" :key="'h' + i" class="cp-tendril-hi" :style="{ '--t': t.t }" :d="t.d" fill="none" stroke="#f0dcff" stroke-width="2" stroke-linecap="round" opacity=".85" pathLength="1" />
    <circle class="cp-ring" cx="150" cy="176" r="34" fill="none" stroke="currentColor" stroke-width="6" stroke-dasharray="14 9" />
    <circle class="cp-core" cx="150" cy="176" r="44" :fill="gRad" />
    <!-- 故障感碎片：错位闪烁，暗示棋盘被改写 -->
    <g v-for="i in 7" :key="'g' + i" :transform="`translate(${78 + i * 24},${112 + (i % 4) * 38})`">
      <rect class="cp-shard" :style="{ '--t': i * 0.05 }" x="-7" y="-4" width="14" height="8" fill="#fff" opacity=".8" />
    </g>
  </g>

  <!-- ══════════════ 凝甲·六边形护盾 ══════════════ -->
  <g v-else-if="variant === 'hex_barrier'" class="fxv">
    <g v-for="(h, i) in HEXES" :key="i" :transform="`translate(${h.x},${h.y})`">
      <path class="hx-plate" :style="{ '--t': h.t }" d="M0 -22 L19 -11 L19 11 L0 22 L-19 11 L-19 -11 Z" fill="currentColor" opacity=".3" />
      <path class="hx-edge" :style="{ '--t': h.t }" d="M0 -22 L19 -11 L19 11 L0 22 L-19 11 L-19 -11 Z" fill="none" stroke="#fff" stroke-width="2.6" />
    </g>
    <!-- 外框整体成形 -->
    <path class="hx-shell" d="M150 102 L212 138 L212 216 L150 252 L88 216 L88 138 Z" fill="none" stroke="currentColor" stroke-width="3.4" pathLength="1" />
    <circle class="hx-glow" cx="150" cy="176" r="86" :fill="gRad" />
    <!-- 光边扫过：护盾"合上了"的收势 -->
    <rect class="hx-sweep" x="70" y="86" width="26" height="180" fill="#fff" opacity=".5" />
  </g>

  <!-- ══════════════ 雷霆审判 ══════════════ -->
  <g v-else-if="variant === 'thunder_judgment'" class="fxv">
    <ellipse class="tj-sky" cx="150" cy="78" rx="215" ry="122" :fill="gRad" />
    <g v-for="(b, i) in BOLTS" :key="i">
      <path class="tj-bolt-halo" :style="{ '--t': b.t }" :d="b.d" fill="none" stroke="currentColor" :stroke-width="11 * b.w" stroke-linejoin="round" stroke-linecap="round" pathLength="1" />
      <path class="tj-bolt" :style="{ '--t': b.t }" :d="b.d" fill="none" stroke="#fff" :stroke-width="4.4 * b.w" stroke-linejoin="round" stroke-linecap="round" pathLength="1" />
    </g>
    <g v-for="(b, i) in BOLTS" :key="'r' + i" :transform="`translate(${b.x},236)`">
      <ellipse class="tj-ring" :style="{ '--t': b.t + 0.06 }" rx="16" ry="5.5" fill="none" stroke="#fff" stroke-width="3.6" />
      <g class="tj-spark" :style="{ '--t': b.t + 0.06 }">
        <path v-for="k in 6" :key="k" :transform="`rotate(${k * 60})`" d="M0 -8 L3 -22 L0 -30 L-3 -22 Z" fill="#dff6ff" />
      </g>
    </g>
    <circle class="tj-flash" cx="150" cy="176" r="76" :fill="gRad" />
  </g>
</template>

<style scoped>
.glow-wide { filter: drop-shadow(0 0 12px currentColor); }

.cp-tendril,
.cp-tendril-hi,
.fb-crust,
.hx-shell,
.bb-arc,
.tj-bolt,
.tj-bolt-halo {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}

/* ---------- 爪击 ---------- */
.cw-mark {
  transform-box: fill-box;
  transform-origin: 50% 0%;
  animation: claw-rake 0.42s cubic-bezier(0.1, 0.9, 0.25, 1) calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes claw-rake {
  0% { opacity: 0; transform: scaleY(0.1) translateY(-26px) skewX(-14deg); }
  16% { opacity: 1; }
  52% { transform: scaleY(1.06) translateY(0) skewX(4deg); }
  100% { opacity: 0; transform: scaleY(1.16) translateY(16px) skewX(10deg); }
}
.cw-flash,
.fb-flash,
.fb2-flash,
.tj-flash {
  transform-box: fill-box;
  transform-origin: center;
  animation: flash-pop 0.34s ease-out calc(var(--d, 0s) + 0.1s) both;
}
@keyframes flash-pop {
  0% { opacity: 0; transform: scale(0.26); }
  26% { opacity: 0.95; }
  100% { opacity: 0; transform: scale(1.9); }
}
.cw-debris {
  transform-box: fill-box;
  transform-origin: center;
  animation: burst-out 0.44s ease-out calc(var(--d, 0s) + 0.12s) both;
}
@keyframes burst-out {
  0% { opacity: 0; transform: scale(0.18) rotate(-20deg); }
  26% { opacity: 1; }
  100% { opacity: 0; transform: scale(1.6) rotate(18deg); }
}

/* ---------- 重击冲击波 ---------- */
.hi-ring,
.hi-ring2 {
  transform-box: fill-box;
  transform-origin: center;
  animation: ring-out 0.62s cubic-bezier(0.1, 0.8, 0.3, 1) var(--d, 0s) both;
}
.hi-ring2 { animation-delay: calc(var(--d, 0s) + 0.09s); }
@keyframes ring-out {
  0% { opacity: 0.95; transform: scale(0.2); }
  100% { opacity: 0; transform: scale(3.1); }
}
.hi-cracks {
  transform-box: fill-box;
  transform-origin: center;
  animation: burst-out 0.5s ease-out calc(var(--d, 0s) + 0.02s) both;
}
.hi-core {
  transform-box: fill-box;
  transform-origin: center;
  animation: flash-pop 0.42s ease-out var(--d, 0s) both;
}
.hi-chunk {
  transform-box: fill-box;
  transform-origin: center;
  animation: chunk-arc 0.72s cubic-bezier(0.24, 0.6, 0.5, 1) calc(var(--d, 0s) + 0.04s + var(--t) * 1s) both;
}
/* 抛物线：先向上冲，再被重力拽回地面 */
@keyframes chunk-arc {
  0% { opacity: 1; transform: translate(0, 0) scale(1) rotate(0deg); }
  46% { opacity: 1; transform: translate(calc(var(--dx) * 0.62px), calc(var(--dy) * 1px)) scale(0.9) rotate(150deg); }
  100% { opacity: 0; transform: translate(calc(var(--dx) * 1px), calc(var(--dy) * 0.16px + 44px)) scale(0.45) rotate(320deg); }
}
.hi-dust {
  transform-box: fill-box;
  transform-origin: center;
  animation: dust-push 0.66s ease-out calc(var(--d, 0s) + 0.06s) both;
}
.hi-dust-r { animation-name: dust-push-r; }
@keyframes dust-push {
  0% { opacity: 0; transform: translate(24px, 0) scale(0.3, 0.5); }
  26% { opacity: 0.4; }
  100% { opacity: 0; transform: translate(-40px, -8px) scale(1.6, 1.2); }
}
@keyframes dust-push-r {
  0% { opacity: 0; transform: translate(-24px, 0) scale(0.3, 0.5); }
  26% { opacity: 0.4; }
  100% { opacity: 0; transform: translate(40px, -8px) scale(1.6, 1.2); }
}

/* ---------- 冰霜吐息 / 火焰吐息：共用扇形撑开 ---------- */
.fb-cone,
.fb2-cone {
  transform-box: fill-box;
  transform-origin: 0% 50%;
  animation: cone-billow 0.62s cubic-bezier(0.2, 0.75, 0.35, 1) var(--d, 0s) both;
}
.fb-cone-2 { animation-delay: calc(var(--d, 0s) + 0.06s); }
.fb-cone-3 { animation-delay: calc(var(--d, 0s) + 0.12s); animation-duration: 0.68s; }
.fb2-cone-2 { animation-delay: calc(var(--d, 0s) + 0.07s); animation-duration: 0.66s; }
@keyframes cone-billow {
  0% { opacity: 0; transform: scaleX(0.08) scaleY(0.3); }
  22% { opacity: 1; }
  58% { transform: scaleX(1.04) scaleY(1.1); }
  100% { opacity: 0; transform: scaleX(1.16) scaleY(0.86); }
}
.fb-flake {
  transform-box: fill-box;
  transform-origin: center;
  animation: flake-drift 0.62s linear calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes flake-drift {
  0% { opacity: 0; transform: translate(-70px, 0) scale(0.3) rotate(0deg); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translate(88px, 14px) scale(var(--s, 1)) rotate(190deg); }
}
.fb-crust { animation: crust-freeze 0.72s ease-out calc(var(--d, 0s) + 0.14s) both; }
@keyframes crust-freeze {
  0% { stroke-dashoffset: 1; opacity: 0; }
  14% { opacity: 1; }
  56% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}

/* ---------- 毒液喷溅 ---------- */
.tb-smoke {
  transform-box: fill-box;
  transform-origin: center;
  animation: smoke-bill 0.94s ease-out var(--d, 0s) both;
}
.tb-smoke-2 { animation-delay: calc(var(--d, 0s) + 0.08s); }
.tb-smoke-3 { animation-delay: calc(var(--d, 0s) + 0.16s); }
@keyframes smoke-bill {
  0% { opacity: 0; transform: translateY(18px) scale(0.24); }
  28% { opacity: 0.75; }
  100% { opacity: 0; transform: translateY(-46px) scale(1.6); }
}
.tb-rise {
  transform-box: fill-box;
  transform-origin: center;
  animation: bubble-rise 0.62s cubic-bezier(0.3, 0.5, 0.5, 1) calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes bubble-rise {
  0% { opacity: 0; transform: translateY(0) scale(0.3); }
  18% { opacity: 1; }
  78% { opacity: 0.9; transform: translateY(calc(var(--h) * -1px)) scale(1); }
  100% { opacity: 0; transform: translateY(calc(var(--h) * -1.06px)) scale(1.5); }
}
.tb-bubble {
  transform-box: fill-box;
  transform-origin: center;
  animation: bubble-wobble 0.34s ease-in-out calc(var(--d, 0s) + var(--t) * 1s) 2 alternate both;
}
@keyframes bubble-wobble {
  from { transform: translateX(-5px) scale(0.94, 1.06); }
  to { transform: translateX(5px) scale(1.06, 0.94); }
}
.tb-pool {
  transform-box: fill-box;
  transform-origin: center;
  animation: pool-spread 0.86s ease-out var(--d, 0s) both;
}
@keyframes pool-spread {
  0% { opacity: 0; transform: scale(0.2, 0.3); }
  24% { opacity: 0.5; }
  100% { opacity: 0; transform: scale(1.5, 1.1); }
}

/* ---------- 火焰吐息 ---------- */
.fb2-tongue {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: tongue-roll 0.56s ease-out calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes tongue-roll {
  0% { opacity: 0; transform: scale(0.2, 0.1); }
  24% { opacity: 1; transform: scale(var(--s, 1), calc(var(--s, 1) * 1.4)); }
  54% { transform: scale(calc(var(--s, 1) * 0.8), calc(var(--s, 1) * 1)); }
  100% { opacity: 0; transform: scale(var(--s, 1), calc(var(--s, 1) * 1.55)); }
}
.fb2-ember {
  transform-box: fill-box;
  transform-origin: center;
  animation: ember-fly 0.6s cubic-bezier(0.2, 0.7, 0.5, 1) calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes ember-fly {
  0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(var(--dx) * 1px), calc(var(--dy) * 1px)) scale(0.2); }
}
.fb2-flash { animation-delay: calc(var(--d, 0s) + 0.16s); }

/* ---------- 贯穿光束 ---------- */
.bb-muzzle {
  transform-box: fill-box;
  transform-origin: center;
  animation: flash-pop 0.4s ease-out var(--d, 0s) both;
}
.bb-halo,
.bb-core {
  transform-box: fill-box;
  transform-origin: 50% 50%;
}
.bb-halo { animation: beam-fire 0.86s cubic-bezier(0.16, 0.9, 0.3, 1) calc(var(--d, 0s) + 0.06s) both; }
.bb-core { animation: beam-fire 0.78s cubic-bezier(0.16, 0.9, 0.3, 1) calc(var(--d, 0s) + 0.09s) both; }
@keyframes beam-fire {
  0% { opacity: 0; transform: scaleY(0.04) scaleX(0.4); }
  12% { opacity: 1; transform: scaleY(1.35) scaleX(1); }
  34% { transform: scaleY(0.82) scaleX(1); }
  56% { transform: scaleY(1.1) scaleX(1); }
  100% { opacity: 0; transform: scaleY(0.03) scaleX(1); }
}
.bb-ring {
  transform-box: fill-box;
  transform-origin: center;
  animation: ring-travel 0.5s ease-out calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes ring-travel {
  0% { opacity: 0; transform: translateX(0) scale(0.4, var(--s, 1)); }
  18% { opacity: 1; }
  100% { opacity: 0; transform: translateX(300px) scale(1.5, calc(var(--s, 1) * 1.4)); }
}
.bb-arc { animation: arc-flicker 0.5s steps(3, end) calc(var(--d, 0s) + 0.1s) both; }
.bb-arc-2 { animation-delay: calc(var(--d, 0s) + 0.2s); }
.bb-arc-3 { animation-delay: calc(var(--d, 0s) + 0.3s); }
@keyframes arc-flicker {
  0% { stroke-dashoffset: 1; opacity: 0; }
  10% { opacity: 1; }
  40% { stroke-dashoffset: 0; opacity: 0.35; }
  55% { opacity: 1; }
  72% { opacity: 0.3; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}
.bb-impact {
  transform-box: fill-box;
  transform-origin: center;
  animation: flash-pop 0.62s ease-out calc(var(--d, 0s) + 0.12s) both;
}
.bb-impact-ring {
  transform-box: fill-box;
  transform-origin: center;
  animation: ring-out 0.66s ease-out calc(var(--d, 0s) + 0.12s) both;
}

/* ---------- 灵魂汲取 ---------- */
.sd-vortex {
  transform-box: fill-box;
  transform-origin: center;
  animation: vortex-spin 1.06s cubic-bezier(0.3, 0.6, 0.4, 1) var(--d, 0s) both;
}
@keyframes vortex-spin {
  0% { opacity: 0; transform: rotate(0deg) scale(0.2); }
  18% { opacity: 1; }
  100% { opacity: 0; transform: rotate(420deg) scale(1.25); }
}
.sd-glow,
.cp-core,
.hx-glow {
  transform-box: fill-box;
  transform-origin: center;
  animation: glow-breathe 0.94s ease-out var(--d, 0s) both;
}
@keyframes glow-breathe {
  0% { opacity: 0; transform: scale(0.4); }
  28% { opacity: 0.8; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.2); }
}
.sd-x { animation: wisp-x 0.62s linear calc(var(--d, 0s) + var(--t) * 1s) both; }
.sd-y { animation: wisp-y 0.62s ease-in-out calc(var(--d, 0s) + var(--t) * 1s) both; }
.sd-wisp {
  transform-box: fill-box;
  transform-origin: 100% 50%;
  animation: wisp-fade 0.62s ease-out calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes wisp-x { from { transform: translateX(0); } to { transform: translateX(calc(var(--dx) * 1px)); } }
@keyframes wisp-y {
  0% { transform: translateY(0); }
  50% { transform: translateY(calc(var(--dy) * 1px)); }
  100% { transform: translateY(calc(var(--dy) * 0.5px)); }
}
@keyframes wisp-fade {
  0% { opacity: 0; transform: scale(0.3); }
  22% { opacity: 0.95; transform: scale(var(--s, 1)); }
  100% { opacity: 0; transform: scale(calc(var(--s, 1) * 0.35)); }
}
.sd-absorb {
  transform-box: fill-box;
  transform-origin: center;
  animation: flash-pop 0.5s ease-out calc(var(--d, 0s) + 0.44s) both;
}

/* ---------- 污染蔓延 ---------- */
.cp-tendril { animation: tendril-grow 0.78s ease-out calc(var(--d, 0s) + var(--t) * 1s) both; }
.cp-tendril-hi { animation: tendril-grow 0.78s ease-out calc(var(--d, 0s) + var(--t) * 1s + 0.04s) both; }
@keyframes tendril-grow {
  0% { stroke-dashoffset: 1; opacity: 0; }
  12% { opacity: 1; }
  48% { stroke-dashoffset: 0; }
  78% { opacity: 0.9; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}
.cp-ring {
  transform-box: fill-box;
  transform-origin: center;
  animation: ring-spin 0.86s cubic-bezier(0.2, 0.8, 0.4, 1) var(--d, 0s) both;
}
@keyframes ring-spin {
  0% { opacity: 0.9; transform: scale(0.2) rotate(0deg); }
  100% { opacity: 0; transform: scale(2.9) rotate(120deg); }
}
.cp-shard {
  transform-box: fill-box;
  transform-origin: center;
  animation: shard-glitch 0.4s steps(2, end) calc(var(--d, 0s) + var(--t) * 1s) 2 both;
}
@keyframes shard-glitch {
  0% { opacity: 0; transform: scaleX(0.2); }
  30% { opacity: 0.9; transform: scaleX(1.3); }
  60% { opacity: 0.2; transform: scaleX(0.7) translateX(6px); }
  100% { opacity: 0; transform: scaleX(0.1); }
}

/* ---------- 凝甲护盾 ---------- */
.hx-plate,
.hx-edge {
  transform-box: fill-box;
  transform-origin: center;
  animation: hex-snap 0.44s cubic-bezier(0.2, 1.5, 0.4, 1) calc(var(--d, 0s) + var(--t) * 1s) both;
}
.hx-edge { animation-name: hex-snap-edge; }
@keyframes hex-snap {
  0% { opacity: 0; transform: scale(0.2) rotate(-40deg); }
  56% { opacity: 0.42; transform: scale(1.14) rotate(4deg); }
  78% { opacity: 0.34; transform: scale(0.98) rotate(0deg); }
  100% { opacity: 0; transform: scale(1.02); }
}
@keyframes hex-snap-edge {
  0% { opacity: 0; transform: scale(0.2) rotate(-40deg); }
  30% { opacity: 1; transform: scale(1.18) rotate(6deg); }
  60% { opacity: 0.85; transform: scale(0.99) rotate(0deg); }
  100% { opacity: 0; transform: scale(1.02); }
}
.hx-shell { animation: shell-draw 0.72s ease-out calc(var(--d, 0s) + 0.2s) both; }
@keyframes shell-draw {
  0% { stroke-dashoffset: 1; opacity: 0; }
  16% { opacity: 1; }
  62% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}
.hx-glow { animation-delay: calc(var(--d, 0s) + 0.1s); }
.hx-sweep {
  transform-box: fill-box;
  transform-origin: center;
  filter: blur(4px);
  animation: sweep-across 0.62s cubic-bezier(0.4, 0, 0.3, 1) calc(var(--d, 0s) + 0.3s) both;
}
@keyframes sweep-across {
  0% { opacity: 0; transform: translateX(-16px) skewX(-16deg); }
  24% { opacity: 0.55; }
  100% { opacity: 0; transform: translateX(176px) skewX(-16deg); }
}

/* ---------- 雷霆审判 ---------- */
.tj-sky {
  transform-box: fill-box;
  transform-origin: 50% 0%;
  animation: sky-flicker 0.72s steps(4, end) var(--d, 0s) both;
}
@keyframes sky-flicker {
  0% { opacity: 0; }
  8% { opacity: 0.7; }
  18% { opacity: 0.15; }
  30% { opacity: 0.6; }
  46% { opacity: 0.2; }
  100% { opacity: 0; }
}
.tj-bolt { animation: bolt-strike 0.54s linear calc(var(--d, 0s) + var(--t) * 1s) both; }
.tj-bolt-halo { animation: bolt-strike 0.62s linear calc(var(--d, 0s) + var(--t) * 1s) both; }
@keyframes bolt-strike {
  0% { stroke-dashoffset: 1; opacity: 0; }
  7% { stroke-dashoffset: 0; opacity: 1; }
  16% { opacity: 0.3; }
  26% { opacity: 1; }
  40% { opacity: 0.45; }
  54% { opacity: 0.95; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}
.tj-ring {
  transform-box: fill-box;
  transform-origin: center;
  animation: ring-flat 0.52s ease-out calc(var(--d, 0s) + var(--t) * 1s) both;
}
@keyframes ring-flat {
  0% { opacity: 0.95; transform: scale(0.3); }
  100% { opacity: 0; transform: scale(3.2); }
}
.tj-spark {
  transform-box: fill-box;
  transform-origin: center;
  animation: burst-out 0.44s ease-out calc(var(--d, 0s) + var(--t) * 1s) both;
}
.tj-flash { animation-delay: calc(var(--d, 0s) + 0.02s); }
</style>
