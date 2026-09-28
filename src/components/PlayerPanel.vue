<script setup lang="ts">
/**
 * 玩家面板：主战英雄头像与元素 / HP 与护盾 / 遗物图标（最多 3 个）
 * REQ-HERO-003：支援被动在战斗开始时生效并 UI 可见
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { PLAYER_MAX_HP, ELEMENT_INFO } from '@/config/constants'

const store = useGameStore()
const { leader, supports } = storeToRefs(store)
const relicIcons = computed(() => store.battle.relics.map((id) => store.getRelicInfo(id)))
const leaderElement = computed(() => ELEMENT_INFO[leader.value.element])
</script>

<template>
  <div class="player-panel panel">
    <div class="hero-avatar" :style="{ borderColor: leader.color }">
      <span class="hero-icon">{{ leader.icon }}</span>
      <span class="hero-el" :style="{ background: leaderElement.color }">{{ leaderElement.name }}</span>
    </div>

    <div class="player-info">
      <div class="hero-name-row">
        <span class="hero-name font-title">{{ leader.name }}</span>
        <span class="support-icons">
          <span
            v-for="h in supports"
            :key="h.id"
            class="support-icon"
            :title="`${h.name}：${h.passiveDesc}`"
          >{{ h.icon }}</span>
        </span>
      </div>
      <!-- 护盾值显示在 HP 条上方（REQ-HERO-103） -->
      <div v-if="store.battle.playerShield > 0" class="shield-badge">
        🛡 护盾 {{ store.battle.playerShield }}
      </div>
      <div class="hp-bar">
        <div class="hp-fill" :style="{ width: `${(store.battle.playerHP / PLAYER_MAX_HP) * 100}%` }"></div>
        <div class="hp-gloss" aria-hidden="true"></div>
        <div class="hp-ticks" aria-hidden="true"></div>
        <span class="hp-text">{{ store.battle.playerHP }}/{{ PLAYER_MAX_HP }}</span>
      </div>
    </div>

    <!-- 遗物栏（REQ-RELIC-003：最多 3 个） -->
    <div class="relic-bar">
      <span
        v-for="r in relicIcons"
        :key="r.id"
        class="relic-icon"
        :title="`${r.name}：${r.desc}`"
      >{{ r.icon }}</span>
      <span v-for="i in 3 - relicIcons.length" :key="'empty' + i" class="relic-empty"></span>
    </div>
  </div>
</template>

<style scoped>
.player-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin: 4px 10px 10px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 8% 100%, rgba(60, 167, 255, 0.12), transparent 58%),
    var(--bg-panel);
}
/* 顶部一道己方色描边，与敌方面板呼应 */
.player-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(120, 190, 255, 0.6), transparent);
}

.hero-avatar {
  position: relative;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(140, 200, 255, 0.3), transparent 62%),
    radial-gradient(circle at 50% 60%, #26324a, #11161f);
  border: 2px solid;
  box-shadow: 0 0 14px rgba(90, 160, 240, 0.25), inset 0 0 12px rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hero-icon { font-size: 30px; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6)); }
.hero-el {
  position: absolute;
  bottom: -7px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: #14100a;
  font-weight: 700;
  border-radius: 9px;
  padding: 1px 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.player-info { flex: 1; min-width: 0; }
.hero-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hero-name { font-size: 16px; color: #dce8ff; }
.support-icons { display: flex; gap: 4px; }
.support-icon {
  font-size: 15px;
  opacity: 0.85;
  filter: drop-shadow(0 0 4px rgba(60, 167, 255, 0.4));
}

.hp-bar {
  position: relative;
  height: 16px;
  background: linear-gradient(180deg, #1e2735, #131a25);
  border-radius: 8px;
  margin-top: 6px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07);
}
.hp-fill {
  height: 100%;
  background: linear-gradient(180deg, #7ff0a8, #38c46e 55%, #1c8e4c);
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(56, 196, 110, 0.5);
  transition: width 0.35s ease;
}
.hp-gloss {
  position: absolute;
  inset: 1px 1px auto;
  height: 44%;
  border-radius: 8px 8px 6px 6px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0));
  pointer-events: none;
}
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

/* 护盾徽章：HP 条上方（REQ-HERO-103） */
.shield-badge {
  display: inline-block;
  margin-top: 3px;
  font-size: 10px;
  color: #9fd8ff;
  background: rgba(60, 167, 255, 0.12);
  border: 1px solid rgba(60, 167, 255, 0.4);
  border-radius: 8px;
  padding: 1px 8px;
  animation: shield-in 0.3s ease;
}
@keyframes shield-in {
  from { scale: 0.6; opacity: 0; }
  to { scale: 1; opacity: 1; }
}

.player-info { position: relative; }

.relic-bar {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.relic-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: radial-gradient(circle at 50% 20%, rgba(212, 175, 55, 0.22), rgba(0, 0, 0, 0.4));
  border: 1px solid rgba(212, 175, 55, 0.55);
  border-radius: 10px;
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.25);
  animation: relic-in 0.3s ease;
}
@keyframes relic-in {
  from { scale: 0.3; opacity: 0; }
  to { scale: 1; opacity: 1; }
}
.relic-empty {
  width: 36px;
  height: 36px;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
}
</style>
