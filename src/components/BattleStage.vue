<script setup lang="ts">
/**
 * 战斗展示区（REQ-UI 顶部区域）
 *
 * 把原先分散在「敌方头像面板 + 我方头像面板」里的战斗信息，
 * 收拢成一块**对阵式**的战斗舞台：英雄与怪物以完整立绘正面相对，
 * 攻击特效、伤害飘字、血条变化都发生在这块区域里。
 *
 * 信息密度是这块区域最大的约束——竖屏上它只有约 150px 高，
 * 因此按「一眼必须看到」排序，只保留战斗决策真正需要的元素：
 *   必须：双方血条 / 敌人行动倒计时 / 行动意图 / 蓄力进度 / 状态效果
 *   弱化：支援被动与遗物 → 压成小图标，点击才展开说明
 *   移除：元素加成说明 → 已由宝石展示区详情承载，不重复占位
 *
 * 角色形象：public/sprites/heroes|enemies/ 下的 640px 透明立绘（完整全身像），
 * 由 heroAction / enemyAction 两个状态机驱动四态动画：
 *   idle 待机呼吸 → attack 出手前冲 → hurt 受击后仰 → dead 倒地消散
 *
 * 血条：数值 + 比例 + 延迟残影（ghost）。掉血瞬间实心条先收缩，
 * 残影条延迟 0.28s 后追上——玩家能直观看到"刚刚掉了多少"。
 */
