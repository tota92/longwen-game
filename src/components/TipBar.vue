<script setup lang="ts">
/**
 * 提示区（独立于棋盘之外，不参与文档流）
 *
 * 设计要点：
 * - 绝对定位于棋盘区底部：提示出现/消失不会改变任何面板尺寸，
 *   因此不会挤压棋盘。旧实现把教程提示塞在敌方面板的 flex 流里，
 *   提示一出现敌方面板就变高，棋盘被顶下去（小屏还会被 overflow 裁切）。
 * - 提示条本体 pointer-events:none，只有关闭按钮可点：
 *   即使在小屏上与棋盘下沿重叠，也不会挡住落子操作。
 * - 支持手动关闭；教程引导被关闭后保留一个「提示」胶囊可重新打开。
 * - 承载两类消息：教程引导（常驻）与系统提示（自动消失）。
 */
import { useGameStore } from '@/stores/game'

const store = useGameStore()
</script>

<template>
  <div class="tip-layer">
    <transition name="tip">
      <div
        v-if="store.activeTip"
        class="tip-bar"
        :class="`tip-${store.activeTip.kind}`"
        role="status"
      >
        <span class="tip-dot" aria-hidden="true"></span>
        <span class="tip-text">{{ store.activeTip.text }}</span>
        <button class="tip-close" type="button" aria-label="关闭提示" @click="store.dismissTip()">
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 3 L9 9 M9 3 L3 9" />
          </svg>
        </button>
      </div>
    </transition>

    <!-- 教程引导被手动关闭后，保留一个可重新打开的入口 -->
    <transition name="tip">
      <button
        v-if="!store.activeTip && store.hasHiddenGuide"
        class="tip-reopen"
        type="button"
        @click="store.reopenTip()"
      >
        <svg viewBox="0 0 14 14" aria-hidden="true">
          <path d="M5 5.2a2 2 0 1 1 2.7 1.9c-.6.25-.95.7-.95 1.3v.35" />
          <circle cx="6.75" cy="11.1" r="0.95" />
        </svg>
        提示
      </button>
    </transition>
  </div>
</template>

<style scoped>
/* 提示层：贴在棋盘区底部（棋盘居中时，这里通常是棋盘下方的留白，不会压到棋盘） */
.tip-layer {
  position: absolute;
  left: var(--sp-3);
  right: var(--sp-3);
  bottom: 6px;
  z-index: 25;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.tip-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  max-width: 100%;
  padding: 7px 6px 7px 12px;
  border-radius: 12px;
  background: rgba(14, 11, 22, 0.84);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(120, 190, 255, 0.34);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
  /* 本体不拦截点击，保证棋盘下沿仍可操作 */
  pointer-events: none;
}

.tip-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3ca7ff;
  box-shadow: 0 0 8px rgba(60, 167, 255, 0.8);
}

.tip-text {
  min-width: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #dce8ff;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tip-close {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(245, 240, 230, 0.7);
  cursor: pointer;
  pointer-events: auto;
  transition: transform var(--dur-fast) var(--ease-out), color var(--dur-fast);
}
.tip-close:active { transform: scale(0.88); }
.tip-close:hover { color: #fff; }
.tip-close svg {
  width: 11px;
  height: 11px;
}
.tip-close svg path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

/* 教程引导：蓝色（与操作提示同色系） */
.tip-tutorial { border-color: rgba(120, 190, 255, 0.34); }
.tip-tutorial .tip-dot { background: #3ca7ff; box-shadow: 0 0 8px rgba(60, 167, 255, 0.8); }

/* 系统提示：金色（与遗物/奖励同色系） */
.tip-system { border-color: rgba(212, 175, 55, 0.4); }
.tip-system .tip-dot { background: var(--gold); box-shadow: 0 0 8px rgba(212, 175, 55, 0.85); }
.tip-system .tip-text { color: #ffeec4; }

/* 被关闭后的重新打开入口 */
.tip-reopen {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  color: #bcd9ff;
  background: rgba(14, 11, 22, 0.8);
  border: 1px solid rgba(120, 190, 255, 0.32);
  backdrop-filter: blur(6px);
  cursor: pointer;
  pointer-events: auto;
  transition: transform var(--dur-fast) var(--ease-out);
}
.tip-reopen:active { transform: scale(0.94); }
.tip-reopen svg {
  width: 13px;
  height: 13px;
}
.tip-reopen svg path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
}
.tip-reopen svg circle { fill: currentColor; }

.tip-enter-active,
.tip-leave-active {
  transition: opacity 0.22s ease, translate 0.22s ease;
}
.tip-enter-from,
.tip-leave-to {
  opacity: 0;
  translate: 0 10px;
}
</style>
