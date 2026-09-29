<script setup lang="ts">
/**
 * 关卡选择（REQ-UI 9.1：章节地图、关卡节点、通关标记；REQ-LEVEL-001 MVP 15 关）
 */
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { LEVELS, CHAPTER_NAMES } from '@/config/levels'
import { getEnemy } from '@/config/enemies'
import { ELEMENT_INFO } from '@/config/constants'
import type { ElementType, WaveEnemy } from '@/types'
import { iconUrl } from '@/utils/icons'

const store = useGameStore()

const chapters = computed(() => {
  const map = new Map<number, typeof LEVELS>()
  for (const lv of LEVELS) {
    if (!map.has(lv.chapter)) map.set(lv.chapter, [])
    map.get(lv.chapter)!.push(lv)
  }
  return [...map.entries()]
})

/** 关卡节点图标：按关卡类型映射（教学/普通/精英/Boss），锁定关使用锁形图标 */
const NODE_ICON: Record<string, string> = {
  boss: iconUrl('node_boss'),
  elite: iconUrl('node_elite'),
  tutorial: iconUrl('node_tutorial'),
  normal: iconUrl('node_normal')
}
const LOCK_ICON = iconUrl('ui_lock')
const CHECK_ICON = iconUrl('ui_check')
const BACK_ICON = iconUrl('ui_back')

function levelState(id: number): 'locked' | 'current' | 'cleared' {
  if (id < store.profile.unlockedLevel) return 'cleared'
  if (id === store.profile.unlockedLevel) return 'current'
  return 'locked'
}

function levelIcon(type: string): string {
  return NODE_ICON[type] ?? NODE_ICON.normal
}

/** 关卡预览：波次敌人名（含变体前缀，让玩家在进关前就知道会遇到什么） */
function waveNames(waves: WaveEnemy[]): string {
  return [
    ...new Set(
      waves.map((w) => (w.variant ? `${w.variant.namePrefix}·` : '') + getEnemy(w.enemyId).name)
    )
  ].join(' / ')
}

/**
 * 关卡预览：本关敌人的弱点元素集合（V2）。
 * 元素克制是进关前最重要的决策信息——看到"弱水"就换冰霜女巫主战，
 * 因此把它放到关卡节点上，而不是等进关后才发现。
 */
function weakElements(waves: WaveEnemy[]): ElementType[] {
  return [...new Set(waves.map((w) => getEnemy(w.enemyId).weak))]
}

function elementName(el: ElementType): string {
  return ELEMENT_INFO[el].name
}

/** 本章已通关数 */
function clearedInChapter(levels: typeof LEVELS): number {
  return levels.filter((lv) => lv.id < store.profile.unlockedLevel).length
}
</script>

<template>
  <div class="levels-view">
    <header class="page-header">
      <button class="back-btn" @click="store.setScreen('home')">
        <img :src="BACK_ICON" alt="返回" draggable="false" />
      </button>
      <span class="page-title font-title">征程地图</span>
      <span class="header-space"></span>
    </header>

    <div class="levels-content">
      <section v-for="[chapter, levels] in chapters" :key="chapter" class="chapter">
        <h2 class="chapter-title font-title">
          {{ CHAPTER_NAMES[chapter] }}
          <span class="chapter-progress">
            {{ clearedInChapter(levels) }}/{{ levels.length }}
          </span>
        </h2>
        <div class="level-grid">
          <button
            v-for="lv in levels"
            :key="lv.id"
            class="level-node panel"
            :class="[`state-${levelState(lv.id)}`, `type-${lv.type}`]"
            :disabled="levelState(lv.id) === 'locked'"
            @click="store.startLevel(lv.id)"
          >
            <img
              class="node-icon"
              :src="levelState(lv.id) === 'locked' ? LOCK_ICON : levelIcon(lv.type)"
              :alt="lv.name"
              draggable="false"
            />
            <span class="node-id">{{ lv.indexInChapter }}</span>
            <span class="node-name">{{ lv.name }}</span>
            <span v-if="levelState(lv.id) === 'cleared'" class="node-clear">
              <img :src="CHECK_ICON" alt="" aria-hidden="true" draggable="false" />已通关
            </span>
            <span v-else-if="levelState(lv.id) === 'current'" class="node-current">▶ 当前</span>
            <span v-else class="node-enemy">{{ waveNames(lv.waves) || '教学' }}</span>
            <!-- V2：本关敌人弱点（进关前编队决策依据） -->
            <span v-if="lv.waves.length" class="node-weak">
              <b>弱点</b>
              <img
                v-for="el in weakElements(lv.waves)"
                :key="el"
                class="nw-icon"
                :src="iconUrl(ELEMENT_INFO[el].iconId)"
                :alt="elementName(el)"
                draggable="false"
              />
            </span>
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
  background-color: var(--bg-panel);
  background-image: var(--sheen-top);
  color: #f5f0e6;
  font-size: 16px;
  cursor: pointer;
  box-shadow: var(--hi-top), var(--hi-bottom);
}
.back-btn img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}
.page-title {
  font-size: 19px;
  color: var(--gold-light);
  letter-spacing: 4px;
  text-shadow: 0 0 14px rgba(212, 175, 55, 0.4);
}
.header-space { width: 36px; }