import { computed, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { ELEMENT_INFO, PLAYER_MAX_HP, TUTORIAL_MATCH_TARGET } from '@/config/constants'
import { iconUrl } from '@/utils/icons'
import { spriteUrl } from '@/utils/sprites'
import type { HeroConfig } from '@/types'

const store = useGameStore()
const battle = store.battle

const leader = computed(() => store.leader)
const heroElement = computed(() => ELEMENT_INFO[leader.value.element])
const enemy = computed(() => battle.enemy)
const isBoss = computed(() => !!enemy.value && enemy.value.phaseHP.length > 1)

/** 状态徽记图标 */
const ICON = {
  shield: iconUrl('status_shield'),
  freeze: iconUrl('status_freeze'),
  stun: iconUrl('status_stun'),
  burn: iconUrl('status_burn'),
  poison: iconUrl('status_poison'),
  target: iconUrl('ui_target')
} as const

/** 本局已持有遗物 */
const relics = computed(() => battle.relics.map((id) => store.getRelicInfo(id)))

// ------------------------------------------------------------------
// 血条：比例 + 残影 + 数值跳动
// ------------------------------------------------------------------
const heroPct = computed(() => Math.max(0, (battle.playerHP / PLAYER_MAX_HP) * 100))
const shieldPct = computed(() => Math.max(0, Math.min(100, (battle.playerShield / PLAYER_MAX_HP) * 100)))
const enemyPct = computed(() => {
  const e = enemy.value
  if (!e) return 0
  return Math.max(0, Math.min(100, (e.hp / e.phaseMaxHp) * 100))
})

/** 数值跳动：HP 变化的瞬间让数字弹一下，视线会被"数字动了"抓住 */
const heroBump = ref(false)
const enemyBump = ref(false)
function bump(target: typeof heroBump): void {
  target.value = false
  requestAnimationFrame(() => {
    target.value = true
    window.setTimeout(() => (target.value = false), 340)
  })
}
watch(() => battle.playerHP, (nv, ov) => { if (nv !== ov) bump(heroBump) })
watch(() => enemy.value?.hp, (nv, ov) => { if (nv !== ov) bump(enemyBump) })

/** 生命告急（<30%）：面板转警戒色，与遗物「绝境反击」阈值一致 */
const heroLow = computed(() => battle.playerHP > 0 && battle.playerHP < PLAYER_MAX_HP * 0.3)

// ------------------------------------------------------------------
// 敌人行动信息（REQ-ENEMY-001 倒计时常显 / REQ-FEEL-005 行动预警）
// ------------------------------------------------------------------

/** 倒计时进度环：剩余回合 / 初始倒计时（0~1），驱动外环 conic-gradient */
function cdRatio(): number {
  const e = enemy.value
  if (!e || e.baseCountdown <= 0) return 0
  return Math.max(0, Math.min(1, e.countdown / e.baseCountdown))
}

/** 敌人下次行动的意图文案：让玩家能预判敌人行为 */
function intentText(): string {
  const e = enemy.value
  if (!e) return ''
  if (e.frozen > 0) return '被冰冻，倒计时暂停'
  if (e.stunned > 0) return '眩晕中，将跳过行动'
  if (e.charging) return `蓄力中 ·「${e.charging.release}」${e.charging.damage} 点伤害`
  const action = e.pattern && e.pattern.length > 0 ? e.pattern[e.patternIndex % e.pattern.length] : null
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

/**
 * 蓄力进度（已承受伤害 / 打断阈值）。
 * 蓄力行本身对所有敌人常驻占位，因此这里不再需要判断"该敌人是否会蓄力"，
 * 面板高度恒定，蓄力条出现/消失不会把棋盘顶下去。
 */
function chargeRatio(): number {
  const c = enemy.value?.charging
  if (!c || c.interrupt <= 0) return 0
  return Math.max(0, Math.min(1, c.taken / c.interrupt))
}

/** 行动预警：敌人出手前整块展示区泛红脉冲（REQ-FEEL-005） */
const warning = ref(false)
let warnTimer = 0
watch(
  () => store.enemyWarn,
  () => {
    if (!enemy.value) return
    warning.value = true
    clearTimeout(warnTimer)
    warnTimer = window.setTimeout(() => (warning.value = false), 520)
  }
)

// ------------------------------------------------------------------
// 命中特效按受击方分流：出手方为 hero 的特效落在怪物身上，反之落在英雄身上
// ------------------------------------------------------------------
const fxOnHero = computed(() => store.hitFxs.filter((f) => f.side === 'enemy'))
const fxOnEnemy = computed(() => store.hitFxs.filter((f) => f.side === 'hero'))

/** 支援被动 / 遗物：移动端无 hover，点击后用提示区展开说明 */
function showSupportInfo(h: HeroConfig): void {
  store.showTip(`${h.name} 支援 · ${h.passiveDesc}`, 3200)
}
function showRelicInfo(id: string): void {
  const r = store.getRelicInfo(id)
  store.showTip(`${r.name}：${r.desc}`, 3600)
}
</script>

<template>
  <div
    class="battle-stage panel"
    :class="{
      'stage-low': heroLow,
      'stage-boss': isBoss,
      'stage-warn': warning,
      'stage-charging': !!enemy?.charging
    }"
  >
    <!-- ============ 英雄侧 ============ -->
    <div class="side side-hero" :style="{ '--actor': heroElement.color }">
      <div class="sprite-box">
        <!-- 脚下光环：把立绘"钉"在地面上，避免角色漂浮 -->
        <div class="aura" aria-hidden="true"></div>
        <img
          class="sprite"
          :class="`act-${battle.heroAction}`"
          :src="spriteUrl(leader.spriteId)"
          :alt="leader.name"
          draggable="false"
        />
        <!-- 命中特效：由怪物打出 -->
        <div
          v-for="fx in fxOnHero"
          :key="fx.id"
          class="hit-fx"
          :class="`fx-${fx.kind}`"
          :style="{ '--fx': fx.color }"
          aria-hidden="true"
        ></div>
      </div>

      <div class="name-row">
        <span class="actor-name font-title">{{ leader.name }}</span>
        <!-- 支援被动：压成图标，点击展开说明（REQ-HERO-003 支援被动 UI 可见） -->
        <button
          v-for="h in store.supports"
          :key="h.id"
          class="mini-icon support"
          :aria-label="`${h.name} 支援被动：${h.passiveDesc}`"
          @click="showSupportInfo(h)"
        >
          <img :src="iconUrl(h.iconId)" alt="" aria-hidden="true" draggable="false" />
        </button>
        <span v-if="battle.playerBurn" class="mini-badge burn">
          <img :src="ICON.burn" alt="" aria-hidden="true" draggable="false" />{{ battle.playerBurn.turns }}
        </span>
        <span v-if="battle.playerPoison" class="mini-badge poison">
          <img :src="ICON.poison" alt="" aria-hidden="true" draggable="false" />{{ battle.playerPoison.turns }}
        </span>
      </div>

      <div class="hp-bar hp-hero">
        <div class="hp-ghost" :style="{ width: `${heroPct}%` }"></div>
        <div class="hp-fill" :style="{ width: `${heroPct}%` }"></div>
        <div v-if="shieldPct > 0" class="hp-shield" :style="{ width: `${shieldPct}%` }">
          <img :src="ICON.shield" alt="" aria-hidden="true" draggable="false" />
        </div>
        <div class="hp-ticks" aria-hidden="true"></div>
        <span class="hp-text num" :class="{ bump: heroBump }">
          {{ battle.playerHP }}<i>/{{ PLAYER_MAX_HP }}</i>
        </span>
      </div>

      <!-- 遗物：图标化，点击展开名称与效果（REQ-RELIC 已持有遗物可见） -->
      <div class="relic-row">
        <button
          v-for="r in relics"
          :key="r.id"
          class="mini-icon relic"
          :aria-label="`${r.name}：${r.desc}`"
          @click="showRelicInfo(r.id)"
        >
          <img :src="iconUrl(r.iconId)" alt="" aria-hidden="true" draggable="false" />
        </button>
        <span v-if="relics.length === 0" class="relic-empty">击败敌人可选遗物</span>
      </div>
    </div>

    <!-- ============ 中央：行动倒计时 ============ -->
    <div class="center-col">
      <template v-if="enemy">
        <div
          class="countdown"
          :class="{ danger: enemy.countdown <= 1 }"
          :style="{ '--cd': `${cdRatio() * 360}deg` }"
          :aria-label="`敌人还有 ${enemy.countdown} 回合行动`"
        >
          <span class="countdown-num num">{{ enemy.countdown }}</span>
          <span class="countdown-label">行动</span>
        </div>
        <span class="vs-text font-title">VS</span>
      </template>
      <span v-else class="vs-text font-title">练习</span>
    </div>

    <!-- ============ 怪物侧 ============ -->
    <div class="side side-enemy" :style="{ '--actor': enemy?.tint ?? '#ff5a3c' }">
      <template v-if="enemy">
        <div class="sprite-box">
          <div class="aura" aria-hidden="true"></div>
          <img
            class="sprite"
            :class="[`act-${battle.enemyAction}`, { 'sprite-frozen': enemy.frozen > 0 }]"
            :src="spriteUrl(enemy.spriteId)"
            :alt="enemy.display"
            draggable="false"
          />
          <div
            v-for="fx in fxOnEnemy"
            :key="fx.id"
            class="hit-fx"
            :class="`fx-${fx.kind}`"
            :style="{ '--fx': fx.color }"
            aria-hidden="true"
          ></div>
        </div>

        <div class="name-row">
          <span class="actor-name font-title">{{ enemy.display }}</span>
          <span v-if="enemy.frozen > 0" class="mini-badge freeze">
            <img :src="ICON.freeze" alt="" aria-hidden="true" draggable="false" />{{ enemy.frozen }}
          </span>
          <span v-if="enemy.stunned > 0" class="mini-badge stun">
            <img :src="ICON.stun" alt="" aria-hidden="true" draggable="false" />{{ enemy.stunned }}
          </span>
          <span v-if="enemy.burn" class="mini-badge burn">
            <img :src="ICON.burn" alt="" aria-hidden="true" draggable="false" />{{ enemy.burn.turns }}
          </span>
          <span v-if="enemy.poison" class="mini-badge poison">
            <img :src="ICON.poison" alt="" aria-hidden="true" draggable="false" />{{ enemy.poison.turns }}
          </span>
          <span v-if="enemy.phaseHP.length > 1" class="phase-tag num">
            {{ enemy.phase }}/{{ enemy.phaseHP.length }}
          </span>
        </div>

        <div class="hp-bar hp-enemy">
          <div class="hp-ghost" :style="{ width: `${enemyPct}%` }"></div>
          <div class="hp-fill" :style="{ width: `${enemyPct}%` }"></div>
          <div class="hp-ticks" aria-hidden="true"></div>
          <span class="hp-text num" :class="{ bump: enemyBump }">
            {{ Math.max(0, enemy.hp) }}<i>/{{ enemy.phaseMaxHp }}</i>
          </span>
        </div>

        <!-- 行动意图：移动端没有 hover，直接写明敌人下次行动会做什么 -->
        <div class="intent-row">
          <span class="intent-tag">意图</span>
          <span class="intent-text">{{ intentText() }}</span>
        </div>

        <!-- 蓄力：容器对所有敌人常驻，保证蓄力条出现/消失时面板高度不变、不顶动棋盘 -->
        <div class="charge-row">
          <template v-if="enemy.charging">
            <span class="charge-tag">蓄力</span>
            <span class="charge-track">
              <i :style="{ width: `${chargeRatio() * 100}%` }"></i>
            </span>
            <span class="charge-text num">
              {{ Math.min(enemy.charging.taken, enemy.charging.interrupt) }}/{{ enemy.charging.interrupt }}
            </span>
          </template>
        </div>
      </template>

      <!-- 教学 1-1：无敌人，显示训练目标（REQ-TUTO-002） -->
      <div v-else class="tutorial-goal">
        <img class="goal-icon" :src="ICON.target" alt="" aria-hidden="true" draggable="false" />
        <span class="goal-text font-title">完成 {{ TUTORIAL_MATCH_TARGET }} 次消除</span>
        <span class="goal-progress">
          <span
            v-for="i in TUTORIAL_MATCH_TARGET"
            :key="i"
            class="goal-dot"
            :class="{ done: i <= battle.tutorialProgress }"
          ></span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-stage {
  position: relative;
  flex-shrink: 0;
  display: grid;
  /* 左右角色等分，中间一列放行动倒计时 —— 保证两侧立绘体量对称 */
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  /* 顶部对齐：两侧立绘框等高，名字/血条必须落在同一水平线上。
     怪物侧多出「意图 + 蓄力」两行，若按底部对齐会把整个立绘顶上去造成错位。 */
  align-items: start;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3) var(--sp-3);
  margin: 0 var(--sp-4);
  overflow: hidden;
  background:
    radial-gradient(ellipse at 16% 100%, rgba(60, 167, 255, 0.14), transparent 58%),
    radial-gradient(ellipse at 84% 100%, rgba(255, 90, 60, 0.14), transparent 58%),
    var(--bg-panel);
}
/* 顶部一道金线：与棋盘共用同一套"魔幻纹章"语言 */
.battle-stage::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: linear-gradient(90deg, rgba(120, 190, 255, 0.55), rgba(212, 175, 55, 0.7), rgba(255, 90, 60, 0.55));
}
/* 中央能量对流：两侧立绘之间一条渐隐的分割线 */
.battle-stage::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 10%;
  bottom: 10%;
  width: 1px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, transparent, rgba(212, 175, 55, 0.2), transparent);
  pointer-events: none;
}

