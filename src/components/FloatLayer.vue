<script setup lang="ts">
/**
 * 连击展示层：只负责连击数字（REQ-FEEL-001：连击数字逐级放大）
 *
 * 伤害/治疗飘字已迁进战斗舞台（BattleStage.vue）——数字直接渲染在
 * 挨打/受益角色的头顶，不再依赖屏幕百分比坐标，宽屏双栏也不会飘错位置。
 * 系统提示类文案统一由覆盖在棋盘之上的提示浮层承载（TipBar.vue）。
 */
import { useGameStore } from '@/stores/game'

const store = useGameStore()
</script>

<template>
  <div class="float-layer">
    <!-- 连击数（REQ-FEEL-001：逐级放大） -->
    <transition name="combo">
      <div
        v-if="store.battle.combo >= 2"
        :key="store.battle.combo"
        class="combo-display"
        :style="{ fontSize: `${18 + Math.min(store.battle.combo, 6) * 6}px` }"
      >
        <span class="combo-num">{{ store.battle.combo }}</span>
        <span class="combo-label">连击!</span>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.float-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 30;
}

/* 连击展示（战斗舞台下方、棋盘上方） */
.combo-display {
  position: absolute;
  left: 50%;
  top: 26%;
  transform: translate(-50%, -50%);
  color: var(--gold-light);
  font-family: 'STKaiti', 'KaiTi', serif;
  text-shadow:
    0 0 12px rgba(240, 216, 120, 0.8),
    0 2px 8px rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: baseline;
  gap: 4px;
  animation: combo-pop 0.3s cubic-bezier(0.2, 1.6, 0.5, 1);
}
.combo-num { font-weight: 900; }
.combo-label { font-size: 16px; letter-spacing: 2px; }
@keyframes combo-pop {
  from { scale: 0.4; opacity: 0; }
  to { scale: 1; opacity: 1; }
}
.combo-enter-active { transition: opacity 0.15s; }
.combo-leave-active { transition: opacity 0.25s; }
.combo-enter-from, .combo-leave-to { opacity: 0; }
</style>