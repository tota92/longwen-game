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
    <div class="screen-host">
      <transition name="screen" mode="out-in">
        <component :is="currentView" :key="store.screen" />
      </transition>
    </div>
    <div class="flash-white" :class="{ active: flashing }"></div>

    <!--
      横屏守卫：本作按竖屏单手操作设计，手机横屏时可用高度不足以同时容纳
      展示区 + 棋盘 + 信息区（844×390 下棋盘会被压到几像素），
      与其展示一个残破的界面，不如明确提示玩家转回竖屏。
      纯 CSS 媒体查询触发，首帧即生效，不会闪一下再切。
    -->
    <div class="rotate-guard" role="alertdialog" aria-label="请竖屏游玩">
      <div class="rotate-card">
        <svg class="rotate-icon" viewBox="0 0 48 48" aria-hidden="true">
          <rect x="17" y="8" width="14" height="24" rx="3" />
          <path d="M23 11.5h2" />
          <path d="M11 30a13 13 0 0 0 3.6 8.2" />
          <path d="M9.4 26.6 11 30l3.6-1.2" />
        </svg>
        <p class="rotate-title font-title">请将设备旋转至竖屏</p>
        <p class="rotate-sub">横屏下棋盘会被压缩到无法操作，竖屏才能获得完整体验</p>
      </div>
    </div>
  </div>
</template>

<style>
/* ============================================================
 * 设计令牌（Design Tokens）
 * 全站唯一视觉事实来源：颜色 / 材质 / 间距 / 圆角 / 阴影 / 动效
 * 组件一律消费变量而非硬编码数值，保证系列一致性并可整体换肤
 * ============================================================ */
:root {
  /* ---- 色彩：金属与底色 ---- */
  --gold: #d4af37;
  --gold-light: #f0d878;
  --gold-deep: #8a6a1a;
  --bg-deep: #0d0a17;
  --bg-raise: #1a1025;
  /* 面板材质：半透明玻璃 + 金边（魔幻纹章语言） */
  --bg-panel: rgba(255, 255, 255, 0.06);
  --bg-panel-strong: rgba(18, 12, 30, 0.86);
  --border-gold: rgba(212, 175, 55, 0.3);
  --border-gold-strong: rgba(212, 175, 55, 0.55);

  /* ---- 色彩：文本层次 ---- */
  --text-1: #f5f0e6; /* 主文本 */
  --text-2: rgba(245, 240, 230, 0.72); /* 次要文本 */
  --text-3: rgba(245, 240, 230, 0.45); /* 辅助/标签 */

  /* ---- 色彩：状态语义（HP/护盾/危险） ---- */
  --hp: #e5484d;
  --hp-back: #3a2430;
  --hp-player: #2fa860;
  --shield: #68d8ff;
  --danger: #ff5a3c;

  /* ---- 间距节奏（4 的倍数，保证垂直韵律一致） ---- */
  --sp-1: 4px;
  --sp-2: 6px;
  --sp-3: 8px;
  --sp-4: 12px;
  --sp-5: 16px;
  --sp-6: 22px;

  /* ---- 圆角层级 ---- */
  --r-sm: 8px;
  --r-md: 10px;
  --r-lg: 14px;
  --r-xl: 18px;

  /* ---- 阴影/发光层级 ---- */
  --shadow-panel: 0 6px 20px rgba(0, 0, 0, 0.45);
  --shadow-raise: 0 10px 30px rgba(0, 0, 0, 0.55);
  --glow-gold: 0 0 16px rgba(212, 175, 55, 0.45);
  --glow-danger: 0 0 16px rgba(255, 90, 60, 0.75);

  /* ---- 动效时长（统一节奏，便于整体调优） ---- */
  --dur-fast: 0.15s;
  --dur-base: 0.28s;
  --dur-slow: 0.5s;
  --ease-out: cubic-bezier(0.33, 0.9, 0.5, 1);

  /* ---- 字体 ---- */
  --font-title: 'STKaiti', 'KaiTi', 'Noto Serif SC', serif;
  --font-body: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif;
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
  color: var(--text-1);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  user-select: none;
  overflow: hidden;
}

