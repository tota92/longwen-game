<script setup lang="ts">
/**
 * 宝石展示区（REQ-UI 宝石系统展示）
 *
 * 定位：宝石在本作中既是棋盘元素、也是玩家的输出来源。这里把 6 种元素
 * 宝石做成一张"战况图鉴"——图标 + 熟练度等级 + 本局消除数量，
 * 让玩家一眼读出"这局我在靠什么元素打"。
 *
 * 熟练度等级（1~5）由本局累计消除量分级（见 core/gems.ts），
 * **不参与伤害结算**，数值锚点保持不变。
 *
 * 交互：
 *   选择   —— 点击卡片高亮棋盘上同元素宝石（辅助规划，不消耗回合）
 *   详情   —— 弹出浮层展示元素属性、单颗实际伤害与关联英雄
 *   使用   —— 浮层内一键"标记棋盘 / 取消标记"
 */
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { ELEMENT_INFO, GEM_LEVEL_MAX, PLAYER_MAX_HP } from '@/config/constants'
import { calcWaveDamage } from '@/core/battle'
import { HEROES } from '@/config/heroes'
import { iconUrl } from '@/utils/icons'
import { spriteUrl } from '@/utils/sprites'
import type { ElementType } from '@/types'
import type { GemEntry } from '@/core/gems'

const store = useGameStore()
const battle = store.battle

/** 当前展开详情的宝石 */
const detail = ref<GemEntry | null>(null)

const entries = computed(() => store.gemEntries)

/** 棋盘上各元素的可交互宝石数量（详情里给玩家"还有多少可消"的判断依据） */
const boardCount = computed<Record<ElementType, number>>(() => {
  const out = { fire: 0, water: 0, wood: 0, light: 0, dark: 0, thunder: 0 } as Record<ElementType, number>
  const grid = battle.board?.grid
  if (!grid) return out
  for (const row of grid) {
    for (const cell of row) {
      if (cell) out[cell.element]++
    }
  }
  return out
})

/**
 * 单颗宝石的实际伤害：直接复用战斗结算函数，保证展示值与真实结算一致。
 * 连击倍率固定为 1（这里表达的是"基础单颗价值"，不含连击放大）。
 */
const singleDamage = computed(() => {
  const lv = battle.level
  if (!lv || !detail.value) return 0
  return calcWaveDamage([{ element: detail.value.element }], 1, {
    gemPower: lv.gemPower,
    leaderElement: store.leader.element,
    sameBonusElement: store.sameBonusElement,
    gemMasteryBonus: battle.relics.includes('relic_gem_mastery') ? 2 : 0,
    desperate: battle.relics.includes('relic_desperate_counter') && battle.playerHP < PLAYER_MAX_HP * 0.3
  })
})

/** 该元素对应的英雄（火/水/木 各有一名主战英雄，光/暗/雷 暂无） */
const relatedHero = computed(() => (detail.value ? HEROES.find((h) => h.element === detail.value!.element) ?? null : null))

/** 主战英雄元素加成是否对该元素生效（同元素消除 +20%） */
const isLeaderElement = computed(() => detail.value?.element === store.leader.element)

/** 打开详情（同时把该元素设为棋盘高亮目标） */
function openDetail(entry: GemEntry): void {
  if (detail.value?.element === entry.element) {
    closeDetail()
    return
  }
  detail.value = entry
  if (battle.focusElement !== entry.element) store.toggleGemFocus(entry.element)
}

function closeDetail(): void {
  detail.value = null
}

/** 浮层内"标记棋盘 / 取消标记" */
function toggleMark(): void {
  if (detail.value) store.toggleGemFocus(detail.value.element)
}

/** 长按/再次点击卡片直接切换高亮（不打开浮层），给熟练玩家一条快路径 */
function quickToggle(entry: GemEntry, e: MouseEvent): void {
  e.stopPropagation()
  store.toggleGemFocus(entry.element)
}
</script>