.side {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
}
/* 受击击退方向：英雄被打往左退，怪物被打往右退 */
.side-hero { --knock: -1; }
.side-enemy { --knock: 1; }

/* ---------- 立绘 ---------- */
.sprite-box {
  position: relative;
  /* 立绘高度直接决定"角色体量感"；棋盘按容器实测高度自适应，展示区多高都不会挤压棋盘。
     矮屏（≤681px）下限收到 76px，把高度让给棋盘。 */
  height: clamp(76px, 13.5dvh, 120px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-bottom: 2px;
}

/* 脚下光环：把角色"钉"在地面上，同时用阵营色暗示归属 */
.aura {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 76%;
  height: 11px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(ellipse, color-mix(in srgb, var(--actor) 55%, transparent), transparent 70%);
  filter: blur(4px);
  opacity: 0.75;
}

.sprite {
  position: relative;
  height: 100%;
  width: auto;
  max-width: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.65));
  transform-origin: 50% 92%;
  will-change: translate, filter;
}

/* ---------- 角色四态动画 ---------- */
/* 待机：轻微上下呼吸，让画面"活着" */
.act-idle { animation: actor-idle 2.8s ease-in-out infinite; }
@keyframes actor-idle {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -4px; }
}

/* 出手：向对方方向前冲 + 放大，产生打击的压迫感 */
.act-attack { animation: actor-attack 0.4s cubic-bezier(0.3, 0.9, 0.4, 1); }
@keyframes actor-attack {
  0% { translate: 0 0; scale: 1; }
  32% { translate: calc(var(--knock) * -18px) -5px; scale: 1.07; }
  100% { translate: 0 0; scale: 1; }
}

