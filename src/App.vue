<script setup lang="ts">
/**
 * 根组件：页面路由切换（screen 状态机）+ 全局反馈（震屏/闪白）
 *
 * 全局样式（设计令牌/基础布局/通用组件类/特效/横屏守卫）
 * 已归档至 src/assets/style/，由 main.ts 统一引入。
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