/* 数值一律等宽对齐：HP / 倒计时 / 伤害 / 回合数在跳动时不会左右抖动 */
.num {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}

.app-root {
  position: relative;
  height: 100dvh;
  width: 100vw;
  max-width: 560px; /* 移动优先：桌面窄栏预览 */
  margin: 0 auto;
  background:
    radial-gradient(ellipse at 50% -10%, rgba(212, 175, 55, 0.12), transparent 55%),
    radial-gradient(ellipse at 50% 110%, rgba(120, 60, 200, 0.1), transparent 50%),
    linear-gradient(180deg, var(--bg-raise) 0%, var(--bg-deep) 100%);
  overflow: hidden;
}

/* 宽屏（≥860px）：解除窄栏限制，交由各页面自行组织双栏布局 */
@media (min-width: 860px) {
  .app-root {
    max-width: none;
    background:
      radial-gradient(ellipse at 22% 0%, rgba(212, 175, 55, 0.13), transparent 46%),
      radial-gradient(ellipse at 84% 100%, rgba(120, 60, 200, 0.14), transparent 48%),
      linear-gradient(180deg, var(--bg-raise) 0%, var(--bg-deep) 100%);
  }
}

/* ============================================================
 * 动效无障碍：尊重系统"减弱动态效果"设置
 * 保留状态变化反馈（血量/伤害/胜负），关闭装饰性与循环动效
 * ============================================================ */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  /* 震屏属于强动效，直接关闭（改由闪白承担受击反馈） */
  .screen-shake {
    animation: none !important;
  }
}

/* 视图挂载层：包一层是为了让横屏守卫能用一条 display:none 关掉全部页面 */
.screen-host {
  height: 100%;
}

/* ============================================================
 * 横屏守卫
 * 手机横屏（高度不足 520px）时隐藏游戏本体，只显示旋转提示。
 * 用 CSS 媒体查询而非 JS 监听：首帧就是正确状态，不会闪。
 * ============================================================ */
.rotate-guard {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 300;
  align-items: center;
  justify-content: center;
  padding: var(--sp-6);
  background:
    radial-gradient(ellipse at 50% 30%, rgba(212, 175, 55, 0.1), transparent 60%),
    linear-gradient(180deg, var(--bg-raise) 0%, var(--bg-deep) 100%);
}
.rotate-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  max-width: 320px;
  text-align: center;
}
.rotate-icon {
  width: 64px;
  height: 64px;
  color: var(--gold-light);
  animation: rotate-hint 2.4s ease-in-out infinite;
}
.rotate-icon rect,
.rotate-icon path {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.rotate-title {
  margin: 0;
  font-size: 17px;
  letter-spacing: 2px;
  color: var(--gold-light);
}
.rotate-sub {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-2);
}
@keyframes rotate-hint {
  0%, 45% { rotate: 0deg; }
  60%, 100% { rotate: -90deg; }
}

@media (orientation: landscape) and (max-height: 520px) {
  .screen-host { display: none; }
  .rotate-guard { display: flex; }
}
@media (prefers-reduced-motion: reduce) {
  .rotate-icon { animation: none; }
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
  gap: var(--sp-2);
  border: 1px solid var(--border-gold);
  background: var(--bg-panel);
  color: var(--text-1);
  border-radius: var(--r-md);
  padding: var(--sp-4) var(--sp-6);
  font-size: 16px;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out), filter var(--dur-fast);
}
.btn:active {
  transform: scale(0.96);
  filter: brightness(1.15);
}
.btn-primary {
  background: linear-gradient(180deg, #e8c96a, #b8912c);
  color: #241a04;
  font-weight: 700;
  border-color: var(--gold-light);
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
  border-radius: var(--r-lg);
  backdrop-filter: blur(6px);
}

/* 标题字体（古风） */
.font-title {
  font-family: var(--font-title);
  letter-spacing: 2px;
}
</style>
