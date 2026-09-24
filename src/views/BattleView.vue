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
  return `主战 ${el.icon}${el.name}：${el.name}属性宝石伤害 +20%`
})
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
        :board="battle.board"
        :can-interact="battle.canInteract && !battle.paused && battle.phase === 'fighting'"
        :hint="battle.hint"
        @swap="(a, b) => store.doSwap(a, b)"
        @tap-special="(p) => store.tapSpecial(p)"
      />
    </div>

    <!-- 主战提示 -->
    <div class="leader-hint">{{ leaderHint }}</div>

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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  min-height: 0;
}
.board-wrap :deep(.board) {
  width: min(90vw, 100%, 52dvh);
}
.board-wrap.shuffling {
  animation: shuffle-anim 0.45s ease-in-out infinite;
}
@keyframes shuffle-anim {
  0%, 100% { rotate: 0deg; }
  25% { rotate: 1.2deg; }
  75% { rotate: -1.2deg; }
}

.leader-hint {
  text-align: center;
  font-size: 10px;
  color: rgba(245, 240, 230, 0.45);
  margin-bottom: 2px;
}
</style>
