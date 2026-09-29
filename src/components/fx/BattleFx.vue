<script setup lang="ts">
/**
 * 战斗特效渲染壳：一条 HitFx = 一个 <svg>
 *
 * 职责只有三件：
 *  1. 给出统一画布（viewBox 0 0 300 300）与"攻击者在左、受击者在中央"的坐标约定；
 *  2. 按出手阵营整体镜像（英雄不镜像，怪物 scaleX(-1)），片段组件因此只需画一个朝向；
 *  3. 生成本实例专属的渐变（id 带 fx.id），多套特效同屏也不会互相串色。
 *
 * 具体的招式动画在 HeroFx.vue / EnemyFx.vue 里，由 fxFamily() 分派。
 *
 * 定位说明：svg 高度取角色槽位的 240%、底部下探 50%，正好让
 * viewBox 的 y=238 落在角色脚底、y=112 落在头顶 —— 片段组件就是按这套坐标画的。
 */
import { computed } from 'vue'
import type { HitFx } from '@/types'
import { fxFamily, type FxVariant } from '@/config/fxVariants'
import HeroFx from './HeroFx.vue'
import EnemyFx from './EnemyFx.vue'

const props = defineProps<{ fx: HitFx }>()

/** 未带变体时按 kind 兜底，保证任何一次结算都有画面 */
const FALLBACK: Record<HitFx['kind'], FxVariant> = {
  slash: 'slash_basic',
  skill: 'cross_slash',
  impact: 'heavy_impact',
  heal: 'heal_bloom',
  cast: 'arcane_cast'
}

const variant = computed<FxVariant>(() => props.fx.variant ?? FALLBACK[props.fx.kind])
const isHeroFx = computed(() => fxFamily(variant.value) === 'hero')

/** 出手方向：英雄在左往右打（不镜像），怪物在右往左打（整体镜像） */
const dir = computed(() => (props.fx.side === 'hero' ? '1' : '-1'))

/**
 * 命中同步延迟：等出手方真的冲到对面身前再起效。
 * cast / heal 落在施法者自己身上，没有"打到人"这一刻，因此不吃延迟。
 */
const delay = computed(() =>
  props.fx.kind === 'cast' || props.fx.kind === 'heal' ? '0s' : 'var(--fx-delay, 0.14s)'
)

const gradId = (name: string): string => `fx-${name}-${props.fx.id}`
</script>

<template>
  <svg
    class="fx-svg"
    viewBox="0 0 300 300"
    :data-fx="variant"
    :style="{ color: fx.color, '--dir': dir, '--d': delay }"
    aria-hidden="true"
  >
    <defs>
      <!-- 径向光核：白芯 → 元素色 → 透明，是所有爆点/光球的底 -->
      <radialGradient :id="gradId('rad')" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff" stop-opacity=".95" />
        <stop offset="26%" stop-color="currentColor" stop-opacity=".85" />
        <stop offset="60%" stop-color="currentColor" stop-opacity=".38" />
        <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
      </radialGradient>
      <!-- 纵向光柱：中间一道白芯，两端化开 -->
      <linearGradient :id="gradId('beam')" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="currentColor" stop-opacity="0" />
        <stop offset="24%" stop-color="currentColor" stop-opacity=".7" />
        <stop offset="50%" stop-color="#fff" stop-opacity=".95" />
        <stop offset="76%" stop-color="currentColor" stop-opacity=".7" />
        <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
      </linearGradient>
      <!-- 横向衰减：吐息/光束从出口往目标方向淡出 -->
      <linearGradient :id="gradId('fadeh')" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="currentColor" stop-opacity=".95" />
        <stop offset="46%" stop-color="currentColor" stop-opacity=".5" />
        <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
      </linearGradient>
    </defs>

    <HeroFx v-if="isHeroFx" :variant="variant" :uid="fx.id" />
    <EnemyFx v-else :variant="variant" :uid="fx.id" />
  </svg>
</template>

<style scoped>
.fx-svg {
  position: absolute;
  left: 50%;
  bottom: -50%;
  height: 240%;
  width: auto;
  aspect-ratio: 1 / 1;
  /* translateX 归中，scaleX 负责镜像：两者同属 transform，一次算清 */
  transform: translateX(-50%) scaleX(var(--dir, 1));
  overflow: visible;
  pointer-events: none;
  /* 加色混合：特效只会给画面"添光"，压住立绘时也不会糊成一块脏色 */
  mix-blend-mode: screen;
  z-index: 4;
}
</style>
