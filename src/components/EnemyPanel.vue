<script setup lang="ts">
/**
 * 敌人面板：头像/HP（多阶段分段）/行动倒计时/状态图标/行动预警
 * REQ-ENEMY-001：倒计时常显，≤1 高亮警告
 * REQ-FEEL-005：行动前 0.5 秒预警动画
 */
import { ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'

const store = useGameStore()
const enemy = () => store.battle.enemy

const warning = ref(false)
let timer = 0
watch(
  () => store.enemyWarn,
  () => {
    if (!enemy()) return
    warning.value = true
    clearTimeout(timer)
    timer = window.setTimeout(() => (warning.value = false), 520)
  }
)
</script>

<template>
  <div class="enemy-panel panel" :class="{ 'enemy-warning': warning }">
    <template v-if="enemy()">
      <div class="enemy-avatar" :class="{ 'enemy-frozen': enemy()!.frozen > 0 }">
        <span class="enemy-icon">{{ enemy()!.icon }}</span>
        <span v-if="enemy()!.frozen > 0" class="frozen-badge">❄ 冻结{{ enemy()!.frozen }}</span>
        <span v-if="enemy()!.stunned > 0" class="stun-badge">💫 眩晕{{ enemy()!.stunned }}</span>
      </div>
      <div class="enemy-info">
        <div class="enemy-name-row">
          <span class="enemy-name font-title">{{ enemy()!.display }}</span>
          <span class="enemy-phase" v-if="enemy()!.phaseHP.length > 1">阶段 {{ enemy()!.phase }}/{{ enemy()!.phaseHP.length }}</span>
        </div>
        <div class="hp-bar">
          <div class="hp-fill" :style="{ width: `${Math.max(0, (enemy()!.hp / enemy()!.phaseMaxHp) * 100)}%` }"></div>
          <span class="hp-text">{{ Math.max(0, enemy()!.hp) }}/{{ enemy()!.phaseMaxHp }}</span>
        </div>
        <div class="enemy-status-row">
          <span v-if="enemy()!.burn" class="status-badge burn">🔥 燃烧 {{ enemy()!.burn?.turns }}</span>
          <span v-if="enemy()!.poison" class="status-badge poison">☠️ 中毒 {{ enemy()!.poison?.turns }}</span>
        </div>
      </div>
      <div class="countdown" :class="{ danger: enemy()!.countdown <= 1 }">
        <span class="countdown-num">{{ enemy()!.countdown }}</span>
        <span class="countdown-label">行动</span>
      </div>
    </template>
    <template v-else>
      <!-- 教学 1-1：无敌人，显示目标进度（REQ-TUTO-002） -->
      <div class="tutorial-goal">
        <span class="goal-icon">🎯</span>
        <span class="goal-text font-title">训练：完成 3 次消除</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.enemy-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin: 8px 10px 4px;
}

/* 行动预警：面板泛红脉冲 */
.enemy-warning {
  animation: warn-pulse 0.5s ease-in-out;
  border-color: rgba(255, 90, 60, 0.9);
}
@keyframes warn-pulse {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 22px rgba(255, 90, 60, 0.75); }
}

.enemy-avatar {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #4a2c3a, #241522);
  border: 2px solid rgba(255, 90, 60, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.enemy-icon {
  font-size: 30px;
}
.enemy-frozen {
  filter: grayscale(0.5) brightness(1.2);
  border-color: rgba(160, 220, 255, 0.8);
}
.frozen-badge,
.stun-badge {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 1px 6px;
  white-space: nowrap;
}

.enemy-info {
  flex: 1;
  min-width: 0;
}
.enemy-name-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.enemy-name {
  font-size: 17px;
  color: #ffd9d0;
}
.enemy-phase {
  font-size: 11px;
  color: var(--gold);
  border: 1px solid var(--border-gold);
  border-radius: 8px;
  padding: 0 6px;
}

.hp-bar {
  position: relative;
  height: 14px;
  background: var(--hp-back);
  border-radius: 7px;
  margin-top: 5px;
  overflow: hidden;
}
.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff7a59, var(--hp));
  border-radius: 7px;
  transition: width 0.35s ease;
}
.hp-text {
  position: absolute;
  inset: 0;
  font-size: 10px;
  line-height: 14px;
  text-align: center;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.enemy-status-row {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  min-height: 16px;
}
.status-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.45);
}
.status-badge.burn { color: #ff9d85; }
.status-badge.poison { color: #b58bff; }

/* 倒计时：≤1 高亮警告（REQ-ENEMY-001） */
.countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--border-gold);
  background: rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
}
.countdown-num {
  font-size: 20px;
  font-weight: 800;
  color: var(--gold-light);
  line-height: 1;
}
.countdown-label {
  font-size: 9px;
  color: rgba(245, 240, 230, 0.6);
}
.countdown.danger {
  border-color: #ff5a3c;
  animation: cd-danger 0.6s ease-in-out infinite;
}
.countdown.danger .countdown-num {
  color: #ff7a59;
}
@keyframes cd-danger {
  0%, 100% { box-shadow: 0 0 0 rgba(255, 90, 60, 0); }
  50% { box-shadow: 0 0 16px rgba(255, 90, 60, 0.9); }
}

.tutorial-goal {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 6px 0;
}
.goal-icon { font-size: 24px; }
.goal-text { font-size: 16px; color: var(--gold-light); }
</style>
