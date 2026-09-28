<script setup lang="ts">
/**
 * 战斗界面（REQ-UI 9.2 布局）
 *
 * UI 层次（关键战斗信息优先，游玩区最大化）：
 *   顶部  暂停 + 关卡名 + 回合数        —— 窄条，不抢占游玩区
 *   敌方  头像 / 血条 / 倒计时 / 意图 / 教程提示 —— 单一信息簇
 *   中部  8×8 棋盘                      —— 游玩区，占满可用宽度与剩余高度
 *   我方  英雄 / 血条护盾 / 元素加成 / 遗物 —— 单一信息簇
 * 窄屏单列纵向堆叠；宽屏（≥860px）转为「棋盘左 / 信息右」双栏
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
import TipBar from '@/components/TipBar.vue'
import { iconUrl } from '@/utils/icons'

const store = useGameStore()
const battle = store.battle

/** 界面图标：暂停 */
const pauseIcon = iconUrl('ui_pause')

const waveText = computed(() => {
  if (!battle.level || battle.level.waves.length <= 1) return null
  return `第 ${battle.waveIndex + 1}/${battle.level.waves.length} 波`
})
</script>

<template>
  <div class="battle-view">
    <!-- 顶部条：暂停 + 关卡信息（窄条，不占用游玩区） -->
    <div class="battle-top">
      <button class="pause-btn" @click="battle.paused = true" aria-label="暂停">
        <img :src="pauseIcon" alt="" aria-hidden="true" draggable="false" />
      </button>
      <div class="level-info">
        <span class="level-name font-title">{{ battle.level?.name }}</span>
        <span v-if="waveText" class="wave-text">{{ waveText }}</span>
      </div>
      <div class="turn-text num">回合 {{ battle.turnCount }}</div>
    </div>

    <!-- 敌方区 -->
    <EnemyPanel />

    <!-- 棋盘：战斗界面的游玩区，占满可用宽度与剩余高度 -->
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
      <!-- 提示区：绝对定位于棋盘区底部、不参与文档流，提示的出现/消失不会改变棋盘尺寸 -->
      <TipBar />
    </div>

    <!-- 我方区：主战增益与遗物名称内联在面板内（原独立增益条信息重复，已合并） -->
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
  /* 面板与棋盘之间的呼吸由 gap 统一控制，避免各处 margin 叠加出垂直死角 */
  gap: var(--sp-3);
}

.battle-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-3) var(--sp-4) 0;
  flex-shrink: 0;
}

.pause-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--r-md);
  border: 1px solid var(--border-gold);
  background: var(--bg-panel);
  color: var(--text-1);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}
.pause-btn:active { transform: scale(0.92); }
.pause-btn img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}

.level-info {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
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
  border-radius: var(--r-sm);
}
.turn-text {
  font-size: 11px;
  color: var(--text-3);
}

/* 棋盘容器：游玩区，占满可用宽度与剩余高度 */
.board-wrap {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--sp-3);
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
/* 棋盘边长 = 可用宽度（上限 94vw）与可用高度的较小值，保证在竖屏上尽可能大 */
.board-wrap :deep(.board) {
  position: relative;
  width: min(100%, 94vw, 58dvh);
}
.board-wrap.shuffling {
  animation: shuffle-anim 0.45s ease-in-out infinite;
}
@keyframes shuffle-anim {
  0%, 100% { rotate: 0deg; }
  25% { rotate: 1.2deg; }
  75% { rotate: -1.2deg; }
}

/* ============================================================
 * 宽屏（≥860px）：棋盘左 / 信息右 双栏
 * 游玩区保持方形且不受面板挤压，信息按"敌方在上、我方在下"纵向排列
 * ============================================================ */
@media (min-width: 860px) {
  .battle-view {
    display: grid;
    /* 左栏游玩区自适应，右栏信息固定宽度区间 */
    grid-template-columns: minmax(0, 1fr) clamp(340px, 30vw, 400px);
    grid-template-rows: auto minmax(0, 1fr) auto;
    /* 顶栏横跨整宽；右栏与棋盘同起止，形成上下框住棋盘的对位 */
    grid-template-areas:
      'top    top'
      'board  side-top'
      'board  side-bottom';
    gap: var(--sp-4) var(--sp-6);
    padding: var(--sp-4) var(--sp-6);
    max-width: 1180px;
    margin: 0 auto;
  }
  .battle-top {
    grid-area: top;
    padding: 0;
  }
  /* 棋盘锁定为正方形并按可用高度收敛，保证两侧信息不挤压游玩区 */
  .board-wrap {
    grid-area: board;
    padding: 0;
  }
  .board-wrap :deep(.board) {
    width: min(100%, calc(100dvh - 170px));
  }
  .battle-view > .enemy-panel {
    grid-area: side-top;
    align-self: start;
    margin: 0;
  }
  .battle-view > .player-panel {
    grid-area: side-bottom;
    align-self: end;
    margin: 0;
  }
}
</style>
