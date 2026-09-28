<script setup lang="ts">
/**
 * 战斗界面（REQ-UI 9.2 布局）：
 * 顶部=敌人区 / 中部=8×8 棋盘（占宽约 90%）/ 底部=英雄与遗物区
 * 左上=暂停按钮；浮动层=连击/飘字/技能特写；引导条（REQ-TUTORIAL 非弹窗教学）
 */
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import BoardGrid from '@/components/BoardGrid.vue'
import EnemyPanel from '@/components/EnemyPanel.vue'
import PlayerPanel from '@/components/PlayerPanel.vue'
import FloatLayer from '@/components/FloatLayer.vue'
import SkillCutIn from '@/components/SkillCutIn.vue'
import RelicSelect from '@/components/RelicSelect.vue'
import ResultOverlay from '@/components/ResultOverlay.vue'
import PauseOverlay from '@/components/PauseOverlay.vue'
import { ELEMENT_INFO } from '@/config/constants'

const store = useGameStore()
const battle = store.battle

const waveText = computed(() => {
  if (!battle.level || battle.level.waves.length <= 1) return null
  return `第 ${battle.waveIndex + 1}/${battle.level.waves.length} 波`
})

const leaderHint = computed(() => {
  const el = ELEMENT_INFO[store.leader.element]
  return `主战${el.name}属性宝石 +20%`
})

/** 局内遗物列表（移动端无 hover，用文字标签直接展示名称） */
const relics = computed(() => store.battle.relics.map((id) => store.getRelicInfo(id)))
</script>

<template>
  <div class="battle-view">
    <!-- 顶部条：暂停 + 关卡信息 -->
    <div class="battle-top">
      <button class="pause-btn" @click="battle.paused = true">⏸</button>
      <div class="level-info">
        <span class="level-name font-title">{{ battle.level?.name }}</span>
        <span v-if="waveText" class="wave-text">{{ waveText }}</span>
      </div>
      <div class="turn-text">回合 {{ battle.turnCount }}</div>
    </div>

    <!-- 敌人区 -->
    <EnemyPanel />

    <!-- 引导条（REQ-TUTO-001：无强制弹窗） -->
    <div v-if="store.guideText" class="guide-bar">
      <span class="guide-icon">💡</span>
      <span>{{ store.guideText }}</span>
    </div>

    <!-- 棋盘（中部，占宽 ~90%） -->
    <div class="board-wrap" :class="{ shuffling: battle.shuffling }">
      <BoardGrid
        v-if="battle.board"
        :key="battle.boardSeq"
        :board="battle.board"
        :can-interact="battle.canInteract && !battle.paused && battle.phase === 'fighting'"
        :hint="battle.hint"
        @swap="(a, b) => store.doSwap(a, b)"
        @tap-special="(p) => store.tapSpecial(p)"
      />
    </div>

    <!-- 增益条：主战元素加成 + 本局遗物（REQ-RELIC；移动端无 hover，直接显示名称） -->
    <div class="buff-strip">
      <span class="buff-chip leader-chip">
        <span class="buff-icon">{{ ELEMENT_INFO[store.leader.element].icon }}</span>
        {{ leaderHint }}
      </span>
      <span v-for="r in relics" :key="r.id" class="buff-chip relic-chip">
        <span class="buff-icon">{{ r.icon }}</span>
        {{ r.name }}
      </span>
      <span v-if="relics.length === 0" class="buff-chip empty-chip">击败敌人后可选遗物</span>
    </div>

    <!-- 玩家区 -->
    <PlayerPanel />

    <!-- 浮层 -->
    <FloatLayer />
    <SkillCutIn />

    <!-- 遗物三选一 -->
    <RelicSelect v-if="battle.phase === 'relicSelect'" />

    <!-- 结算 -->
    <ResultOverlay v-if="battle.phase === 'result'" />

    <!-- 暂停 -->
    <PauseOverlay v-if="battle.paused" />
  </div>
</template>

<style scoped>
.battle-view {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

.battle-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 0;
}

.pause-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border-gold);
  background: var(--bg-panel);
  color: #f5f0e6;
  font-size: 15px;
  cursor: pointer;
}
.pause-btn:active { transform: scale(0.92); }

.level-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.level-name {
  font-size: 16px;
  color: var(--gold-light);
  letter-spacing: 3px;
}
.wave-text {
  font-size: 11px;
  color: #ffb199;
  border: 1px solid rgba(255, 177, 145, 0.4);
  padding: 1px 7px;
  border-radius: 8px;
}
.turn-text {
  font-size: 11px;
  color: rgba(245, 240, 230, 0.55);
}

/* 引导条 */
.guide-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 10px;
  padding: 7px 12px;
  border-radius: 10px;
  background: rgba(60, 167, 255, 0.1);
  border: 1px solid rgba(60, 167, 255, 0.35);
  font-size: 12px;
  color: #bcd9ff;
  animation: guide-in 0.4s ease;
}
@keyframes guide-in {
  from { opacity: 0; translate: 0 -8px; }
  to { opacity: 1; translate: 0 0; }
}
.guide-icon { font-size: 14px; }

/* 棋盘容器：占宽约 90%（REQ-UI 9.2） */
.board-wrap {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 12px;
  min-height: 0;
  overflow: hidden; /* 让光晕止步于棋盘区域，不糊到敌人/玩家面板上 */
}
/* 棋盘光晕：填补竖屏上下留白，让棋盘像"悬浮在法阵上" */
.board-wrap::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(124%, 128vw);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgba(212, 175, 55, 0.17) 0%,
    rgba(212, 175, 55, 0.06) 38%,
    transparent 64%
  );
  pointer-events: none;
}
.board-wrap :deep(.board) {
  position: relative;
  width: min(94vw, 100%, 56dvh);
}
.board-wrap.shuffling {
  animation: shuffle-anim 0.45s ease-in-out infinite;
}
@keyframes shuffle-anim {
  0%, 100% { rotate: 0deg; }
  25% { rotate: 1.2deg; }
  75% { rotate: -1.2deg; }
}

/* 增益条：横向滚动，最多一行，避免撑高布局 */
.buff-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px 6px;
  overflow-x: auto;
  scrollbar-width: none;
}
.buff-strip::-webkit-scrollbar { display: none; }

.buff-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(245, 240, 230, 0.72);
  white-space: nowrap;
}
.buff-icon { font-size: 11px; }
.leader-chip {
  border-color: rgba(255, 150, 120, 0.35);
  color: #ffcbb8;
}
.relic-chip {
  border-color: rgba(212, 175, 55, 0.45);
  background: rgba(212, 175, 55, 0.1);
  color: var(--gold-light);
}
.relic-chip .buff-icon { filter: drop-shadow(0 0 4px rgba(212, 175, 55, 0.6)); }
.empty-chip {
  border-style: dashed;
  color: rgba(245, 240, 230, 0.35);
}
</style>