/* 受击：向后退 + 高亮闪白，方向由 --knock 决定 */
.act-hurt { animation: actor-hurt 0.32s ease-out; }
@keyframes actor-hurt {
  0% { translate: 0 0; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.65)); }
  20% {
    translate: calc(var(--knock) * 8px) 0;
    filter: brightness(2.1) saturate(0.35) drop-shadow(0 0 10px rgba(255, 255, 255, 0.9));
  }
  50% { translate: calc(var(--knock) * -4px) 0; }
  100% { translate: 0 0; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.65)); }
}

/* 死亡：倒地 + 灰化 + 淡出（保持终态，由开局/换波重置） */
.act-dead { animation: actor-dead 1.5s cubic-bezier(0.4, 0, 0.6, 1) forwards; }
@keyframes actor-dead {
  0% { translate: 0 0; rotate: 0deg; opacity: 1; }
  22% { translate: calc(var(--knock) * 7px) 0; rotate: calc(var(--knock) * 4deg); }
  100% {
    translate: calc(var(--knock) * 16px) 12px;
    rotate: calc(var(--knock) * -74deg);
    filter: grayscale(1) brightness(0.4) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
    opacity: 0.2;
  }
}

/* 被冻结的怪物：整体压成霜蓝，与"倒计时暂停"的状态呼应 */
.sprite-frozen {
  filter: grayscale(0.45) brightness(1.08) saturate(0.5)
    drop-shadow(0 0 10px rgba(140, 210, 255, 0.85));
}

