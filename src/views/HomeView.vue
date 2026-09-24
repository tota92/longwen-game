<script setup lang="ts">
/**
 * 主界面（REQ-UI 9.1）：开始游戏 / 继续战斗 / 编队 / 关卡选择 / 设置
 */
import { useGameStore } from '@/stores/game'

const store = useGameStore()

function onStart(): void {
  if (store.hasBattleSnapshot) {
    store.continueBattle()
  } else {
    store.startLevel(store.profile.unlockedLevel)
  }
}
</script>

<template>
  <div class="home-view">
    <div class="home-deco top">⚜</div>

    <div class="home-title-block">
      <div class="home-sub font-title">龙 纹 世 纪</div>
      <h1 class="home-title font-title">龙纹消消棋</h1>
      <div class="home-divider">
        <span></span><span>✦</span><span></span>
      </div>
      <p class="home-slogan">三消聚能 · 技能爆发 · 遗物构建</p>
    </div>

    <div class="home-dragon">🐉</div>

    <div class="home-actions">
      <button class="btn btn-primary btn-big home-start" @click="onStart">
        <template v-if="store.hasBattleSnapshot">▶ 继续战斗</template>
        <template v-else>▶ 开始游戏</template>
      </button>
      <div class="home-row">
        <button class="btn" @click="store.setScreen('team')">🛡 编队</button>
        <button class="btn" @click="store.setScreen('levels')">🗺 关卡</button>
        <button class="btn" @click="store.toggleSound()">
          {{ store.profile.settings.sound ? '🔊' : '🔇' }}
        </button>
      </div>
    </div>

    <div class="home-footer">
      <span v-if="store.profile.maxCombo > 0">最高连击纪录：{{ store.profile.maxCombo }}</span>
      <span>V1.0 · Vue3 + TypeScript</span>
    </div>

    <div class="home-deco bottom">⚜</div>
  </div>
</template>

<style scoped>
.home-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 26px 22px;
  position: relative;
  overflow: hidden;
}

.home-deco {
  color: rgba(212, 175, 55, 0.3);
  font-size: 22px;
}
.home-deco.top { position: absolute; top: 14px; left: 18px; }
.home-deco.bottom { position: absolute; bottom: 14px; right: 18px; }

.home-title-block {
  text-align: center;
  margin-top: 6vh;
}
.home-sub {
  font-size: 15px;
  color: rgba(212, 175, 55, 0.75);
  letter-spacing: 10px;
}
.home-title {
  margin: 6px 0 0;
  font-size: 44px;
  color: var(--gold-light);
  letter-spacing: 6px;
  text-shadow:
    0 0 28px rgba(212, 175, 55, 0.55),
    0 4px 12px rgba(0, 0, 0, 0.8);
  background: linear-gradient(180deg, #f5e3a3, #d4af37 70%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.home-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 12px 0 8px;
}
.home-divider span:first-child,
.home-divider span:last-child {
  width: 64px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border-gold));
}
.home-divider span:last-child {
  background: linear-gradient(90deg, var(--border-gold), transparent);
}
.home-divider span:nth-child(2) {
  color: var(--gold);
  font-size: 12px;
}
.home-slogan {
  font-size: 12px;
  color: rgba(245, 240, 230, 0.55);
  letter-spacing: 4px;
  margin: 0;
}

.home-dragon {
  font-size: 86px;
  filter: drop-shadow(0 0 30px rgba(212, 175, 55, 0.4));
  animation: dragon-float 3.2s ease-in-out infinite;
}
@keyframes dragon-float {
  0%, 100% { translate: 0 0; rotate: -2deg; }
  50% { translate: 0 -14px; rotate: 2deg; }
}

.home-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 300px;
}
.home-start {
  width: 100%;
  font-size: 19px;
  letter-spacing: 3px;
}
.home-row {
  display: flex;
  gap: 10px;
}
.home-row .btn {
  flex: 1;
  font-size: 14px;
  padding: 10px 8px;
}

.home-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(245, 240, 230, 0.4);
}
</style>
