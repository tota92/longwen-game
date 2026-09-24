<script setup lang="ts">
/**
 * 编队界面（REQ-HERO-001/002/003）：
 * 主战英雄决定技能与元素加成；支援英雄提供被动；同元素支援触发加成提示
 */
import { useGameStore } from '@/stores/game'
import { HEROES } from '@/config/heroes'
import { ELEMENT_INFO } from '@/config/constants'
import { computed } from 'vue'

const store = useGameStore()

const sameElementBonus = computed(() => {
  const supports = store.supports
  if (supports.length < 2) return false
  return supports.every((h) => h.element === store.leader.element)
})
</script>

<template>
  <div class="team-view">
    <header class="page-header">
      <button class="back-btn" @click="store.setScreen('home')">←</button>
      <span class="page-title font-title">英雄编队</span>
      <span class="header-space"></span>
    </header>

    <div class="team-content">
      <!-- 当前阵容摘要 -->
      <div class="formation-summary panel">
        <div class="formation-main">
          <span class="formation-avatar" :style="{ borderColor: store.leader.color }">{{ store.leader.icon }}</span>
          <div class="formation-info">
            <span class="formation-name font-title">{{ store.leader.name }}</span>
            <span class="formation-role">主战 · 技能石释放者</span>
          </div>
        </div>
        <div class="formation-supports">
          <div v-for="h in store.supports" :key="h.id" class="support-item">
            <span class="support-emoji">{{ h.icon }}</span>
            <span class="support-passive">{{ h.passiveDesc }}</span>
          </div>
        </div>
        <div v-if="sameElementBonus" class="same-element-bonus">
          ✦ 同元素加成生效：{{ ELEMENT_INFO[store.leader.element].name }}属性宝石伤害 +1
        </div>
      </div>

      <p class="team-tip">点击英雄设为主战（其余自动成为支援）</p>

      <!-- 英雄卡列表 -->
      <div
        v-for="h in HEROES"
        :key="h.id"
        class="hero-card panel"
        :class="{ 'is-leader': h.id === store.profile.team.leader }"
        @click="store.setLeader(h.id)"
      >
        <div class="hero-card-left">
          <span class="hero-card-avatar" :style="{ borderColor: h.color }">{{ h.icon }}</span>
          <div class="hero-card-basic">
            <div class="hero-card-name-row">
              <span class="hero-card-name font-title">{{ h.name }}</span>
              <span class="hero-card-el" :style="{ color: ELEMENT_INFO[h.element].color }">
                {{ ELEMENT_INFO[h.element].icon }} {{ ELEMENT_INFO[h.element].name }}
              </span>
            </div>
            <span class="hero-card-title">{{ h.title }}</span>
            <span v-if="h.id === store.profile.team.leader" class="role-badge leader-badge">主战</span>
            <span v-else class="role-badge support-badge">支援</span>
          </div>
        </div>
        <div class="hero-skills">
          <div class="skill-row">
            <span class="skill-tag tag4">四消</span>
            <span class="skill-name">{{ h.skill4.name }}</span>
            <span class="skill-desc">{{ h.skill4.desc }}</span>
          </div>
          <div class="skill-row">
            <span class="skill-tag tag5">五消</span>
            <span class="skill-name">{{ h.skill5.name }}</span>
            <span class="skill-desc">{{ h.skill5.desc }}</span>
          </div>
          <div class="skill-row">
            <span class="skill-tag tagP">被动</span>
            <span class="skill-desc">{{ h.passiveDesc }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.team-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 6px;
}
.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border-gold);
  background: var(--bg-panel);
  color: #f5f0e6;
  font-size: 16px;
  cursor: pointer;
}
.page-title {
  font-size: 19px;
  color: var(--gold-light);
  letter-spacing: 4px;
}
.header-space { width: 36px; }

.team-content {
  flex: 1;
  overflow-y: auto;
  padding: 6px 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.formation-summary { padding: 12px 14px; }
.formation-main {
  display: flex;
  align-items: center;
  gap: 10px;
}
.formation-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 2px solid;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.formation-info {
  display: flex;
  flex-direction: column;
}
.formation-name { font-size: 16px; color: #dce8ff; }
.formation-role { font-size: 10px; color: rgba(245, 240, 230, 0.5); }

.formation-supports {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.support-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  padding: 6px 8px;
}
.support-emoji { font-size: 18px; }
.support-passive { font-size: 10px; color: rgba(245, 240, 230, 0.75); }

.same-element-bonus {
  margin-top: 8px;
  font-size: 11px;
  color: #7dedb2;
  background: rgba(76, 217, 100, 0.1);
  border: 1px solid rgba(76, 217, 100, 0.3);
  border-radius: 8px;
  padding: 5px 10px;
}

.team-tip {
  font-size: 11px;
  color: rgba(245, 240, 230, 0.45);
  text-align: center;
  margin: 0;
}

.hero-card {
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.12s;
}
.hero-card:active { transform: scale(0.985); }
.hero-card.is-leader {
  border-color: var(--gold);
  box-shadow: 0 0 16px rgba(212, 175, 55, 0.25);
}

.hero-card-left {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.hero-card-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 2px solid;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.hero-card-basic {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.hero-card-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.hero-card-name { font-size: 16px; color: #dce8ff; }
.hero-card-el { font-size: 12px; }
.hero-card-title { font-size: 10px; color: rgba(245, 240, 230, 0.45); }

.role-badge {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 8px;
}
.leader-badge {
  color: #241a04;
  background: linear-gradient(180deg, #e8c96a, #b8912c);
  font-weight: 700;
}
.support-badge {
  color: #bcd9ff;
  border: 1px solid rgba(60, 167, 255, 0.4);
}

.hero-skills {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.skill-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 11px;
}
.skill-tag {
  flex-shrink: 0;
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 6px;
  font-weight: 700;
}
.tag4 { color: #ffd94c; border: 1px solid rgba(255, 217, 76, 0.5); }
.tag5 { color: #e0b3ff; border: 1px solid rgba(199, 125, 255, 0.5); }
.tagP { color: #7dedb2; border: 1px solid rgba(76, 217, 100, 0.5); }
.skill-name { color: var(--gold-light); flex-shrink: 0; }
.skill-desc { color: rgba(245, 240, 230, 0.65); }
</style>
