<script setup lang="ts">
/**
 * 技能信息区（REQ-UI 信息展示区域）
 *
 * 展示当前英雄的四消 / 五消技能，并给出"技能切换"与"技能升级"两条入口：
 *   切换 —— 顶部英雄条：点任意英雄即切换到该英雄的技能组（主战 + 两名支援）
 *   升级 —— 技能等级直接映射遗物体系（基础 1 级 + 强化该技能的遗物数），
 *           详情浮层里列出全部强化来源与获取方式，玩家知道"怎么升"。
 *
 * 关于"冷却时间"：本作技能由四消/五消生成的技能石**即时触发**，不存在冷却。
 * 因此这里用「触发条件 + 棋盘现有技能石存量」表达技能可用状态——
 * 这是真实可操作的信息，比虚构一个倒计时更贴合玩法。
 */
import { computed, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { SKILL_LEVEL_MAX, SKILL_UPGRADE_RELICS } from '@/config/constants'
import { buildHeroSkillViews, type SkillView } from '@/core/skills'
import { HEROES } from '@/config/heroes'
import { iconUrl } from '@/utils/icons'
import { spriteUrl } from '@/utils/sprites'

const store = useGameStore()
const battle = store.battle

/** 玩家手动选中的英雄；为空时跟随主战英雄 */
const pickedId = ref<string | null>(null)

/** 当前展示的英雄（主战 / 支援） */
const activeHero = computed(() => {
  if (pickedId.value) {
    const h = HEROES.find((x) => x.id === pickedId.value)
    if (h) return h
  }
  return store.leader
})

/** 编队成员（主战 + 支援），用于英雄切换条 */
const teamHeroes = computed(() => [store.leader, ...store.supports])

/** 主战变更后重置手动选择，避免停留在已不在队伍里的英雄上 */
watch(() => store.leader.id, () => (pickedId.value = null))

/** 四消 / 五消技能视图 */
const skills = computed<SkillView[]>(() => buildHeroSkillViews(activeHero.value, store.skillContext))

/** 当前展开详情的技能 */
const detail = ref<SkillView | null>(null)

/** 棋盘上现有技能石存量：技能的真实"可用状态" */
const boardSpecials = computed(() => {
  let small = 0
  let ultimate = 0
  const grid = battle.board?.grid
  if (grid) {
    for (const row of grid) {
      for (const cell of row) {
        if (!cell?.special) continue
        if (cell.special === 'small') small++
        else if (cell.special === 'ultimate') ultimate++
      }
    }
  }
  return { small, ultimate }
})

/** 该技能当前是否有可用技能石 */
function ready(s: SkillView): number {
  return s.which === 'small' ? boardSpecials.value.small : boardSpecials.value.ultimate
}

/** 遗物强化清单：标注本局已生效的项 */
const upgradeRelics = computed(() =>
  SKILL_UPGRADE_RELICS.map((r) => ({
    ...r,
    owned: battle.relics.includes(r.id),
    name: store.getRelicInfo(r.id).name
  }))
)

function pickHero(id: string): void {
  pickedId.value = id
  detail.value = null
}

function openDetail(s: SkillView): void {
  detail.value = detail.value?.which === s.which ? null : s
}
</script>

<template>
  <div class="skill-panel">
    <!-- 英雄切换条：主战 + 支援，点击即切换技能组（技能切换入口） -->
    <div class="hero-switch">
      <button
        v-for="h in teamHeroes"
        :key="h.id"
        class="hero-chip"
        :class="{ active: activeHero.id === h.id, leader: h.id === store.leader.id }"
        :style="{ '--hc': h.color }"
        :aria-label="`查看 ${h.name} 的技能`"
        @click="pickHero(h.id)"
      >
        <img :src="iconUrl(h.iconId)" :alt="h.name" draggable="false" />
        <span v-if="h.id === store.leader.id" class="leader-dot" aria-hidden="true"></span>
      </button>
    </div>

    <!-- 技能卡片：四消 / 五消 -->
    <button
      v-for="s in skills"
      :key="s.which"
      class="skill-card"
      :class="[`skill-${s.which}`, { ready: ready(s) > 0 }]"
      :style="{ '--hc': activeHero.color }"
      :aria-label="`${s.name} 等级 ${s.level} ${s.trigger}`"
      @click="openDetail(s)"
    >
      <span class="skill-icon-wrap">
        <img :src="iconUrl(s.iconId)" :alt="s.name" draggable="false" />
        <span class="skill-lv num">Lv{{ s.level }}</span>
      </span>
      <span class="skill-body">
        <span class="skill-name font-title">{{ s.name }}</span>
        <span class="skill-sub num">
          <b class="skill-trigger">{{ s.which === 'small' ? '四消' : '五消' }}</b>
          <span class="skill-ready" :class="{ on: ready(s) > 0 }">
            {{ ready(s) > 0 ? `可用 ${ready(s)}` : '无技能石' }}
          </span>
        </span>
        <!-- 第三行：效果标签摘要（首条即"伤害 N"），不点开也能读到关键数值 -->
        <span class="skill-effects">
          <i v-for="e in s.effects.slice(0, 2)" :key="e">{{ e }}</i>
        </span>
      </span>
    </button>

    <!-- ============ 技能详情浮层 ============ -->
    <!-- 必须 Teleport 到 body：祖先 .panel 带 backdrop-filter，会给 position:fixed
         创建包含块，浮层会被困在底部面板的 128px 高度里而不是铺满视口 -->
    <Teleport to="body">
      <transition name="detail">
        <div v-if="detail" class="detail-mask" @click.self="detail = null">
        <div class="detail-card panel" :style="{ '--hc': activeHero.color }">
          <header class="detail-head">
            <img class="detail-icon" :src="iconUrl(detail.iconId)" :alt="detail.name" draggable="false" />
            <div class="detail-title">
              <span class="detail-name font-title">{{ detail.name }}</span>
              <span class="detail-lv num">
                技能等级 Lv{{ detail.level }} <i>/ {{ SKILL_LEVEL_MAX }}</i>
              </span>
            </div>
            <button class="detail-close" aria-label="关闭" @click="detail = null">✕</button>
          </header>

          <p class="detail-desc">{{ detail.desc }}</p>

          <ul class="detail-stats">
            <li>
              <span class="k">触发条件</span>
              <span class="v">{{ detail.trigger }}</span>
            </li>
            <li>
              <span class="k">棋盘存量</span>
              <span class="v num" :class="{ on: ready(detail) > 0 }">{{ ready(detail) }} 个技能石</span>
            </li>
            <li v-if="detail.damage > 0">
              <span class="k">当前伤害</span>
              <span class="v num">{{ detail.damage }} 点</span>
            </li>
            <li>
              <span class="k">技能等级</span>
              <span class="v num">Lv{{ detail.level }}</span>
            </li>
          </ul>

          <div class="detail-effects">
            <span v-for="e in detail.effects" :key="e" class="effect-tag">{{ e }}</span>
            <span v-if="detail.effects.length === 0" class="effect-tag muted">纯辅助效果</span>
          </div>

          <!-- 升级入口：等级来源与获取方式 -->
          <section class="upgrade-box">
            <h4 class="upgrade-title">
              技能强化
              <span class="upgrade-count num">{{ detail.upgrades.length }} / {{ SKILL_LEVEL_MAX - 1 }}</span>
            </h4>
            <p v-if="detail.upgrades.length > 0" class="upgrade-sub">本局已生效：</p>
            <ul v-if="detail.upgrades.length > 0" class="upgrade-list">
              <li v-for="u in detail.upgrades" :key="u" class="on">{{ u }}</li>
            </ul>
            <p v-else class="upgrade-sub">本局尚未获得强化遗物，击败敌人后可选：</p>
            <ul class="upgrade-list">
              <li v-for="r in upgradeRelics" :key="r.id" :class="{ on: r.owned }">
                <img class="relic-icon" :src="iconUrl(store.getRelicInfo(r.id).iconId)" alt="" aria-hidden="true" />
                <b>{{ r.name }}</b>
                <span>{{ r.desc }}</span>
              </li>
            </ul>
          </section>

          <div class="detail-hero">
            <img class="hero-sprite" :src="spriteUrl(activeHero.spriteId)" :alt="activeHero.name" draggable="false" />
            <div class="hero-text">
              <span class="hero-name font-title">{{ activeHero.name }}</span>
              <span class="hero-passive">{{ activeHero.passiveDesc }}</span>
            </div>
          </div>
        </div>
      </div>
    </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.skill-panel {
  position: relative;
  display: grid;
  /* 左：英雄切换条；右：四消 / 五消两张技能卡 */
  grid-template-columns: auto 1fr 1fr;
  gap: 4px;
  align-items: stretch;
}

/* ---------- 英雄切换条 ---------- */
.hero-switch {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding-right: 2px;
}
.hero-chip {
  position: relative;
  /* 竖屏底部信息区被压缩后，这里收成 22px 圆钮以适配更矮的面板 */
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.14);
  background: radial-gradient(circle at 40% 32%, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.5));
  cursor: pointer;
  transition: border-color var(--dur-fast), transform var(--dur-fast), box-shadow var(--dur-fast);
}
.hero-chip:active { transform: scale(0.9); }
.hero-chip img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 50%;
}
/* 当前查看的英雄：按该英雄主题色高亮 */
.hero-chip.active {
  border-color: var(--hc);
  box-shadow: 0 0 9px color-mix(in srgb, var(--hc) 70%, transparent);
}
/* 主战英雄：右上角一枚金点，与支援区分开 */
.leader-dot {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--gold-light), var(--gold));
  box-shadow: 0 0 5px rgba(240, 216, 120, 0.9);
}