<template>
  <div class="gem-panel">
    <div class="gem-grid">
      <button
        v-for="g in entries"
        :key="g.element"
        class="gem-card"
        :class="{ focused: battle.focusElement === g.element }"
        :style="{ '--c': g.color }"
        :aria-label="`${g.name}元素宝石 熟练度 ${g.stat.level} 级 本局消除 ${g.stat.cleared} 颗`"
        @click="openDetail(g)"
        @contextmenu.prevent="quickToggle(g, $event)"
      >
        <span class="gem-lv num">Lv{{ g.stat.level }}</span>
        <img class="gem-img" :src="iconUrl(g.iconId)" :alt="g.name" draggable="false" />
        <span class="gem-line">
          <b class="gem-el">{{ g.name }}</b>
          <span class="gem-count num">{{ g.stat.cleared }}</span>
        </span>
        <span class="gem-progress" aria-hidden="true">
          <i :style="{ width: `${g.stat.progress * 100}%` }"></i>
        </span>
      </button>
    </div>

    <!-- ============ 详情浮层 ============ -->
    <!-- 必须 Teleport 到 body：祖先 .panel 带 backdrop-filter，会给 position:fixed
         创建包含块，浮层会被困在底部面板的 128px 高度里而不是铺满视口 -->
    <Teleport to="body">
      <transition name="detail">
        <div v-if="detail" class="detail-mask" @click.self="closeDetail">
        <div class="detail-card panel" :style="{ '--c': detail.color }">
          <header class="detail-head">
            <img class="detail-icon" :src="iconUrl(detail.iconId)" :alt="detail.name" draggable="false" />
            <div class="detail-title">
              <span class="detail-name font-title">{{ detail.name }}元素宝石</span>
              <span class="detail-lv num">
                熟练度 Lv{{ detail.stat.level }}
                <i>/ {{ GEM_LEVEL_MAX }}</i>
              </span>
            </div>
            <button class="detail-close" aria-label="关闭" @click="closeDetail">✕</button>
          </header>

          <div class="detail-progress">
            <i :style="{ width: `${detail.stat.progress * 100}%` }"></i>
            <span class="progress-text num">
              {{
                detail.toNextLevel > 0
                  ? `再消除 ${detail.toNextLevel} 颗升至 Lv${detail.stat.level + 1}`
                  : '已达最高熟练度'
              }}
            </span>
          </div>

          <ul class="detail-stats">
            <li>
              <span class="k">本局消除</span>
              <span class="v num">{{ detail.stat.cleared }} 颗</span>
            </li>
            <li>
              <span class="k">棋盘现存</span>
              <span class="v num">{{ boardCount[detail.element] }} 颗</span>
            </li>
            <li>
              <span class="k">单颗伤害</span>
              <span class="v num">{{ singleDamage }} 点</span>
            </li>
            <li>
              <span class="k">主战加成</span>
              <span class="v" :class="{ on: isLeaderElement }">
                {{ isLeaderElement ? '同元素 +20%' : '不生效' }}
              </span>
            </li>
          </ul>

          <div v-if="relatedHero" class="detail-hero">
            <img class="hero-sprite" :src="spriteUrl(relatedHero.spriteId)" :alt="relatedHero.name" draggable="false" />
            <div class="hero-text">
              <span class="hero-name font-title">{{ relatedHero.name }}</span>
              <span class="hero-skill">{{ relatedHero.skill4.name }} · {{ relatedHero.skill5.name }}</span>
            </div>
            <span class="hero-tag">专属英雄</span>
          </div>
          <p v-else class="detail-hint">该元素暂无专属英雄，但消除同样计入伤害</p>

          <div class="detail-actions">
            <button
              class="btn detail-btn"
              :class="{ 'btn-primary': battle.focusElement !== detail.element }"
              @click="toggleMark"
            >
              {{ battle.focusElement === detail.element ? '取消标记' : '标记棋盘' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.gem-panel {
  position: relative;
  height: 100%;
}

/* 6 元素一排铺满：窄屏靠弹性收缩，不出现横向滚动 */
.gem-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  /* 与技能页等高：卡片纵向撑满，切 Tab 时不会出现"一页满一页空" */
  grid-template-rows: 1fr;
  gap: 4px;
  height: 100%;
}

.gem-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 内容成组居中：space-between 会把进度条甩到卡片底边，读起来像游离的装饰线 */
  justify-content: center;
  gap: 4px;
  padding: 3px 1px 2px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--r-sm);
  background: rgba(255, 255, 255, 0.035);
  cursor: pointer;
  transition: border-color var(--dur-fast), background var(--dur-fast), transform var(--dur-fast);
}
.gem-card:active { transform: scale(0.94); }

/* 被标记的元素：元素色描边 + 外发光，棋盘上同步高亮 */
.gem-card.focused {
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 16%, transparent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--c) 55%, transparent);
}

