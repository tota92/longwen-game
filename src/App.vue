<script setup lang="ts">
/**
 * 根组件：页面路由切换（screen 状态机）+ 全局反馈（震屏/闪白）
 */
import { computed, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import HomeView from '@/views/HomeView.vue'
import TeamView from '@/views/TeamView.vue'
import LevelSelectView from '@/views/LevelSelectView.vue'
import BattleView from '@/views/BattleView.vue'

const store = useGameStore()

const views = {
  home: HomeView,
  team: TeamView,
  levels: LevelSelectView,
  battle: BattleView
} as const

const currentView = computed(() => views[store.screen])

// 震屏（REQ-FEEL-001：连锁消除屏幕轻微震动）
const shaking = ref(false)
let shakeTimer = 0
watch(
  () => store.shakeScreen,
  () => {
    shaking.value = false
    requestAnimationFrame(() => {
      shaking.value = true
      clearTimeout(shakeTimer)
      shakeTimer = window.setTimeout(() => (shaking.value = false), 320)
    })
  }
)

// 闪白（阶段转换/受击强化反馈）
const flashing = ref(false)
let flashTimer = 0
watch(
  () => store.flashWhite,
  () => {
    flashing.value = false
    requestAnimationFrame(() => {
      flashing.value = true
      clearTimeout(flashTimer)
      flashTimer = window.setTimeout(() => (flashing.value = false), 300)
    })
  }
)
</script>

<template>
  <div class="app-root" :class="{ 'screen-shake': shaking }">
    <transition name="screen" mode="out-in">
      <component :is="currentView" :key="store.screen" />
    </transition>
    <div class="flash-white" :class="{ active: flashing }"></div>
  </div>
</template>

<style>
/* ===================== 全局样式 ===================== */
:root {
  --gold: #d4af37;
  --gold-light: #f0d878;
  --bg-deep: #0d0a17;
  --bg-panel: rgba(255, 255, 255, 0.06);
  --border-gold: rgba(212, 175, 55, 0.3);
  --hp: #e5484d;
  --hp-back: #3a2430;
  --fire: #ff5a3c;
  --water: #3ca7ff;
  --wood: #4cd964;
  --light-el: #ffd94c;
  --dark-el: #a06bff;
  --thunder: #ffe135;
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  background: var(--bg-deep);
  color: #f5f0e6;
  font-family:
    'PingFang SC',
    'Hiragino Sans GB',
    'Microsoft YaHei',
    system-ui,
    sans-serif;
  -webkit-font-smoothing: antialiased;
  user-select: none;
  overflow: hidden;
}

.app-root {
  position: relative;
  height: 100dvh;
  width: 100vw;
  max-width: 560px; /* 桌面预览限宽，移动端全屏 */
  margin: 0 auto;
  background:
    radial-gradient(ellipse at 50% -10%, rgba(212, 175, 55, 0.12), transparent 55%),
    radial-gradient(ellipse at 50% 110%, rgba(120, 60, 200, 0.1), transparent 50%),
    linear-gradient(180deg, #1a1025 0%, #0d0a17 100%);
  overflow: hidden;
}

/* 屏幕震动 */
@keyframes shake-anim {
  0%, 100% { transform: translate(0, 0); }
  20% { transform: translate(-4px, 2px); }
  40% { transform: translate(4px, -2px); }
  60% { transform: translate(-3px, -1px); }
  80% { transform: translate(3px, 1px); }
}
.screen-shake {
  animation: shake-anim 0.3s ease-in-out;
}

/* 闪白层 */
.flash-white {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: #fff;
  opacity: 0;
  transition: opacity 0.12s;
  z-index: 200;
}
.flash-white.active {
  opacity: 0.55;
}

/* 页面切换过渡 */
.screen-enter-active,
.screen-leave-active {
  transition: opacity 0.22s ease;
}
.screen-enter-from,
.screen-leave-to {
  opacity: 0;
}

/* 通用按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--border-gold);
  background: var(--bg-panel);
  color: #f5f0e6;
  border-radius: 12px;
  padding: 12px 22px;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.12s, filter 0.12s;
}
.btn:active {
  transform: scale(0.96);
  filter: brightness(1.15);
}
.btn-primary {
  background: linear-gradient(180deg, #e8c96a, #b8912c);
  color: #241a04;
  font-weight: 700;
  border-color: #f0d878;
  box-shadow: 0 4px 18px rgba(212, 175, 55, 0.35);
}
.btn-big {
  padding: 14px 30px;
  font-size: 18px;
}

/* 通用面板卡片 */
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-gold);
  border-radius: 14px;
  backdrop-filter: blur(6px);
}

/* 标题字体（古风） */
.font-title {
  font-family: 'STKaiti', 'KaiTi', 'Noto Serif SC', serif;
  letter-spacing: 2px;
}
</style>
