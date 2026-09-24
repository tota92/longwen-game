<script setup lang="ts">
/**
 * 结算界面（REQ-LEVEL-005：失败重开按钮视觉最突出）
 * 展示：胜负、总伤害、最高连击、重开/下一关
 */
import { useGameStore } from '@/stores/game'

const store = useGameStore()
const victory = store.battle.result === 'victory'
const hasNext = store.battle.level ? store.battle.level.id < 15 : false
</script>

<template>
  <div class="result-mask" :class="victory ? 'win' : 'lose'">
    <div class="result-dialog">
      <div class="result-banner font-title">
        {{ victory ? '⚔️ 战 胜 ⚔️' : '💀 战 败 💀' }}
      </div>

      <div class="result-stats">
        <div class="stat-item">
          <span class="stat-label">总伤害</span>
          <span class="stat-value">{{ store.battle.totalDamage }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">最高连击</span>
          <span class="stat-value">{{ store.battle.maxComboInBattle }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">回合数</span>
          <span class="stat-value">{{ store.battle.turnCount }}</span>
        </div>
      </div>

      <p v-if="!victory" class="result-tip">差一点就赢了，再试一次！</p>

      <div class="result-actions">
        <!-- 重开按钮：视觉最突出（REQ-LEVEL-005 / G-05） -->
        <button v-if="!victory" class="btn btn-primary btn-big result-retry" @click="store.retryLevel()">
          ↻ 立即重开
        </button>
        <template v-else>
          <button v-if="hasNext" class="btn btn-primary btn-big" @click="store.nextLevel()">
            下一关 →
          </button>
          <button v-else class="btn btn-primary btn-big" @click="store.setScreen('levels')">
            通关！返回地图
          </button>
        </template>
        <button class="btn result-secondary" @click="store.setScreen('levels')">返回关卡</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-mask {
  position: absolute;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 3, 10, 0.85);
  backdrop-filter: blur(5px);
  animation: fade-in 0.3s ease;
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.result-dialog {
  width: min(86%, 360px);
  text-align: center;
  animation: dialog-in 0.4s cubic-bezier(0.2, 1.3, 0.5, 1);
}
@keyframes dialog-in {
  from { translate: 0 40px; scale: 0.9; opacity: 0; }
  to { translate: 0 0; scale: 1; opacity: 1; }
}

.result-banner {
  font-size: 34px;
  letter-spacing: 10px;
  margin-bottom: 18px;
}
.win .result-banner {
  color: var(--gold-light);
  text-shadow: 0 0 24px rgba(212, 175, 55, 0.8);
}
.lose .result-banner {
  color: #b9a8c9;
  text-shadow: 0 0 24px rgba(160, 107, 255, 0.5);
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 14px;
}
.stat-item {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-gold);
  border-radius: 12px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat-label { font-size: 11px; color: rgba(245, 240, 230, 0.6); }
.stat-value { font-size: 22px; font-weight: 800; color: var(--gold-light); }

.result-tip {
  font-size: 13px;
  color: #ff9d85;
  margin: 0 0 14px;
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.result-retry {
  width: 100%;
  font-size: 20px;
  letter-spacing: 4px;
  animation: retry-glow 1.2s ease-in-out infinite;
}
@keyframes retry-glow {
  0%, 100% { box-shadow: 0 4px 18px rgba(212, 175, 55, 0.35); }
  50% { box-shadow: 0 4px 30px rgba(212, 175, 55, 0.75); }
}

.result-secondary {
  width: 100%;
  font-size: 14px;
}
</style>
