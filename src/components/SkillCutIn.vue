<script setup lang="ts">
/**
 * 技能特写：全屏特效 + 英雄半身像 + 技能名，0.5 秒自动消失，不阻塞操作
 * REQ-FEEL-002
 */
import { useGameStore } from '@/stores/game'

const store = useGameStore()
</script>

<template>
  <transition name="cutin">
    <div v-if="store.cutIn" class="cutin-mask" :key="store.cutIn.id">
      <div class="cutin-band" :style="{ '--skill-color': store.cutIn.color }">
        <div class="cutin-hero">{{ store.cutIn.heroIcon }}</div>
        <div class="cutin-text">
          <div class="cutin-hero-name font-title">{{ store.cutIn.heroName }}</div>
          <div class="cutin-skill-name font-title">{{ store.cutIn.skillName }}!</div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.cutin-mask {
  position: absolute;
  inset: 0;
  z-index: 60;
  pointer-events: none; /* 不阻塞操作 */
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.25), transparent 70%);
}

.cutin-band {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px 42px;
  background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.85) 20%, rgba(0, 0, 0, 0.85) 80%, transparent);
  border-top: 2px solid var(--skill-color);
  border-bottom: 2px solid var(--skill-color);
  width: 100%;
  justify-content: center;
  animation: band-in 0.5s cubic-bezier(0.2, 1.2, 0.4, 1);
}

.cutin-hero {
  font-size: 58px;
  filter: drop-shadow(0 0 16px var(--skill-color));
  animation: hero-zoom 0.5s cubic-bezier(0.2, 1.5, 0.4, 1);
}
@keyframes hero-zoom {
  from { scale: 0.2; rotate: -12deg; }
  to { scale: 1; rotate: 0deg; }
}
@keyframes band-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.cutin-hero-name {
  font-size: 15px;
  color: rgba(245, 240, 230, 0.75);
  letter-spacing: 3px;
}
.cutin-skill-name {
  font-size: 30px;
  font-weight: 900;
  color: var(--skill-color);
  letter-spacing: 6px;
  text-shadow: 0 0 18px var(--skill-color);
}

.cutin-enter-active { transition: opacity 0.1s; }
.cutin-leave-active { transition: opacity 0.3s; }
.cutin-enter-from, .cutin-leave-to { opacity: 0; }
</style>
