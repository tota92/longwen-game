<script setup lang="ts">
/**
 * 遗物三选一（REQ-RELIC-002：可查看效果说明后再选择）
 * REQ-TUTO-004：首次展示附简短说明
 */
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { getRelic } from '@/config/relics'

const store = useGameStore()

const relics = computed(() => store.relicOffers.map((id) => getRelic(id)))
/** 首次遗物选择（1-3 教学关后） */
const isFirstTime = computed(() => store.battle.level?.tutorial === 'intro5')

function choose(id: string): void {
  store.chooseRelic(id)
}
</script>

<template>
  <div class="relic-mask">
    <div class="relic-dialog">
      <div class="relic-title font-title">遗物抉择</div>
      <p class="relic-sub">
        {{ isFirstTime ? '选择一件遗物，它将在本关剩余战斗中为你效力！' : '选择一件遗物强化本局build' }}
      </p>
      <div class="relic-cards">
        <button
          v-for="r in relics"
          :key="r.id"
          class="relic-card"
          :class="`type-${r.type}`"
          @click="choose(r.id)"
        >
          <span class="relic-card-icon">{{ r.icon }}</span>
          <span class="relic-card-name font-title">{{ r.name }}</span>
          <span class="relic-card-desc">{{ r.desc }}</span>
          <span class="relic-card-type">{{ r.type }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.relic-mask {
  position: absolute;
  inset: 0;
  z-index: 80;
  background: rgba(5, 3, 10, 0.82);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fade-in 0.25s ease;
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.relic-dialog {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.relic-title {
  font-size: 26px;
  color: var(--gold-light);
  letter-spacing: 8px;
  text-shadow: 0 0 16px rgba(212, 175, 55, 0.6);
}
.relic-sub {
  font-size: 12px;
  color: rgba(245, 240, 230, 0.65);
  margin: 8px 0 18px;
}

.relic-cards {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.relic-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 8px 14px;
  border-radius: 14px;
  border: 1px solid var(--border-gold);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
  color: #f5f0e6;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  animation: card-in 0.35s cubic-bezier(0.2, 1.3, 0.5, 1) backwards;
}
.relic-card:nth-child(1) { animation-delay: 0.05s; }
.relic-card:nth-child(2) { animation-delay: 0.13s; }
.relic-card:nth-child(3) { animation-delay: 0.21s; }
@keyframes card-in {
  from { translate: 0 30px; opacity: 0; }
  to { translate: 0 0; opacity: 1; }
}

.relic-card:active {
  transform: scale(0.95);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
}

.relic-card-icon {
  font-size: 40px;
  filter: drop-shadow(0 0 10px rgba(212, 175, 55, 0.5));
}
.relic-card-name {
  font-size: 16px;
  color: var(--gold-light);
}
.relic-card-desc {
  font-size: 11px;
  line-height: 1.5;
  color: rgba(245, 240, 230, 0.85);
  min-height: 33px;
}
.relic-card-type {
  font-size: 9px;
  padding: 1px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(245, 240, 230, 0.6);
}
</style>