/* ---------- 技能卡片 ---------- */
.skill-card {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 5px;
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--hc) 22%, rgba(255, 255, 255, 0.08));
  border-radius: var(--r-sm);
  background-color: rgba(255, 255, 255, 0.035);
  background-image:
    radial-gradient(circle at 12% 50%, color-mix(in srgb, var(--hc) 13%, transparent), transparent 62%),
    var(--sheen-top);
  cursor: pointer;
  text-align: left;
  box-shadow: var(--hi-top);
  transition: border-color var(--dur-fast), background var(--dur-fast), transform var(--dur-fast);
}
.skill-card:active { transform: scale(0.96); }
/* 棋盘上有对应技能石：卡片亮起，提示"现在能放" */
.skill-card.ready {
  border-color: color-mix(in srgb, var(--hc) 60%, transparent);
  background: color-mix(in srgb, var(--hc) 12%, transparent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--hc) 40%, transparent);
}
/* 五消终极技能：金色描边，与四消拉开稀有度 */
.skill-ultimate { border-color: rgba(212, 175, 55, 0.35); }
.skill-ultimate.ready {
  border-color: var(--gold-light);
  background: rgba(212, 175, 55, 0.14);
  box-shadow: 0 0 12px rgba(240, 216, 120, 0.5);
}

