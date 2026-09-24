<script setup lang="ts">
/**
 * 关卡选择（REQ-UI 9.1：章节地图、关卡节点、通关标记；REQ-LEVEL-001 MVP 15 关）
 */
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { LEVELS, CHAPTER_NAMES } from '@/config/levels'
import { getEnemy } from '@/config/enemies'

const store = useGameStore()

const chapters = computed(() => {
  const map = new Map<number, typeof LEVELS>()
  for (const lv of LEVELS) {
    if (!map.has(lv.chapter)) map.set(lv.chapter, [])
    map.get(lv.chapter)!.push(lv)
  }
  return [...map.entries()]
})

function levelState(id: number): 'locked' | 'current' | 'cleared' {
  if (id < store.profile.unlockedLevel) return 'cleared'
  if (id === store.profile.unlockedLevel) return 'current'
  return 'locked'
}

function levelIcon(type: string): string {
  if (type === 'boss') return '🐲'
  if (type === 'elite') return '💠'
  if (type === 'tutorial') return '📘'
  return '⚔️'
}

/** 关卡预览：波次敌人名 */
function waveNames(waves: { enemyId: string }[]): string {
  return [...new Set(waves.map((w) => getEnemy(w.enemyId).name))].join(' / ')
}
</script>

<template>
  <div class="levels-view">
    <header class="page-header">
      <button class="back-btn" @click="store.setScreen('home')">←</button>
      <span class="page-title font-title">征程地图</span>
      <span class="header-space"></span>
    </header>

    <div class="levels-content">
      <section v-for="[chapter, levels] in chapters" :key="chapter" class="chapter">
        <h2 class="chapter-title font-title">{{ CHAPTER_NAMES[chapter] }}</h2>
        <div class="level-grid">
          <button
            v-for="lv in levels"
            :key="lv.id"
            class="level-node panel"
            :class="[`state-${levelState(lv.id)}`, `type-${lv.type}`]"
            :disabled="levelState(lv.id) === 'locked'"
            @click="store.startLevel(lv.id)"
          >
            <span class="node-icon">{{ levelState(lv.id) === 'locked' ? '🔒' : levelIcon(lv.type) }}</span>
            <span class="node-id">{{ lv.indexInChapter }}</span>
            <span class="node-name">{{ lv.name }}</span>
            <span v-if="levelState(lv.id) === 'cleared'" class="node-clear">✓ 已通关</span>
            <span v-else-if="levelState(lv.id) === 'current'" class="node-current">▶ 当前</span>
            <span v-else class="node-enemy">{{ waveNames(lv.waves) || '教学' }}</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.levels-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 6px;
}
.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border-gold);
  background: var(--bg-panel);
  color: #f5f0e6;
  font-size: 16px;
  cursor: pointer;
}
.page-title {
  font-size: 19px;
  color: var(--gold-light);
  letter-spacing: 4px;
}
.header-space { width: 36px; }

.levels-content {
  flex: 1;
  overflow-y: auto;
  padding: 6px 14px 24px;
}

.chapter { margin-bottom: 18px; }
.chapter-title {
  font-size: 15px;
  color: var(--gold);
  letter-spacing: 3px;
  margin: 10px 0;
  border-left: 3px solid var(--gold);
  padding-left: 10px;
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.level-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 12px 6px 10px;
  cursor: pointer;
  color: #f5f0e6;
  transition: transform 0.12s;
  position: relative;
}
.level-node:active { transform: scale(0.95); }

.node-icon { font-size: 22px; }
.node-id {
  position: absolute;
  top: 6px;
  left: 8px;
  font-size: 10px;
  color: rgba(245, 240, 230, 0.45);
}
.node-name {
  font-size: 13px;
  color: var(--gold-light);
}
.node-enemy {
  font-size: 9px;
  color: rgba(245, 240, 230, 0.4);
}
.node-clear {
  font-size: 9px;
  color: #7dedb2;
}
.node-current {
  font-size: 9px;
  color: #ffd94c;
  animation: current-blink 1.2s ease-in-out infinite;
}
@keyframes current-blink {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.state-locked {
  opacity: 0.45;
  cursor: not-allowed;
}
.state-current {
  border-color: var(--gold);
  box-shadow: 0 0 14px rgba(212, 175, 55, 0.35);
}
.type-boss {
  grid-column: span 3;
  flex-direction: row;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(90deg, rgba(255, 90, 60, 0.12), rgba(255, 90, 60, 0.03));
  border-color: rgba(255, 90, 60, 0.45);
}
.type-boss .node-name { font-size: 15px; }
</style>
