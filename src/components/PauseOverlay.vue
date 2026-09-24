<script setup lang="ts">
/**
 * 暂停浮层（REQ-BATTLE-006：战斗支持暂停与中断恢复）
 * 暂停期间阻止棋盘交互；进行中的结算流程会在恢复后继续
 */
import { useGameStore } from '@/stores/game'

const store = useGameStore()

function resume(): void {
  store.battle.paused = false
}
function retry(): void {
  store.battle.paused = false
  store.retryLevel()
}
function quit(): void {
  store.saveSnapshot() // 保留战斗快照，可从主界面继续
  store.battle.paused = false
  store.setScreen('levels')
}
</script>

<template>
  <div class="pause-mask">
    <div class="pause-dialog panel">
      <div class="pause-title font-title">游戏暂停</div>
      <button class="btn btn-primary" @click="resume">继续战斗</button>
      <button class="btn" @click="retry">重新开始</button>
      <button class="btn" @click="quit">退出（进度已保存）</button>
      <button class="btn btn-sound" @click="store.toggleSound()">
        {{ store.profile.settings.sound ? '🔊 音效：开' : '🔇 音效：关' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.pause-mask {
  position: absolute;
  inset: 0;
  z-index: 85;
  background: rgba(5, 3, 10, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pause-dialog {
  width: min(80%, 300px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px;
  text-align: center;
}

.pause-title {
  font-size: 22px;
  color: var(--gold-light);
  letter-spacing: 6px;
  margin-bottom: 6px;
}

.btn-sound { font-size: 13px; opacity: 0.85; }
</style>