.skill-icon-wrap {
  position: relative;
  flex-shrink: 0;
  /* 与技能页内容高（86px）匹配：图标是卡片主视觉，不能缩成小徽章 */
  width: 38px;
  height: 38px;
}
.skill-icon-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.6));
}
.skill-card.ready .skill-icon-wrap img {
  filter: drop-shadow(0 0 6px var(--hc)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
  animation: skill-ready-pulse 1.6s ease-in-out infinite;
}
@keyframes skill-ready-pulse {
  0%, 100% { scale: 1; }
  50% { scale: 1.09; }
}

.skill-lv {
  position: absolute;
  bottom: -2px;
  right: -4px;
  font-size: 8px;
  line-height: 1;
  font-weight: 700;
  padding: 1px 3px;
  border-radius: 5px;
  color: #14100a;
  background: linear-gradient(180deg, var(--gold-light), var(--gold));
  border: 1px solid rgba(255, 244, 200, 0.5);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.skill-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}
.skill-name {
  font-size: 11px;
  color: var(--text-1);
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.skill-sub {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  color: var(--text-3);
}
.skill-trigger { color: var(--gold-light); font-weight: 700; }
.skill-ready.on { color: #7ff0a8; }

/* 第三行：伤害数值 + 效果标签（列表层就能读到关键信息） */
.skill-effects {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 1px;
  min-width: 0;
  overflow: hidden;
  font-size: 9px;
  line-height: 1.3;
}
.skill-effects i {
  /* 允许收缩 + 省略：标签过长时宁可截断，也不要撑破卡片右边界 */
  min-width: 0;
  flex-shrink: 1;
  font-style: normal;
  padding: 0 3px;
  border-radius: 3px;
  border: 1px solid color-mix(in srgb, var(--hc) 45%, transparent);
  color: color-mix(in srgb, var(--hc) 78%, #ffffff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  width: min(100%, 350px);
  max-height: 86dvh;
  overflow-y: auto;
  padding: var(--sp-4);
  border-color: color-mix(in srgb, var(--hc) 50%, transparent);
  background:
    radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--hc) 20%, transparent), transparent 60%),
    var(--bg-panel-strong);
  box-shadow: var(--shadow-raise), 0 0 26px color-mix(in srgb, var(--hc) 26%, transparent);
}

.detail-head { display: flex; align-items: center; gap: var(--sp-3); }
.detail-icon {
  width: 46px;
  height: 46px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px var(--hc));
}
.detail-title { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
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

.detail-desc {
  margin: var(--sp-3) 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-2);
}

