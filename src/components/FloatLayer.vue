<script setup lang="ts">
/**
 * 浮动层：伤害/治疗飘字 + 连击数展示
 * REQ-DAMAGE-006：伤害飘字，暴击/技能伤害更大字号；飘字不遮挡棋盘操作区域
 * REQ-FEEL-001：连击数字逐级放大
 *
 * 位置约定：飘字贴着自己的阵营显示——伤害/技能落在敌方区（顶部），
 * 治疗落在己方区（底部），不再压在棋盘格子上。
 * 系统提示类文案已迁出本层，统一由棋盘下方的独立提示区承载（TipBar.vue）。
 */
import { useGameStore } from '@/stores/game'

const store = useGameStore()
</script>

<template>
  <div class="float-layer">
    <!-- 飘字 -->
    <div
      v-for="ft in store.floatTexts"
      :key="ft.id"
      class="float-text"
      :class="`ft-${ft.kind}`"
      :style="{ '--fx': `${ft.x}%`, '--fy': `${ft.y}%` }"
    >
      {{ ft.text }}
    </div>

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

/* 飘字动画：上浮 + 淡出 */
.float-text {
  position: absolute;
  left: var(--fx);
  top: var(--fy);
  transform: translate(-50%, 0);
  font-weight: 800;
  white-space: nowrap;
  animation: float-up 0.9s ease-out forwards;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.85);
}
@keyframes float-up {
  0% { opacity: 0; translate: 0 14px; scale: 0.7; }
  18% { opacity: 1; scale: 1.15; }
  30% { scale: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; translate: 0 -34px; }
}

/* ============================================================
 * 宽屏（≥860px）：信息栏在右列，飘字跟随自己的面板走，
 * 不再落在左列的棋盘上（与 BattleView 的双栏布局对齐）
 * ============================================================ */
@media (min-width: 860px) {
  .float-text { left: 78%; }
  .ft-damage,
  .ft-crit,
  .ft-skill { top: 24%; }
  .ft-heal { top: 74%; }
}

.ft-damage { color: #ffb199; font-size: 18px; }
.ft-crit { color: #ff7a59; font-size: 26px; }
.ft-skill { color: #ffe28a; font-size: 24px; }
.ft-heal { color: #7dedb2; font-size: 18px; }
/* 兜底：info 类文案现已统一改走提示区（TipBar），此处保留以防未来有代码直接推入 info 飘字 */
.ft-info { color: #cfe0ff; font-size: 13px; font-weight: 500; }

/* 连击展示（屏幕中央偏上） */
.combo-display {
  position: absolute;
  left: 50%;
  top: 30%;
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
