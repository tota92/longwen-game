<script setup lang="ts">
/**
 * 提示浮层（覆盖在棋盘之上，不参与棋盘布局）
 *
 * 设计要点：
 * - 挂在 `.board-box`（边长 = 棋盘边长的方框）内做 absolute 定位：
 *   提示"悬浮"在棋盘下沿之上，从文档流里彻底摘除，
 *   因此出现/消失既不会挤压棋盘，也不会让棋盘移动一个像素。
 * - 提示本体 pointer-events:none，只有关闭按钮可点：
 *   即使压在宝石上，落子与滑动照旧穿透到棋盘，操作不被挡。
 * - 字号/内边距用 cqw（棋盘方框的 1% 边长）做 clamp：
 *   棋盘被窗口压小时提示同步缩小，不会盖满整个游玩区。
 * - 支持手动关闭；关闭后的重开入口**不在棋盘上**（会挡住底行宝石的落子），
 *   而是挂到顶栏的图标按钮（见 BattleView.vue），棋盘上不留任何常驻控件。
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
  </div>
</template>

<style scoped>
/*
 * 提示层：铺满棋盘方框，内容贴底居中 —— 也就是"悬浮在棋盘下沿之上"。
 * 整层 pointer-events:none，宝石的点击/滑动全部穿透过去。
 */
.tip-layer {
  position: absolute;
  inset: 0;
  z-index: 25;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  /* 内缩随棋盘缩放：小棋盘上不至于贴满边缘、盖住圆角与描金线 */
  padding: clamp(6px, 2.6cqw, 11px);
  pointer-events: none;
}

.tip-bar {
  display: flex;
  align-items: center;
  gap: clamp(5px, 2cqw, 8px);
  max-width: 100%;
  padding: clamp(5px, 2.1cqw, 8px) clamp(4px, 1.6cqw, 6px) clamp(5px, 2.1cqw, 8px)
    clamp(8px, 3.4cqw, 13px);
  border-radius: 12px;
  /* 浮在宝石之上：底色更深 + 背景模糊，压在棋格上依然读得清 */
  background: rgba(11, 8, 19, 0.9);
  backdrop-filter: blur(7px);
  border: 1px solid rgba(120, 190, 255, 0.34);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.55);
  /* 本体不拦截点击，保证棋盘下沿仍可操作 */
  pointer-events: none;
}

.tip-dot {
  flex-shrink: 0;
  width: clamp(6px, 1.9cqw, 8px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: #3ca7ff;
  box-shadow: 0 0 8px rgba(60, 167, 255, 0.8);
}

.tip-text {
  min-width: 0;
  font-size: clamp(11px, 3.3cqw, 13px);
  line-height: 1.45;
  color: #dce8ff;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tip-close {
  flex-shrink: 0;
  width: clamp(19px, 6cqw, 24px);
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(245, 240, 230, 0.7);
  cursor: pointer;
  /* 整层唯一的可点区域 */
  pointer-events: auto;
  transition: transform var(--dur-fast) var(--ease-out), color var(--dur-fast);
}
.tip-close:active { transform: scale(0.88); }
.tip-close:hover { color: #fff; }
.tip-close svg {
  width: 46%;
  height: 46%;
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
