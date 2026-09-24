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
      <div class="hp-bar">
        <div class="hp-fill" :style="{ width: `${(store.battle.playerHP / PLAYER_MAX_HP) * 100}%` }"></div>
        <span class="hp-text">
          {{ store.battle.playerHP }}/{{ PLAYER_MAX_HP }}
          <span v-if="store.battle.playerShield > 0" class="shield-text">🛡{{ store.battle.playerShield }}</span>
        </span>
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
  padding: 10px 14px;
  margin: 4px 10px 10px;
}

.hero-avatar {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #33415c, #171e2c);
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hero-icon { font-size: 28px; }
.hero-el {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: #14100a;
  font-weight: 700;
  border-radius: 8px;
  padding: 0 7px;
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
  height: 14px;
  background: #26303f;
  border-radius: 7px;
  margin-top: 5px;
  overflow: hidden;
}
.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #57d98a, #2fa860);
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
.shield-text { color: #9fd8ff; margin-left: 4px; }

/* 护盾值显示在 HP 条上方（REQ-HERO-103） */
.player-info { position: relative; }

.relic-bar {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.relic-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border-gold);
  border-radius: 9px;
  animation: relic-in 0.3s ease;
}
@keyframes relic-in {
  from { scale: 0.3; opacity: 0; }
  to { scale: 1; opacity: 1; }
}
.relic-empty {
  width: 34px;
  height: 34px;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 9px;
}
</style>