.gem-lv {
  position: absolute;
  top: 1px;
  right: 1px;
  z-index: 2;
  font-size: 8.5px;
  line-height: 1;
  font-weight: 700;
  padding: 1px 3px;
  border-radius: 5px;
  color: #14100a;
  background: linear-gradient(180deg, var(--gold-light), var(--gold));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.gem-img {
  /* 卡片纵向撑满后的主视觉：占卡片宽度约 3/4，元素辨识度优先 */
  width: 40px;
  height: 40px;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.55));
}
.gem-card.focused .gem-img {
  filter: drop-shadow(0 0 7px var(--c)) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
}

.gem-line {
  display: flex;
  align-items: baseline;
  gap: 3px;
  font-size: 9.5px;
  line-height: 1.2;
  color: var(--text-2);
}
.gem-el { font-weight: 700; color: var(--c); }
.gem-count { color: var(--text-1); font-weight: 600; }

.gem-progress {
  display: block;
  width: 82%;
  height: 2.5px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.45);
  overflow: hidden;
}
.gem-progress i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--c);
  box-shadow: 0 0 5px var(--c);
  transition: width 0.35s ease;
}

/* ============ 详情浮层 ============ */
.detail-mask {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-5);
  background: rgba(6, 4, 12, 0.74);
  backdrop-filter: blur(3px);
}

.detail-card {
  width: min(100%, 340px);
  padding: var(--sp-4);
  border-color: color-mix(in srgb, var(--c) 55%, transparent);
  background:
    radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--c) 22%, transparent), transparent 62%),
    var(--bg-panel-strong);
  box-shadow: var(--shadow-raise), 0 0 26px color-mix(in srgb, var(--c) 30%, transparent);
}

.detail-head {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.detail-icon {
  width: 46px;
  height: 46px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px var(--c));
}
.detail-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.detail-name { font-size: 16px; color: var(--text-1); }
.detail-lv { font-size: 11px; color: var(--gold-light); }
.detail-lv i { font-style: normal; opacity: 0.6; }

.detail-close {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: var(--r-sm);
  border: 1px solid var(--border-gold);
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-2);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}
.detail-close:active { transform: scale(0.9); }

.detail-progress {
  position: relative;
  height: 16px;
  margin: var(--sp-3) 0;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.45);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.detail-progress > i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 65%, #000), var(--c));
  box-shadow: 0 0 10px var(--c);
  transition: width 0.4s ease;
}
.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9.5px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.detail-stats {
  list-style: none;
  margin: 0 0 var(--sp-3);
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px var(--sp-3);
}
.detail-stats li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  font-size: 11px;
  padding: 4px 7px;
  border-radius: var(--r-sm);
  background: rgba(255, 255, 255, 0.045);
}
.detail-stats .k { color: var(--text-3); }
.detail-stats .v { color: var(--text-1); font-weight: 600; }
.detail-stats .v.on { color: #7ff0a8; }

.detail-hero {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-md);
  border: 1px solid var(--border-gold);
  background: rgba(212, 175, 55, 0.08);
}
.hero-sprite {
  width: 34px;
  height: 46px;
  object-fit: contain;
  object-position: top;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.6));
}
.hero-text { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.hero-name { font-size: 13px; color: var(--gold-light); }
.hero-skill { font-size: 10px; color: var(--text-3); }
.hero-tag {
  flex-shrink: 0;
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 6px;
  color: #14100a;
  background: linear-gradient(180deg, var(--gold-light), var(--gold));
}
.detail-hint {
  margin: 0;
  font-size: 10.5px;
  color: var(--text-3);
  text-align: center;
}

.detail-actions { margin-top: var(--sp-3); }
.detail-btn {
  width: 100%;
  padding: var(--sp-3);
  font-size: 14px;
}

/* 浮层入场 */
.detail-enter-active, .detail-leave-active { transition: opacity 0.18s ease; }
.detail-enter-active .detail-card, .detail-leave-active .detail-card {
  transition: transform 0.22s cubic-bezier(0.3, 1.3, 0.5, 1), opacity 0.18s;
}
.detail-enter-from, .detail-leave-to { opacity: 0; }
.detail-enter-from .detail-card, .detail-leave-to .detail-card { transform: scale(0.88); opacity: 0; }

/* 宽屏：宝石卡片放大，信息更舒展 */
@media (min-width: 860px) {
  .gem-img { width: 38px; height: 38px; }
  .gem-line { font-size: 11px; }
  .gem-lv { font-size: 9.5px; }
}
</style>
