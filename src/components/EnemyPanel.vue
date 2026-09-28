<script setup lang="ts">
/**
 * 敌人面板：头像/HP（多阶段分段）/行动倒计时/状态图标/行动预警/教程提示
 * REQ-ENEMY-001：倒计时常显，≤1 高亮警告
 * REQ-FEEL-005：行动前 0.5 秒预警动画
 * UI 层次：敌方信息为单一信息簇，教程提示内联于此，避免新增边框行挤压棋盘
 */
import { computed, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { TUTORIAL_MATCH_TARGET } from '@/config/constants'
import { iconUrl } from '@/utils/icons'

const store = useGameStore()
const enemy = () => store.battle.enemy

/** 状态与目标图标（256×256 透明 PNG） */
const ICON = {
  freeze: iconUrl('status_freeze'),
  stun: iconUrl('status_stun'),
  burn: iconUrl('status_burn'),
  poison: iconUrl('status_poison'),
  target: iconUrl('ui_target')
} as const

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
  // 蓄力中：直接告诉玩家"要放大招了"，配合进度条形成抢输出的压力
  if (e.charging) return `蓄力中 ·「${e.charging.release}」${e.charging.damage} 点伤害`
  const action = e.pattern && e.pattern.length > 0
    ? e.pattern[e.patternIndex % e.pattern.length]
    : null
  if (action) {
    switch (action.kind) {
      case 'attack':
        return `${action.name}（${e.attack} 点伤害）`
      case 'freezeBoard':
        return `${action.name}（冻结 ${action.size}×${action.size}${action.damage ? ` + ${action.damage} 伤害` : ''}）`
      case 'poison':
        return `${action.name}（${action.damage} 伤害 + 中毒）`
      case 'burn':
        return `${action.name}（${action.damage} 伤害 + 灼烧）`
      case 'charge':
        return `${action.name}（蓄力，${action.interrupt} 伤害可打断）`
      case 'drain':
        return `${action.name}（${action.damage} 伤害并回血）`
    }
  }
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

/** 蓄力进度（已承受伤害 / 打断阈值），驱动进度条宽度 */
function chargeRatio(): number {
  const c = enemy()?.charging
  if (!c || c.interrupt <= 0) return 0
  return Math.max(0, Math.min(1, c.taken / c.interrupt))
}

/** 是否多阶段 Boss（用于整体强化样式） */
function isBoss(): boolean {
  const e = enemy()
  return !!e && e.phaseHP.length > 1
}

/**
 * 该敌人是否可能蓄力。
 * 用于**预留**蓄力行的位置：蓄力条出现/消失不再改变面板高度，
 * 否则面板一撑高就会把棋盘顶下去（与提示区同类问题）。
 */
function canCharge(): boolean {
  const e = enemy()
  if (!e) return false
  return !!e.charging || e.pattern.some((a) => a.kind === 'charge')
}

/**
 * 变体主题色：注入 --tint 自定义属性，让头像边框与敌人名字按变体着色。
 * 玩家不用读名字也能一眼分辨「狂暴（红）/ 巨化（紫）/ 迅捷（青）/ 精英（金）」。
 */
const tintStyle = computed<Record<string, string> | undefined>(() => {
  const t = enemy()?.tint
  return t ? { '--tint': t } : undefined
})

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
  <div
    class="enemy-panel panel"
    :class="{ 'enemy-warning': warning, 'enemy-boss': isBoss(), 'enemy-charging': !!enemy()?.charging }"
    :style="tintStyle"
  >
    <template v-if="enemy()">
      <div class="enemy-avatar" :class="{ 'enemy-frozen': enemy()!.frozen > 0 }">
        <img class="enemy-icon" :src="iconUrl(enemy()!.iconId)" :alt="enemy()!.display" draggable="false" />
        <span v-if="enemy()!.frozen > 0" class="frozen-badge">
          <img :src="ICON.freeze" alt="" aria-hidden="true" draggable="false" />冻结 {{ enemy()!.frozen }}
        </span>
        <span v-if="enemy()!.stunned > 0" class="stun-badge">
          <img :src="ICON.stun" alt="" aria-hidden="true" draggable="false" />眩晕 {{ enemy()!.stunned }}
        </span>
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
          <span class="hp-text num">{{ Math.max(0, enemy()!.hp) }}/{{ enemy()!.phaseMaxHp }}</span>
        </div>
        <div class="enemy-status-row">
          <span v-if="enemy()!.burn" class="status-badge burn">
            <img :src="ICON.burn" alt="" aria-hidden="true" draggable="false" />燃烧 {{ enemy()!.burn?.turns }}
          </span>
          <span v-if="enemy()!.poison" class="status-badge poison">
            <img :src="ICON.poison" alt="" aria-hidden="true" draggable="false" />中毒 {{ enemy()!.poison?.turns }}
          </span>
        </div>
        <!-- 蓄力：Boss 正在憋大招，抢输出打断是唯一解（5.4 蓄力—打断机制）
             外层容器常驻（对会蓄力的敌人），保证蓄力条出现时不撑高面板 -->
        <div v-if="canCharge()" class="charge-row">
          <template v-if="enemy()!.charging">
            <span class="charge-tag">蓄力</span>
            <div class="charge-track">
              <div class="charge-fill" :style="{ width: `${chargeRatio() * 100}%` }"></div>
            </div>
            <span class="charge-text num">
              打断 {{ Math.min(enemy()!.charging!.taken, enemy()!.charging!.interrupt) }}/{{ enemy()!.charging!.interrupt }}
            </span>
          </template>
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
        <span class="countdown-num num">{{ enemy()!.countdown }}</span>
        <span class="countdown-label">行动</span>
      </div>
    </template>
    <template v-else>
      <!-- 教学 1-1：无敌人，显示目标进度（REQ-TUTO-002） -->
      <div class="tutorial-goal">
        <img class="goal-icon" :src="ICON.target" alt="" aria-hidden="true" draggable="false" />
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
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4);
  margin: 0 var(--sp-4);
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 8% 0%, rgba(255, 90, 60, 0.12), transparent 58%),
    var(--bg-panel);
}

