<script setup lang="ts">
/**
 * 玩家面板：主战英雄头像与元素 / HP 与护盾 / 已持有遗物
 * REQ-HERO-003：支援被动在战斗开始时生效并 UI 可见
 * REQ-HERO-103：护盾值显示在 HP 条上方（并入英雄名行，不额外占高）
 * REQ-UI 9.2：底部区含"已持有遗物图标（最多 3 个）"——以图标+名称胶囊呈现，
 *   移动端无 hover，名称直接可读；原独立增益条与此重复，已合并至此
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { PLAYER_MAX_HP, ELEMENT_INFO, MAX_RELICS } from '@/config/constants'
import { iconUrl } from '@/utils/icons'

const store = useGameStore()
const { leader, supports } = storeToRefs(store)
const relicIcons = computed(() => store.battle.relics.map((id) => store.getRelicInfo(id)))
const leaderElement = computed(() => ELEMENT_INFO[leader.value.element])
/** 护盾徽章图标（REQ-HERO-103） */
const shieldIcon = iconUrl('status_shield')
/** 玩家负面状态图标（Boss 施加的灼烧/中毒） */
const burnIcon = iconUrl('status_burn')
const poisonIcon = iconUrl('status_poison')
/** 生命告急（<30%）时面板进入警示态，与遗物「绝境反击」阈值一致 */
const lowHP = computed(() => store.battle.playerHP > 0 && store.battle.playerHP < PLAYER_MAX_HP * 0.3)
</script>

<template>
  <div class="player-panel panel" :class="{ 'player-low': lowHP }">
    <div class="player-main">
      <div class="hero-avatar" :style="{ borderColor: leader.color }">
        <img class="hero-icon" :src="iconUrl(leader.iconId)" :alt="leader.name" draggable="false" />
        <span class="hero-el" :style="{ background: leaderElement.color }">{{ leaderElement.name }}</span>
      </div>

      <div class="player-info">
        <div class="hero-name-row">
          <span class="hero-name font-title">{{ leader.name }}</span>
          <span class="support-icons">
            <img
              v-for="h in supports"
              :key="h.id"
              class="support-icon"
              :src="iconUrl(h.iconId)"
              :alt="h.name"
              :title="`${h.name}：${h.passiveDesc}`"
              draggable="false"
            />
          </span>
          <!-- 负面状态：Boss 施加的灼烧/中毒，回合结束扣血 -->
          <span v-if="store.battle.playerBurn" class="dot-badge burn">
            <img :src="burnIcon" alt="" aria-hidden="true" draggable="false" />灼烧 {{ store.battle.playerBurn.turns }}
          </span>
          <span v-if="store.battle.playerPoison" class="dot-badge poison">
            <img :src="poisonIcon" alt="" aria-hidden="true" draggable="false" />中毒 {{ store.battle.playerPoison.turns }}
          </span>
          <!-- 护盾值：位于 HP 条上方（REQ-HERO-103），并入本行以节省纵向空间 -->
          <span v-if="store.battle.playerShield > 0" class="shield-badge num">
            <img :src="shieldIcon" alt="" aria-hidden="true" draggable="false" />{{ store.battle.playerShield }}
          </span>
        </div>
        <div class="hp-bar">
          <div class="hp-fill" :style="{ width: `${(store.battle.playerHP / PLAYER_MAX_HP) * 100}%` }"></div>
          <div class="hp-gloss" aria-hidden="true"></div>
          <div class="hp-ticks" aria-hidden="true"></div>
          <span class="hp-text num">{{ store.battle.playerHP }}/{{ PLAYER_MAX_HP }}</span>
        </div>
      </div>
    </div>

    <!-- 增益与遗物：图标 + 名称胶囊，横向一行（超出可横滑，不撑高面板） -->
    <div class="buff-row">
      <span class="buff-chip leader-chip">
        <img
          class="buff-icon"
          :src="iconUrl(leaderElement.iconId)"
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        主战{{ leaderElement.name }}属性 +20%
      </span>
      <span v-for="r in relicIcons" :key="r.id" class="buff-chip relic-chip">
        <img class="buff-icon" :src="iconUrl(r.iconId)" alt="" aria-hidden="true" draggable="false" />
        {{ r.name }}
      </span>
      <span v-if="relicIcons.length === 0" class="buff-chip empty-chip">
        击败敌人后可选遗物（最多 {{ MAX_RELICS }} 个）
      </span>
    </div>
  </div>
</template>

<style scoped>
.player-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  margin: 0 var(--sp-4) var(--sp-4);
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

/* 主行：头像 + 英雄信息（HP/护盾） */
.player-main {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
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
.hero-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}
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
  gap: var(--sp-2);
}
.hero-name { font-size: 16px; color: #dce8ff; }
.support-icons { display: flex; gap: var(--sp-1); margin-left: auto; }
.support-icon {
  width: 19px;
  height: 19px;
  object-fit: contain;
  opacity: 0.9;
  filter: drop-shadow(0 0 4px rgba(60, 167, 255, 0.45));
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

/* 护盾徽章：与英雄名同行，仍位于 HP 条上方（REQ-HERO-103） */
.shield-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1;
  color: var(--shield);
  background: rgba(60, 167, 255, 0.12);
  border: 1px solid rgba(60, 167, 255, 0.4);
  border-radius: var(--r-sm);
  padding: 2px 6px 2px 3px;
  animation: shield-in var(--dur-base) var(--ease-out);
}
.shield-badge img {
  width: 13px;
  height: 13px;
  object-fit: contain;
}
@keyframes shield-in {
  from { scale: 0.6; opacity: 0; }
  to { scale: 1; opacity: 1; }
}

/* 玩家负面状态徽章（灼烧/中毒） */
.dot-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1;
  border-radius: var(--r-sm);
  padding: 2px 6px 2px 3px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.dot-badge img {
  width: 13px;
  height: 13px;
  object-fit: contain;
}
.dot-badge.burn { color: #ff9d85; border-color: rgba(255, 120, 80, 0.45); }
.dot-badge.poison { color: #b58bff; border-color: rgba(160, 107, 255, 0.45); }

/* 生命告急：面板红光脉冲，提醒玩家该补血了 */
.player-low {
  border-color: rgba(255, 90, 60, 0.8);
  animation: low-pulse 1s ease-in-out infinite;
}
@keyframes low-pulse {
  0%, 100% { box-shadow: inset 0 0 0 rgba(255, 70, 50, 0); }
  50% { box-shadow: inset 0 0 24px rgba(255, 70, 50, 0.2); }
}

/* 增益与遗物行：默认单行；窄屏（≤360px）自动换行，避免信息被裁切 */
.buff-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-1);
  /* 左对齐起排并留出 1px，避免首个胶囊描边被面板内边距裁切 */
  padding-left: 1px;
}

.buff-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-2);
  white-space: nowrap;
  animation: relic-in var(--dur-base) var(--ease-out);
}
.buff-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
  flex-shrink: 0;
}
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
  color: var(--text-3);
}
@keyframes relic-in {
  from { scale: 0.3; opacity: 0; }
  to { scale: 1; opacity: 1; }
}
</style>
