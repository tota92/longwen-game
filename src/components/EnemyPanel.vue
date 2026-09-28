<script setup lang="ts">
/**
 * 敌人面板：头像/HP（多阶段分段）/行动倒计时/状态图标/行动预警
 * REQ-ENEMY-001：倒计时常显，≤1 高亮警告
 * REQ-FEEL-005：行动前 0.5 秒预警动画
 */
import { ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { TUTORIAL_MATCH_TARGET } from '@/config/constants'

const store = useGameStore()
const enemy = () => store.battle.enemy

/** 倒计时进度环：剩余回合 / 初始倒计时（0~1），驱动外环的 conic-gradient */
function cdRatio(): number {
  const e = enemy()
  if (!e || e.baseCountdown <= 0) return 0
  return Math.max(0, Math.min(1, e.countdown / e.baseCountdown))
}

/** 敌人下次行动的意图文案（REQ-UI：让玩家能预判敌人行为） */
function intentText(): string {
  const e = enemy()
  if (!e) return ''
  if (e.frozen > 0) return '被冰冻，倒计时暂停'
  if (e.stunned > 0) return '眩晕中，将跳过行动'
  switch (e.skill.type) {
    case 'freezeBoard':
      return `冻结棋盘 ${e.skill.size}×${e.skill.size} 区域（${e.skill.turns} 回合）`
    case 'poisonAttack':
      return `攻击 ${e.attack} 点并使你中毒`
    case 'phaseBlast':
      return '全屏吐息'
    default:
      return `攻击 ${e.attack} 点伤害`
  }
}

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
          <div class="hp-gloss" aria-hidden="true"></div>
          <div class="hp-ticks" aria-hidden="true"></div>
          <span class="hp-text">{{ Math.max(0, enemy()!.hp) }}/{{ enemy()!.phaseMaxHp }}</span>
        </div>
        <div class="enemy-status-row">
          <span v-if="enemy()!.burn" class="status-badge burn">🔥 燃烧 {{ enemy()!.burn?.turns }}</span>
          <span v-if="enemy()!.poison" class="status-badge poison">☠️ 中毒 {{ enemy()!.poison?.turns }}</span>
        </div>
        <!-- 行动意图：移动端没有 hover，直接写明敌人下次行动会做什么 -->
        <div class="enemy-intent">
          <span class="intent-tag">意图</span>
          <span class="intent-text">{{ intentText() }}</span>
        </div>
      </div>
      <div
        class="countdown"
        :class="{ danger: enemy()!.countdown <= 1 }"
        :style="{ '--cd': `${cdRatio() * 360}deg` }"
      >
        <span class="countdown-num">{{ enemy()!.countdown }}</span>
        <span class="countdown-label">行动</span>
      </div>
    </template>
    <template v-else>
      <!-- 教学 1-1：无敌人，显示目标进度（REQ-TUTO-002） -->
      <div class="tutorial-goal">
        <span class="goal-icon">🎯</span>
        <span class="goal-text font-title">训练目标 · 完成 {{ TUTORIAL_MATCH_TARGET }} 次消除</span>
        <span class="goal-progress">
          <span
            v-for="i in TUTORIAL_MATCH_TARGET"
            :key="i"
            class="goal-dot"
            :class="{ done: i <= store.battle.tutorialProgress }"
          ></span>
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.enemy-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin: 8px 10px 4px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 8% 0%, rgba(255, 90, 60, 0.12), transparent 58%),
    var(--bg-panel);
}
/* 顶部一道敌方色描边，强化"敌方区域"的语义 */
.enemy-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 90, 60, 0.7), transparent);
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
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 120, 90, 0.35), transparent 62%),
    radial-gradient(circle at 50% 60%, #3a2130, #1a1018);
  border: 2px solid rgba(255, 90, 60, 0.55);
  box-shadow: 0 0 14px rgba(255, 90, 60, 0.28), inset 0 0 12px rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.enemy-icon {
  font-size: 32px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
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
  height: 16px;
  background: linear-gradient(180deg, #2c1a22, #170d13);
  border-radius: 8px;
  margin-top: 6px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07);
}
.hp-fill {
  height: 100%;
  background: linear-gradient(180deg, #ff9070, #ec4a3d 55%, #b81f22);
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(236, 74, 61, 0.55);
  transition: width 0.35s ease;
}
/* 血条高光（上半部反光） */
.hp-gloss {
  position: absolute;
  inset: 1px 1px auto;
  height: 44%;
  border-radius: 8px 8px 6px 6px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0));
  pointer-events: none;
}
/* 每 25% 一道刻度，快速读出百分比 */
.hp-ticks {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent calc(25% - 1px),
    rgba(0, 0, 0, 0.35) calc(25% - 1px),
    rgba(0, 0, 0, 0.35) 25%
  );
  pointer-events: none;
}
.hp-text {
  position: absolute;
  inset: 0;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  color: #fff;
  font-weight: 600;
  letter-spacing: 1px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.enemy-status-row {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  min-height: 16px;
}

/* 行动意图 */
.enemy-intent {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  font-size: 10px;
  color: rgba(245, 240, 230, 0.62);
}
.intent-tag {
  flex-shrink: 0;
  font-size: 9px;
  color: #ffb199;
  border: 1px solid rgba(255, 177, 145, 0.4);
  border-radius: 6px;
  padding: 0 5px;
}
.intent-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.status-badge {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.status-badge.burn { color: #ff9d85; }
.status-badge.poison { color: #b58bff; }

/* 倒计时：≤1 高亮警告（REQ-ENEMY-001） */
.countdown {
  --cd: 360deg;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  /* 外环=倒计时进度，内圈=数字与标签 */
  background: conic-gradient(
    from -90deg,
    rgba(240, 216, 120, 0.9) 0deg,
    rgba(240, 216, 120, 0.9) var(--cd),
    rgba(255, 255, 255, 0.08) var(--cd),
    rgba(255, 255, 255, 0.08) 360deg
  );
  flex-shrink: 0;
}
.countdown::before {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 32%, #241a2e, #120c18);
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.7);
}
.countdown > * {
  position: relative;
  z-index: 1;
}
.countdown-num {
  font-size: 21px;
  font-weight: 800;
  color: var(--gold-light);
  line-height: 1;
  text-shadow: 0 0 8px rgba(240, 216, 120, 0.5);
}
.countdown-label {
  font-size: 9px;
  color: rgba(245, 240, 230, 0.6);
}
.countdown.danger {
  background: conic-gradient(
    from -90deg,
    #ff6a45 0deg,
    #ff6a45 var(--cd),
    rgba(255, 255, 255, 0.08) var(--cd),
    rgba(255, 255, 255, 0.08) 360deg
  );
  animation: cd-danger 0.6s ease-in-out infinite;
}
.countdown.danger .countdown-num {
  color: #ff7a59;
  text-shadow: 0 0 10px rgba(255, 90, 60, 0.9);
}
@keyframes cd-danger {
  0%, 100% { box-shadow: 0 0 0 rgba(255, 90, 60, 0); }
  50% { box-shadow: 0 0 18px rgba(255, 90, 60, 0.9); }
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
.goal-progress {
  display: flex;
  gap: 6px;
  margin-left: 4px;
}
.goal-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid rgba(240, 216, 120, 0.55);
  background: rgba(0, 0, 0, 0.35);
  transition: background 0.25s, box-shadow 0.25s, scale 0.25s;
}
.goal-dot.done {
  background: linear-gradient(180deg, #f5e3a3, #d4af37);
  border-color: #f0d878;
  box-shadow: 0 0 8px rgba(240, 216, 120, 0.9);
  scale: 1.15;
}
</style>