/* 教程提示行已迁出本面板：提示统一由棋盘下方的独立提示区承载（TipBar），
   避免提示出现时撑高敌方面板、把棋盘顶下去（详见 TipBar.vue 注释） */
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
  border: 2px solid var(--tint, rgba(255, 90, 60, 0.55));
  box-shadow: 0 0 14px rgba(255, 90, 60, 0.28), inset 0 0 12px rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.enemy-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
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
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 1px 6px;
  white-space: nowrap;
}
.frozen-badge img,
.stun-badge img {
  width: 12px;
  height: 12px;
  object-fit: contain;
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
  color: var(--tint, #ffd9d0);
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
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  padding: 2px 7px 2px 3px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.status-badge img {
  width: 13px;
  height: 13px;
  object-fit: contain;
}
.status-badge.burn { color: #ff9d85; }
.status-badge.poison { color: #b58bff; }

/* ============================================================
 * 蓄力—打断（Boss 战核心张力，5.4）
 * 进度条 = 玩家已累计造成的打断伤害；填满即打断
 * ============================================================ */
.charge-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  /* 常驻预留高度：蓄力条出现时不改变面板高度，避免顶动棋盘 */
  min-height: 17px;
}
.charge-tag {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  color: #1a0c06;
  background: linear-gradient(180deg, #ffd98a, #f0a03c);
  border-radius: 6px;
  padding: 1px 6px;
  animation: charge-blink 0.7s ease-in-out infinite;
}
.charge-track {
  flex: 1;
  min-width: 0;
  height: 7px;
  border-radius: 4px;
  background: linear-gradient(180deg, #2c1a22, #170d13);
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}
.charge-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #ffb347, #ff5a3c);
  box-shadow: 0 0 8px rgba(255, 120, 60, 0.8);
  transition: width 0.28s ease;
}
.charge-text {
  flex-shrink: 0;
  font-size: 9.5px;
  color: #ffcf9a;
}
@keyframes charge-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 蓄力中：整个敌方面板转为危险色脉冲，提示"要放大招了" */
.enemy-charging {
  border-color: rgba(255, 160, 60, 0.85);
  animation: charge-pulse 0.9s ease-in-out infinite;
}
@keyframes charge-pulse {
  0%, 100% { box-shadow: inset 0 0 0 rgba(255, 140, 50, 0); }
  50% { box-shadow: inset 0 0 26px rgba(255, 140, 50, 0.22); }
}
.enemy-charging .countdown {
  background: conic-gradient(
    from -90deg,
    #ffb347 0deg,
    #ffb347 var(--cd),
    rgba(255, 255, 255, 0.08) var(--cd),
    rgba(255, 255, 255, 0.08) 360deg
  );
}
.enemy-charging .countdown-num {
  color: #ffc46b;
  text-shadow: 0 0 10px rgba(255, 170, 70, 0.9);
}

/* Boss：血条更厚、头像更大一圈，与普通怪拉开体量感 */
.enemy-boss .enemy-avatar {
  width: 66px;
  height: 66px;
  border-width: 3px;
}
.enemy-boss .enemy-name { font-size: 18px; }
.enemy-boss .hp-bar { height: 18px; }
.enemy-boss .hp-text { line-height: 18px; }

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
.goal-icon {
  width: 26px;
  height: 26px;
  object-fit: contain;
}
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