/* ---------- 命中特效 ---------- */
.hit-fx { position: absolute; pointer-events: none; z-index: 2; }

/* 斩击：一道斜向白光扫过目标 */
.fx-slash {
  inset: -12%;
  background: linear-gradient(112deg, transparent 41%, #fff 50%, transparent 59%);
  mix-blend-mode: screen;
  animation: fx-slash 0.42s ease-out forwards;
}
@keyframes fx-slash {
  0% { opacity: 0; transform: translateX(-38%) scaleY(0.55); }
  22% { opacity: 1; }
  100% { opacity: 0; transform: translateX(38%) scaleY(1.35); }
}

/* 技能：一道元素光柱自上方贯下 */
.fx-skill {
  left: 50%;
  top: -34%;
  width: 44%;
  height: 150%;
  transform: translateX(-50%);
  background: linear-gradient(180deg, transparent, var(--fx) 28%, #fff 52%, var(--fx) 74%, transparent);
  filter: blur(3px);
  animation: fx-skill 0.5s ease-out forwards;
}
@keyframes fx-skill {
  0% { opacity: 0; scale: 1 0.35; }
  28% { opacity: 1; scale: 1 1; }
  100% { opacity: 0; scale: 1.45 1; }
}

/* 元素爆点：环形冲击波扩散 */
.fx-impact {
  left: 50%;
  top: 52%;
  width: 22%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 3px solid var(--fx);
  transform: translate(-50%, -50%);
  box-shadow: 0 0 22px var(--fx), inset 0 0 14px var(--fx);
  animation: fx-impact 0.46s ease-out forwards;
}
@keyframes fx-impact {
  0% { scale: 0.25; opacity: 1; }
  100% { scale: 4.2; opacity: 0; }
}

/* 治疗：脚下升起的柔和辉光 */
.fx-heal {
  inset: -8%;
  background: radial-gradient(circle at 50% 78%, color-mix(in srgb, var(--fx) 70%, transparent), transparent 62%);
  animation: fx-heal 0.5s ease-out forwards;
}
@keyframes fx-heal {
  0% { opacity: 0; scale: 0.72; }
  38% { opacity: 1; }
  100% { opacity: 0; scale: 1.12; translate: 0 -16px; }
}

/* ---------- 名字行 ---------- */
.name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  /* 与 .mini-icon 同高：英雄侧带支援图标、怪物侧没有，固定行高才能保证两条血条严格齐平 */
  min-height: 17px;
}
.actor-name {
  font-size: 11.5px;
  line-height: 1.3;
  color: var(--actor);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.side-hero .name-row { justify-content: flex-start; }
.side-hero .actor-name { flex-shrink: 1; }
.side-enemy .name-row { justify-content: flex-end; }
.side-enemy .actor-name { flex-shrink: 1; }

/* 支援被动 / 遗物：紧凑图标，点击展开说明 */
.mini-icon {
  flex-shrink: 0;
  width: 17px;
  height: 17px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  cursor: pointer;
  transition: transform var(--dur-fast);
}
.mini-icon:active { transform: scale(0.86); }
.mini-icon img { width: 100%; height: 100%; object-fit: contain; }
.mini-icon.support img { filter: drop-shadow(0 0 3px rgba(60, 167, 255, 0.6)); }
.mini-icon.relic { border-radius: 4px; }
.mini-icon.relic img { filter: drop-shadow(0 0 3px rgba(212, 175, 55, 0.7)); }

.mini-badge {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  flex-shrink: 0;
  font-size: 9px;
  padding: 0 3px 0 1px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.mini-badge img { width: 10px; height: 10px; object-fit: contain; }
.mini-badge.burn { color: #ff9d85; border-color: rgba(255, 120, 80, 0.45); }
.mini-badge.poison { color: #b58bff; border-color: rgba(160, 107, 255, 0.45); }
.mini-badge.freeze { color: #9fdcff; border-color: rgba(140, 210, 255, 0.5); }
.mini-badge.stun { color: #ffd98a; border-color: rgba(240, 200, 120, 0.5); }

.phase-tag {
  flex-shrink: 0;
  font-size: 9px;
  padding: 0 4px;
  border-radius: 6px;
  color: var(--gold-light);
  border: 1px solid var(--border-gold);
}

/* ---------- 血条 ---------- */
.hp-bar {
  position: relative;
  height: 15px;
  margin-top: 3px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(180deg, #1b2230, #10161f);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.09);
}
.hp-enemy { background: linear-gradient(180deg, #2c1a22, #170d13); }

/* 残影条：延迟 0.28s 才追上实心条，把"这一下掉了多少"画出来 */
.hp-ghost {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.55);
  transition: width 0.42s cubic-bezier(0.4, 0, 0.2, 1) 0.28s;
}
.hp-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 8px;
  transition: width 0.22s ease-out;
}
.hp-hero .hp-fill {
  background: linear-gradient(180deg, #7ff0a8, #38c46e 55%, #1c8e4c);
  box-shadow: 0 0 10px rgba(56, 196, 110, 0.5);
}
.hp-enemy .hp-fill {
  background: linear-gradient(180deg, #ff9070, #ec4a3d 55%, #b81f22);
  box-shadow: 0 0 10px rgba(236, 74, 61, 0.55);
}

/* 护盾层：叠在血量之上，直观表达"还有多少护盾在挡" */
.hp-shield {
  position: absolute;
  inset: 0 auto 0 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 2px;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(160, 230, 255, 0.95), rgba(60, 167, 255, 0.85));
  box-shadow: 0 0 10px rgba(104, 216, 255, 0.7);
  transition: width 0.28s ease;
}
.hp-shield img { width: 10px; height: 10px; object-fit: contain; }

/* 血条高光与刻度 */
.hp-bar::before {
  content: '';
  position: absolute;
  inset: 1px 1px auto;
  height: 42%;
  border-radius: 8px 8px 6px 6px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0));
  pointer-events: none;
  z-index: 3;
}
.hp-ticks {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent calc(25% - 1px),
    rgba(0, 0, 0, 0.38) calc(25% - 1px),
    rgba(0, 0, 0, 0.38) 25%
  );
  pointer-events: none;
  z-index: 3;
}
.hp-text {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.hp-text i { font-style: normal; font-weight: 500; opacity: 0.72; }
/* 数值跳动：HP 变化瞬间弹一下，视线会被"数字动了"抓住 */
.hp-text.bump { animation: hp-bump 0.34s cubic-bezier(0.3, 1.6, 0.5, 1); }
@keyframes hp-bump {
  0% { scale: 1; }
  35% { scale: 1.22; }
  100% { scale: 1; }
}

/* ---------- 遗物行 / 意图行 / 蓄力行 ---------- */
.relic-row,
.intent-row,
.charge-row {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 3px;
  min-height: 15px;
}
.relic-row { justify-content: flex-start; }
.intent-row { justify-content: flex-start; }
.charge-row { justify-content: flex-start; }
.relic-empty { font-size: 9px; color: var(--text-3); }

.intent-tag {
  flex-shrink: 0;
  font-size: 9px;
  color: #ffb199;
  border: 1px solid rgba(255, 177, 145, 0.4);
  border-radius: 6px;
  padding: 0 4px;
  line-height: 1.4;
}
.intent-text {
  font-size: 9.5px;
  color: rgba(245, 240, 230, 0.68);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.charge-tag {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  color: #1a0c06;
  background: linear-gradient(180deg, #ffd98a, #f0a03c);
  border-radius: 6px;
  padding: 0 5px;
  animation: charge-blink 0.7s ease-in-out infinite;
}
.charge-track {
  flex: 1;
  min-width: 0;
  height: 6px;
  border-radius: 4px;
  background: linear-gradient(180deg, #2c1a22, #170d13);
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}
.charge-track i {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #ffb347, #ff5a3c);
  box-shadow: 0 0 8px rgba(255, 120, 60, 0.8);
  transition: width 0.28s ease;
}
.charge-text { flex-shrink: 0; font-size: 9px; color: #ffcf9a; }
@keyframes charge-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ---------- 中央倒计时 ---------- */
.center-col {
  /* 中央列单独底对齐：倒计时环落在两条血条之间的高度，与两侧信息行齐平 */
  align-self: end;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding-bottom: 24px;
  min-width: 46px;
}
.vs-text {
  font-size: 11px;
  color: var(--gold-light);
  letter-spacing: 1px;
  opacity: 0.85;
  text-shadow: 0 0 8px rgba(240, 216, 120, 0.6);
}

.countdown {
  --cd: 360deg;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
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
.countdown > * { position: relative; z-index: 1; }
.countdown-num {
  font-size: 19px;
  font-weight: 800;
  color: var(--gold-light);
  line-height: 1;
  text-shadow: 0 0 8px rgba(240, 216, 120, 0.5);
}
.countdown-label { font-size: 8.5px; color: rgba(245, 240, 230, 0.6); }

/* ≤1 回合高亮警告（REQ-ENEMY-001） */
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

/* ---------- 教学关训练目标 ---------- */
.tutorial-goal {
  height: clamp(80px, 12.5dvh, 112px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.goal-icon { width: 26px; height: 26px; object-fit: contain; }
.goal-text { font-size: 12px; color: var(--gold-light); }
.goal-progress { display: flex; gap: 6px; }
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

/* ---------- 状态修饰 ---------- */
/* 生命告急：整块展示区泛红脉冲 */
.stage-low {
  border-color: rgba(255, 90, 60, 0.8);
  animation: stage-low-pulse 1.1s ease-in-out infinite;
}
@keyframes stage-low-pulse {
  0%, 100% { box-shadow: inset 0 0 0 rgba(255, 70, 50, 0); }
  50% { box-shadow: inset 0 0 26px rgba(255, 70, 50, 0.22); }
}
/* Boss：金边强化，与普通怪拉开体量感 */
.stage-boss {
  border-color: var(--border-gold-strong);
  box-shadow: var(--shadow-panel), inset 0 0 30px rgba(212, 175, 55, 0.09);
}
/* 行动预警：出手前整块泛红（REQ-FEEL-005） */
.stage-warn {
  border-color: rgba(255, 90, 60, 0.9);
  animation: warn-pulse 0.5s ease-in-out;
}
@keyframes warn-pulse {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 22px rgba(255, 90, 60, 0.75); }
}
/* 蓄力中：危险色脉冲，提示"要放大招了" */
.stage-charging {
  border-color: rgba(255, 160, 60, 0.85);
  animation: charge-pulse 0.9s ease-in-out infinite;
}
@keyframes charge-pulse {
  0%, 100% { box-shadow: inset 0 0 0 rgba(255, 140, 50, 0); }
  50% { box-shadow: inset 0 0 26px rgba(255, 140, 50, 0.22); }
}
.stage-charging .countdown {
  background: conic-gradient(
    from -90deg,
    #ffb347 0deg,
    #ffb347 var(--cd),
    rgba(255, 255, 255, 0.08) var(--cd),
    rgba(255, 255, 255, 0.08) 360deg
  );
}
.stage-charging .countdown-num {
  color: #ffc46b;
  text-shadow: 0 0 10px rgba(255, 170, 70, 0.9);
}

/* ---------- 宽屏：展示区给足空间，立绘更大 ---------- */
@media (min-width: 860px) {
  .sprite-box,
  .tutorial-goal { height: clamp(130px, 17dvh, 180px); }
  .actor-name { font-size: 14px; }
  .name-row { min-height: 19px; }
  .hp-bar { height: 18px; }
  .hp-text { font-size: 11.5px; }
  .mini-icon { width: 20px; height: 20px; }
  .mini-badge { font-size: 10px; }
  .mini-badge img { width: 11px; height: 11px; }
  .intent-text { font-size: 10.5px; }
  .countdown { width: 54px; height: 54px; }
  .countdown-num { font-size: 22px; }
  .countdown-label { font-size: 9px; }
  .vs-text { font-size: 13px; }
  .goal-text { font-size: 14px; }
}

/* ============================================================
 * 矮屏（≤760px 高）：展示区压扁，把高度让给棋盘
 *
 * 展示区是棋盘之外最高的一块（375×667 上 179px，其中立绘 90px）。
 * 这里按「立绘变小 → 行高收紧 → 内边距收紧」的顺序让位：
 * 压完约 130px，棋盘因此能多吃约 50px 高度，回到约 90% 屏宽。
 * 信息区（宝石/技能）不动，保证技能页不被裁切。
 * 断点与 BattleView.vue 的矮屏规则保持同一数值。
 * 必须放在宽屏规则之后：矮屏优先于宽屏（棋盘优先于展示区）。
 * ============================================================ */
@media (max-height: 760px) {
  .battle-stage { padding: var(--sp-1) var(--sp-3); }
  /* 立绘下限收到 48px：8×8 棋盘上仍能一眼认出角色阵营与动作 */
  .sprite-box,
  .tutorial-goal { height: clamp(48px, 8.5dvh, 88px); }
  .name-row { min-height: 14px; }
  .actor-name { font-size: 11px; }
  .hp-bar {
    height: 12px;
    margin-top: 2px;
  }
  .hp-text { font-size: 9.5px; }
  .relic-row,
  .intent-row,
  .charge-row {
    min-height: 13px;
    margin-top: 2px;
  }
  .mini-icon {
    width: 15px;
    height: 15px;
  }
  .mini-badge { font-size: 8.5px; }
  .intent-text { font-size: 9px; }
}
</style>