.detail-stats {
  list-style: none;
  margin: 0 0 var(--sp-3);
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px var(--sp-2);
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

.detail-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: var(--sp-3);
}
.effect-tag {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--hc) 45%, transparent);
  background: color-mix(in srgb, var(--hc) 12%, transparent);
  color: var(--text-1);
}
.effect-tag.muted { border-color: rgba(255, 255, 255, 0.14); background: rgba(255, 255, 255, 0.05); color: var(--text-3); }

/* ---------- 强化（升级入口） ---------- */
.upgrade-box {
  padding: var(--sp-3);
  border-radius: var(--r-md);
  border: 1px solid var(--border-gold);
  background: rgba(212, 175, 55, 0.07);
  margin-bottom: var(--sp-3);
}
.upgrade-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 var(--sp-2);
  font-size: 12px;
  font-weight: 700;
  color: var(--gold-light);
  letter-spacing: 1px;
}
.upgrade-count { font-size: 10px; color: var(--text-3); font-weight: 500; }
.upgrade-sub { margin: 0 0 4px; font-size: 10px; color: var(--text-3); }
.upgrade-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.upgrade-list li {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  line-height: 1.4;
  color: var(--text-3);
  padding: 3px 5px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.22);
}
.upgrade-list li.on { color: var(--text-1); background: rgba(212, 175, 55, 0.16); }
.upgrade-list li b { flex-shrink: 0; color: var(--gold-light); font-weight: 600; }
.relic-icon { width: 13px; height: 13px; object-fit: contain; flex-shrink: 0; }

.detail-hero {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.045);
}
.hero-sprite {
  width: 34px;
  height: 46px;
  object-fit: contain;
  object-position: top;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.6));
}
.hero-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.hero-name { font-size: 13px; color: var(--text-1); }
.hero-passive { font-size: 10px; color: var(--text-3); }

/* 浮层入场 */
.detail-enter-active, .detail-leave-active { transition: opacity 0.18s ease; }
.detail-enter-active .detail-card, .detail-leave-active .detail-card {
  transition: transform 0.22s cubic-bezier(0.3, 1.3, 0.5, 1), opacity 0.18s;
}
.detail-enter-from, .detail-leave-to { opacity: 0; }
.detail-enter-from .detail-card, .detail-leave-to .detail-card { transform: scale(0.88); opacity: 0; }

/* 宽屏：技能卡放大 */
@media (min-width: 860px) {
  .skill-icon-wrap { width: 38px; height: 38px; }
  .skill-name { font-size: 13px; }
  .skill-sub { font-size: 10px; }
  .hero-chip { width: 32px; height: 32px; }
}
</style>