.levels-content {
  flex: 1;
  overflow-y: auto;
  padding: 6px 14px 24px;
}

.chapter { margin-bottom: 18px; }
.chapter-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: var(--gold);
  letter-spacing: 3px;
  margin: 10px 0;
  border-left: 3px solid var(--gold);
  padding-left: 10px;
}
.chapter-progress {
  font-size: 10px;
  letter-spacing: 0;
  color: rgba(245, 240, 230, 0.5);
  border: 1px solid var(--hairline-gold);
  border-radius: 999px;
  padding: 1px 7px;
  background: rgba(212, 175, 55, 0.06);
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
  overflow: hidden;
}
.level-node:active { transform: scale(0.95); }

/* 已通关：整块降饱和 + 顶部一道绿色进度线，与"当前/未解锁"一眼区分 */
.state-cleared { border-color: rgba(125, 237, 178, 0.28); }
.state-cleared::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(125, 237, 178, 0.75), transparent);
}
.state-cleared .node-icon { filter: saturate(0.65) brightness(0.92); }
.state-cleared .node-name { color: rgba(240, 232, 214, 0.8); }

/* 精英关：冷色描边，与普通关区分（叠加式背景，保留面板底色与顶光） */
.type-elite {
  border-color: rgba(150, 200, 255, 0.42);
  background-image:
    linear-gradient(180deg, rgba(120, 190, 255, 0.12), rgba(120, 190, 255, 0.02)),
    var(--sheen-top);
}

.node-icon {
  width: 34px;
  height: 34px;
  object-fit: contain;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.55));
}
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
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  color: #7dedb2;
}
.node-clear img {
  width: 11px;
  height: 11px;
  object-fit: contain;
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

/* V2：弱点元素条（元素克制是进关前最重要的决策信息） */
.node-weak {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-top: 1px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 176, 97, 0.32);
}
.node-weak b {
  font-size: 8.5px;
  font-weight: 700;
  color: rgba(255, 176, 97, 0.9);
}
.nw-icon {
  width: 12px;
  height: 12px;
  object-fit: contain;
  filter: drop-shadow(0 0 3px rgba(255, 176, 97, 0.55));
}

.state-locked {
  opacity: 0.5;
  cursor: not-allowed;
}
/* 锁形图标收小降灰：它是状态标记而非卡片主视觉 */
.state-locked .node-icon {
  width: 26px;
  height: 26px;
  filter: grayscale(0.55) brightness(0.85) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}
.state-current {
  border-color: var(--gold);
  background-image:
    radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.16), transparent 62%),
    var(--sheen-top);
  box-shadow: var(--hi-top), 0 0 14px rgba(212, 175, 55, 0.35);
}
.type-boss {
  grid-column: span 3;
  flex-direction: row;
  gap: 12px;
  padding: 14px;
  background-image:
    linear-gradient(90deg, rgba(255, 90, 60, 0.12), rgba(255, 90, 60, 0.03)),
    var(--sheen-top);
  border-color: rgba(255, 90, 60, 0.45);
}
.type-boss .node-name { font-size: 15px; }
</style>
