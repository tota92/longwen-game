<script setup lang="ts">
/**
 * 战斗舞台（REQ-UI 顶部区域）—— 横板对战场景
 *
 * 版式：一条通栏 HUD + 一块横向对战场景。
 *   HUD     英雄血条 / 怪物血条 —— 只占一行（倒计时不挤占血条）
 *   次要区  支援·遗物·状态徽记（左）· 敌人行动倒计时·意图/蓄力（右）—— 单行图标与文本
 *           · 行动倒计时以胶囊取代"意图"标签，与意图文案并列，归属敌方一目了然
 *   场景    双方立绘站在同一条地面线上横向相对，攻击 = 冲到对手身前
 * 原先铺在立绘下方的一叠信息行（名字/血条/意图/蓄力/遗物各占一行）被压进这两行，
 * 舞台高度不变的前提下，画面留给"角色与特效"的比例从约五成提升到约七成。
 *
 * 攻击交互（横板手感 = 三段式位移）：
 *   出手 后撤蓄势 → 前冲（冲程 = 两侧实测间距，见 measureLunge）→ 命中定格 → 回身
 *   受击 延迟 140ms 闪白后仰（与命中特效同拍，等出手方真的"打到"）→ 死亡倒地消散
 *   特效 斩击火花 / 技能光柱 + 冲击环 + 光刺 / 施法爆闪 / 重击冲击波（见 fx-* 样式）
 *
 * 伤害数字渲染在"挨打那一方"的头顶（FloatText.side 由 store 给出），
 * 不再按屏幕百分比定位 —— 宽屏双栏与竖屏单列的版式差异都不会让数字飘错位置。
 * 角色形象仍是 public/sprites/ 下的 640px 透明立绘，由 idle/attack/hurt/dead 四态驱动。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { ELEMENT_INFO, PLAYER_MAX_HP, TUTORIAL_MATCH_TARGET } from '@/config/constants'
import { iconUrl } from '@/utils/icons'
import { spriteUrl } from '@/utils/sprites'
import type { FloatText, HeroConfig } from '@/types'

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
// 血条：比例 + 延迟残影 + 数值跳动
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

/** 生命告急（<30%）：英雄侧泛红警戒，与遗物「绝境反击」阈值一致 */
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
 * 状态行只展示技能名（短、不省略）；完整说明走 intentTip() 呈现于提示区。
 * 修 REQ-FEEL-005「怪物信息太长导致文字省略」：意图改为短名 + 点击看说明。
 */
function intentBrief(): string {
  const e = enemy.value
  if (!e) return ''
  if (e.charging) return `蓄力 · ${e.charging.release}`
  const action = e.pattern && e.pattern.length > 0 ? e.pattern[e.patternIndex % e.pattern.length] : null
  if (action?.name) return action.name
  switch (e.skill.type) {
    case 'freezeBoard':
      return `冻结 ${e.skill.size}×${e.skill.size}`
    default:
      return '攻击'
  }
}

/** 点击意图：把完整技能说明弹到提示区（状态行容不下长文案） */
function showIntentTip(): void {
  store.showTip(intentText(), 4200)
}

/** 蓄力进度（已承受伤害 / 打断阈值） */
function chargeRatio(): number {
  const c = enemy.value?.charging
  if (!c || c.interrupt <= 0) return 0
  return Math.max(0, Math.min(1, c.taken / c.interrupt))
}

/** 行动预警：敌人出手前整块场景泛红（REQ-FEEL-005） */
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
// 飘字 / 命中特效分流
// ------------------------------------------------------------------

/** 飘字：落在挨打/受益那一方的头顶 */
const floatsOnHero = computed(() => store.floatTexts.filter((f) => f.side === 'hero'))
const floatsOnEnemy = computed(() => store.floatTexts.filter((f) => f.side === 'enemy'))

/**
 * 命中特效分流。side = 出手方，特效默认落在其对面角色身上；
 * heal（治疗光辉）与 cast（施法爆闪）例外 —— 落点就是施法者自己。
 */
function fxLandsOnHero(f: { kind: string; side: 'hero' | 'enemy' }): boolean {
  return f.kind === 'heal' || f.kind === 'cast' ? f.side === 'hero' : f.side === 'enemy'
}
const fxOnHero = computed(() => store.hitFxs.filter(fxLandsOnHero))
const fxOnEnemy = computed(() => store.hitFxs.filter((f) => !fxLandsOnHero(f)))

/** 飘字横向错位：同回合多条飘字（连击/状态叠加）不叠在同一像素上 */
function jitterOf(id: number): string {
  return `${((id * 37) % 25) - 12}px`
}

/** 飘字纵向错位：三条一循环抬高起跳点，同帧出现的伤害/治疗数字不会糊成一团 */
function liftOf(id: number): string {
  return `${(id % 3) * 10}px`
}

// ------------------------------------------------------------------
// 前冲冲程实测
// ------------------------------------------------------------------

const sceneEl = ref<HTMLElement | null>(null)
const heroSlot = ref<HTMLElement | null>(null)
const enemySlot = ref<HTMLElement | null>(null)
const heroSprite = ref<HTMLImageElement | null>(null)
const enemySprite = ref<HTMLImageElement | null>(null)

/**
 * 前冲距离（px）：直接量两侧角色当前的横向间距，
 * 出手方一定冲到对手身前（而不是原地挥拳）。立绘尺寸/屏幕宽度变化都会重新实测。
 */
const lunge = ref({ hero: 24, enemy: 24 })
/**
 * 单次前冲最多吃掉场景宽度的这个比例。
 * 取 0.5：宽屏上两人间距大（数百 px），上限太低会让角色"冲到一半就停"；
 * 上限的意义只是兜底，避免极端窄屏上双方立绘在中央叠成一团。
 */
const LUNGE_MAX_RATIO = 0.5

function measureLunge(): void {
  const scene = sceneEl.value
  const hero = heroSlot.value
  const enemyEl = enemySlot.value
  if (!scene || !hero || !enemyEl) return
  const sw = scene.clientWidth
  const h = hero.getBoundingClientRect()
  const e = enemyEl.getBoundingClientRect()
  if (!sw || h.width === 0 || e.width === 0) return
  // 双向共用同一段"两人之间的空档"：英雄向右冲、怪物向左冲，行程相同、方向由 --dir 决定
  // +6px：冲进对手轮廓一点，"打到人"的手感来自越过对手身位
  const gap = Math.max(14, Math.min(e.left - h.right + 6, sw * LUNGE_MAX_RATIO))
  lunge.value = { hero: gap, enemy: gap }
}

let ro: ResizeObserver | null = null
onMounted(() => {
  measureLunge()
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(() => measureLunge())
    for (const el of [sceneEl.value, heroSlot.value, enemySlot.value]) if (el) ro.observe(el)
  }
})
onBeforeUnmount(() => ro?.disconnect())
// 换英雄 / 换怪后立绘尺寸变化：等图片进 DOM 再实测一次（图片 onload 也会触发）
watch([() => enemy.value?.spriteId, () => leader.value.spriteId], () => nextTick(measureLunge))

// ------------------------------------------------------------------
// 动作动画重播
// ------------------------------------------------------------------

/** 把元素上正在播放的动作动画拉回第 0 帧（不支持的环境静默跳过） */
function restartAction(el: HTMLElement | null): void {
  if (!el || typeof el.getAnimations !== 'function') return
  for (const anim of el.getAnimations()) {
    if (anim.playState === 'idle') continue
    anim.currentTime = 0
  }
}

/**
 * 连锁消除时同一动作会被连续触发（动作值不变 → CSS 动画不会重播），
 * 这里以"新命中特效出现"为节拍，把出手/受击动画重置到第 0 帧，
 * 保证每一次出手都能看到完整的冲刺与打击反馈（dot 伤害不出手，只在受击侧重播）。
 */
const lastFxId = computed(() => store.hitFxs[store.hitFxs.length - 1]?.id ?? 0)
watch(
  lastFxId,
  (id) => {
    const fx = store.hitFxs.find((f) => f.id === id)
    if (!fx || fx.kind === 'heal' || fx.kind === 'cast') return
    if (fx.side === 'hero') {
      if (battle.heroAction === 'attack') restartAction(heroSprite.value)
      if (battle.enemyAction === 'hurt') restartAction(enemySprite.value)
    } else {
      if (battle.enemyAction === 'attack') restartAction(enemySprite.value)
      if (battle.heroAction === 'hurt') restartAction(heroSprite.value)
    }
  },
  { flush: 'post' }
)

/** 支援被动 / 遗物：移动端无 hover，点击后用提示区展开说明 */
function showSupportInfo(h: HeroConfig): void {
  store.showTip(`${h.name} 支援 · ${h.passiveDesc}`, 3200)
}
function showRelicInfo(id: string): void {
  const r = store.getRelicInfo(id)
  store.showTip(`${r.name}：${r.desc}`, 3600)
}

/** 飘字类型 → 样式类（暴露给模板做类型收敛） */
const floatClass = (ft: FloatText): string => `dmg-${ft.kind}`
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
    :style="{ '--lunge-hero': `${lunge.hero}px`, '--lunge-enemy': `${lunge.enemy}px` }"
  >
    <!-- ============ HUD：双方血条 + 行动倒计时（只占一行） ============ -->
    <div class="hud-row">
      <div class="plate plate-hero" :style="{ '--actor': heroElement.color }">
        <span class="p-name font-title">{{ leader.name }}</span>
        <span class="p-bar">
          <i class="p-ghost" :style="{ width: `${heroPct}%` }"></i>
          <i class="p-fill" :style="{ width: `${heroPct}%` }"></i>
          <i v-if="shieldPct > 0" class="p-shield" :style="{ width: `${shieldPct}%` }">
            <img :src="ICON.shield" alt="" aria-hidden="true" draggable="false" />
          </i>
          <i class="p-ticks" aria-hidden="true"></i>
        </span>
        <span class="p-num num" :class="{ bump: heroBump }">{{ battle.playerHP }}</span>
      </div>

      <div v-if="enemy" class="plate plate-enemy" :style="{ '--actor': enemy.tint ?? '#ff5a3c' }">
        <span class="p-num num" :class="{ bump: enemyBump }">{{ Math.max(0, enemy.hp) }}</span>
        <span class="p-bar">
          <i class="p-ghost" :style="{ width: `${enemyPct}%` }"></i>
          <i class="p-fill" :style="{ width: `${enemyPct}%` }"></i>
          <i class="p-ticks" aria-hidden="true"></i>
        </span>
        <span class="p-name font-title">{{ enemy.display }}</span>
        <span v-if="isBoss" class="p-phase num">{{ enemy.phase }}/{{ enemy.phaseHP.length }}</span>
      </div>
      <div v-else class="plate plate-empty" aria-hidden="true"></div>
    </div>

    <!-- ============ 次要信息：徽记/支援/遗物（左）· 意图/蓄力（右） ============ -->
    <div class="meta-row">
      <div class="meta-side meta-hero">
        <span v-if="battle.playerBurn" class="mini-badge burn">
          <img :src="ICON.burn" alt="" aria-hidden="true" draggable="false" />{{ battle.playerBurn.turns }}
        </span>
        <span v-if="battle.playerPoison" class="mini-badge poison">
          <img :src="ICON.poison" alt="" aria-hidden="true" draggable="false" />{{ battle.playerPoison.turns }}
        </span>
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
        <!-- 遗物：图标化，点击展开名称与效果（REQ-RELIC 已持有遗物可见）；空槽不再占位 -->
        <button
          v-for="r in relics"
          :key="r.id"
          class="mini-icon relic"
          :aria-label="`${r.name}：${r.desc}`"
          @click="showRelicInfo(r.id)"
        >
          <img :src="iconUrl(r.iconId)" alt="" aria-hidden="true" draggable="false" />
        </button>
      </div>

      <div v-if="enemy" class="meta-side meta-enemy">
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
        <!-- 蓄力中：倒计时 + 技能名(点击看说明) + 打断进度 -->
        <template v-if="enemy.charging">
          <div
            class="timer"
            :class="{ danger: enemy.countdown <= 1 }"
            role="img"
            :aria-label="`敌人还有 ${enemy.countdown} 回合行动`"
          >
            <span class="timer-num num">{{ enemy.countdown }}</span>
            <span class="timer-label">行动</span>
          </div>
          <button class="intent" @click="showIntentTip">
            <span class="intent-name">{{ intentBrief() }}</span>
          </button>
          <span class="charge-track">
            <i :style="{ width: `${chargeRatio() * 100}%` }"></i>
          </span>
          <span class="charge-text num">
            {{ Math.min(enemy.charging.taken, enemy.charging.interrupt) }}/{{ enemy.charging.interrupt }}
          </span>
        </template>
        <template v-else>
          <div
            class="timer"
            :class="{ danger: enemy.countdown <= 1 }"
            role="img"
            :aria-label="`敌人还有 ${enemy.countdown} 回合行动`"
          >
            <span class="timer-num num">{{ enemy.countdown }}</span>
            <span class="timer-label">行动</span>
          </div>
          <button class="intent" @click="showIntentTip">
            <span class="intent-name">{{ intentBrief() }}</span>
          </button>
        </template>
      </div>
    </div>

    <!-- ============ 对战场景：同一条地面线，横向相对 ============ -->
    <div ref="sceneEl" class="scene">
      <div class="deco" aria-hidden="true"></div>
      <div class="ground" aria-hidden="true">
        <i class="g-glow g-hero" :style="{ '--actor': heroElement.color }"></i>
        <i class="g-glow g-enemy" :style="{ '--actor': enemy?.tint ?? '#ff5a3c' }"></i>
      </div>

      <!-- 英雄侧 -->
      <div ref="heroSlot" class="side side-hero" :style="{ '--actor': heroElement.color }">
        <div class="shadow" aria-hidden="true"></div>
        <img
          ref="heroSprite"
          class="sprite"
          :class="`act-${battle.heroAction}`"
          :src="spriteUrl(leader.spriteId)"
          :alt="leader.name"
          draggable="false"
          @load="measureLunge"
        />
        <!-- 前冲拖影：出手时在身后拉出一道同色残影 -->
        <div v-if="battle.heroAction === 'attack'" class="trail" aria-hidden="true"></div>
        <div
          v-for="fx in fxOnHero"
          :key="fx.id"
          class="hit-fx"
          :class="`fx-${fx.kind}`"
          :style="{ '--fx': fx.color }"
          aria-hidden="true"
        ></div>
        <div class="dmg-layer" aria-hidden="true">
          <span
            v-for="ft in floatsOnHero"
            :key="ft.id"
            class="dmg"
            :class="floatClass(ft)"
            :style="{ '--jx': jitterOf(ft.id), '--jy': liftOf(ft.id) }"
            >{{ ft.text }}</span
          >
        </div>
      </div>

      <!-- 怪物侧 -->
      <div
        v-if="enemy"
        ref="enemySlot"
        class="side side-enemy"
        :style="{ '--actor': enemy.tint ?? '#ff5a3c' }"
      >
        <div class="shadow" aria-hidden="true"></div>
        <!-- 蓄力中：脚下升起橙红蓄能光 -->
        <div v-if="enemy.charging" class="charge-aura" aria-hidden="true"></div>
        <img
          ref="enemySprite"
          class="sprite"
          :class="[`act-${battle.enemyAction}`, { 'sprite-frozen': enemy.frozen > 0 }]"
          :src="spriteUrl(enemy.spriteId)"
          :alt="enemy.display"
          draggable="false"
          @load="measureLunge"
        />
        <div v-if="battle.enemyAction === 'attack'" class="trail" aria-hidden="true"></div>
        <div
          v-for="fx in fxOnEnemy"
          :key="fx.id"
          class="hit-fx"
          :class="`fx-${fx.kind}`"
          :style="{ '--fx': fx.color }"
          aria-hidden="true"
        ></div>
        <div class="dmg-layer" aria-hidden="true">
          <span
            v-for="ft in floatsOnEnemy"
            :key="ft.id"
            class="dmg"
            :class="floatClass(ft)"
            :style="{ '--jx': jitterOf(ft.id), '--jy': liftOf(ft.id) }"
            >{{ ft.text }}</span
          >
        </div>
      </div>

      <!-- 教学 1-1：无敌人，训练目标压成场景顶部的胶囊（REQ-TUTO-002） -->
      <div v-else class="goal-chip">
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

      <!-- 敌人行动预警：整场泛红 + 怪物侧红光（REQ-FEEL-005） -->
      <div v-if="warning" class="warn-fx" aria-hidden="true"></div>
      <!-- 生命告急：英雄侧红光呼吸 -->
      <div v-if="heroLow" class="low-fx" aria-hidden="true"></div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
 * 舞台骨架：一行 HUD + 一行次要信息 + 一块对战场景
 * 舞台高度固定（不随战斗内容变化），棋盘尺寸因此稳定；
 * 场景吃掉剩余的全部高度 —— 角色与特效是主角，信息压成两行 HUD。
 * ============================================================ */
.battle-stage {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  height: clamp(132px, 22dvh, 196px);
  padding: 5px var(--sp-3) 6px;
  margin: 0 var(--sp-4);
  overflow: hidden;
  /* 命中特效 / 伤害数字统一延迟到"出手方打到人"的那一刻（≈ 前冲 34% 处） */
  --fx-delay: 0.14s;
  /* 地面高度：角色站立基准线，场景内的百分比与发光都以它为准 */
  --ground-h: 22px;
  background:
    radial-gradient(ellipse at 16% 0%, rgba(60, 167, 255, 0.1), transparent 55%),
    radial-gradient(ellipse at 84% 0%, rgba(255, 90, 60, 0.1), transparent 55%),
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

/* ---------- HUD 行 ---------- */
.hud-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
}

/* 血条牌：名字 + 条 + 数值挤在一行，颜色取自各自阵营 */
.plate {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  padding: 2px 5px;
  border-radius: 8px;
  background: rgba(10, 7, 18, 0.62);
  border: 1px solid color-mix(in srgb, var(--actor) 45%, transparent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
.plate-empty {
  justify-content: center;
  min-height: 18px;
  background: rgba(10, 7, 18, 0.3);
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.08);
}
.p-name {
  flex-shrink: 1;
  min-width: 0;
  max-width: 44%;
  font-size: 11px;
  line-height: 1.25;
  color: var(--actor);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}
.p-num {
  flex-shrink: 0;
  min-width: 22px;
  text-align: center;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
/* 数值跳动：HP 变化瞬间弹一下，视线会被"数字动了"抓住 */
.p-num.bump { animation: hp-bump 0.34s cubic-bezier(0.3, 1.6, 0.5, 1); }
@keyframes hp-bump {
  0% { scale: 1; }
  35% { scale: 1.3; }
  100% { scale: 1; }
}

.p-bar {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 11px;
  border-radius: 6px;
  overflow: hidden;
  background: linear-gradient(180deg, #1b2230, #10161f);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}
.plate-enemy .p-bar { background: linear-gradient(180deg, #2c1a22, #170d13); }

/* 残影条：延迟 0.28s 才追上实心条，把"这一下掉了多少"画出来 */
.p-ghost,
.p-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 6px;
}
.p-ghost {
  background: rgba(255, 255, 255, 0.55);
  transition: width 0.42s cubic-bezier(0.4, 0, 0.2, 1) 0.28s;
}
.p-fill { transition: width 0.22s ease-out; }
/* 怪物血条镜像：从右往左掉血，与英雄形成左右对望的横板构图 */
.plate-enemy .p-ghost,
.plate-enemy .p-fill {
  left: auto;
  right: 0;
}
.plate-hero .p-fill {
  background: linear-gradient(180deg, #7ff0a8, #38c46e 55%, #1c8e4c);
  box-shadow: 0 0 10px rgba(56, 196, 110, 0.5);
}
.plate-enemy .p-fill {
  background: linear-gradient(270deg, #ff9070, #ec4a3d 55%, #b81f22);
  box-shadow: 0 0 10px rgba(236, 74, 61, 0.55);
}

/* 护盾层：叠在血量之上，直观表达"还有多少护盾在挡" */
.p-shield {
  position: absolute;
  inset: 0 auto 0 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 2px;
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(160, 230, 255, 0.95), rgba(60, 167, 255, 0.85));
  box-shadow: 0 0 10px rgba(104, 216, 255, 0.7);
  transition: width 0.28s ease;
}
.p-shield img { width: 9px; height: 9px; object-fit: contain; }

/* 血条高光与刻度 */
.p-bar::before {
  content: '';
  position: absolute;
  inset: 1px 1px auto;
  height: 42%;
  border-radius: 6px 6px 4px 4px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0));
  pointer-events: none;
  z-index: 3;
}
.p-ticks {
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

/* ---------- 敌方行动倒计时（并入 meta 敌侧行，取代"意图"标签，与意图文案并列） ---------- */
.timer {
  flex-shrink: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--border-gold);
  line-height: 1.4;
}
.timer-num {
  font-size: 12px;
  font-weight: 800;
  color: var(--gold-light);
  text-shadow: 0 0 6px rgba(240, 216, 120, 0.5);
}
.timer-label {
  font-size: 9px;
  color: rgba(245, 240, 230, 0.6);
}
/* ≤1 回合：红色脉冲，提示下回合敌人就要动手 */
.timer.danger {
  border-color: #ff6a45;
  animation: cd-danger 0.6s ease-in-out infinite;
}
.timer.danger .timer-num {
  color: #ff7a59;
  text-shadow: 0 0 8px rgba(255, 90, 60, 0.9);
}
@keyframes cd-danger {
  0%, 100% { box-shadow: 0 0 0 rgba(255, 90, 60, 0); }
  50% { box-shadow: 0 0 12px rgba(255, 90, 60, 0.9); }
}

/* ---------- 次要信息行 ---------- */
.meta-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
  min-height: 15px;
}
.meta-side {
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
}
.meta-hero { justify-content: flex-start; }
.meta-enemy { justify-content: flex-end; }

/* 支援被动 / 遗物：紧凑图标，点击展开说明 */
.mini-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
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

.p-phase {
  flex-shrink: 0;
  font-size: 9px;
  padding: 0 4px;
  border-radius: 6px;
  color: var(--gold-light);
  border: 1px solid var(--border-gold);
}

/* 意图：只展示技能名（短、单行不省略），点击弹完整说明到提示区 */
.intent {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
  font-size: 9.5px;
  color: var(--gold-light);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline dotted rgba(240, 216, 120, 0.4);
  text-underline-offset: 2px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
}
.intent:hover .intent-name { color: var(--gold-light); }
.intent:active .intent-name { opacity: 0.75; }
.intent-name { white-space: nowrap; }

.charge-track {
  flex: 1;
  min-width: 0;
  max-width: 96px;
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

/* ============================================================
 * 对战场景：横板竞技场的舞台本体
 * ============================================================ */
.scene {
  position: relative;
  flex: 1;
  min-height: 0;
  border-radius: 10px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(24, 18, 44, 0.85), rgba(40, 24, 52, 0.6) 62%, rgba(62, 34, 58, 0.78)),
    radial-gradient(ellipse at 50% 106%, rgba(212, 175, 55, 0.22), transparent 62%);
  box-shadow: inset 0 0 26px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/* 远景：两团山影，把"场地"从纯色块变成有纵深的场景 */
.deco {
  position: absolute;
  inset: auto 0 0;
  height: 64%;
  pointer-events: none;
  background:
    radial-gradient(58% 120% at 12% 100%, rgba(88, 72, 140, 0.5), transparent 72%),
    radial-gradient(52% 104% at 74% 100%, rgba(122, 74, 96, 0.42), transparent 74%),
    radial-gradient(40% 84% at 44% 100%, rgba(70, 60, 120, 0.35), transparent 78%);
}

/* 地面：一条发光地基线，双方脚踏其上 —— 横板构图的空间基准 */
.ground {
  position: absolute;
  inset: auto 0 0;
  height: var(--ground-h);
  background: linear-gradient(180deg, rgba(126, 100, 156, 0.5), rgba(24, 14, 30, 0.92) 46%, rgba(12, 8, 18, 0.96));
  border-top: 1px solid rgba(240, 216, 120, 0.35);
  box-shadow: 0 -6px 18px rgba(0, 0, 0, 0.45);
}
.ground::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(90deg, transparent 0 22px, rgba(255, 255, 255, 0.05) 22px 23px);
  opacity: 0.6;
}
/* 阵营色地面光：把两侧归属感从立绘延伸到场上 */
.g-glow {
  position: absolute;
  bottom: 0;
  width: 46%;
  height: 210%;
  filter: blur(4px);
  background: radial-gradient(ellipse at 50% 100%, color-mix(in srgb, var(--actor) 55%, transparent), transparent 68%);
}
.g-hero { left: -4%; }
.g-enemy { right: -4%; }

/* ---------- 角色槽位：绝对定位在场景两端，站在同一条地面线上 ---------- */
.side {
  position: absolute;
  bottom: calc(var(--ground-h) - 4px);
  height: calc(100% - var(--ground-h) + 4px);
  display: flex;
  align-items: flex-end;
  z-index: 3;
}
/* --dir 出手方向 / --knock 受击击退方向 / --lunge 前冲冲程（脚本实测） */
.side-hero {
  left: 6%;
  --dir: 1;
  --knock: -1;
  --lunge: var(--lunge-hero, 24px);
}
.side-enemy {
  right: 5%;
  --dir: -1;
  --knock: 1;
  --lunge: var(--lunge-enemy, 24px);
}

/* 脚下光环 + 接触阴影：把立绘"钉"在地面上，避免角色漂浮 */
.side::before {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  width: 86%;
  height: 10px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(ellipse, color-mix(in srgb, var(--actor) 60%, transparent), transparent 70%);
  filter: blur(4px);
  opacity: 0.8;
}
.shadow {
  position: absolute;
  bottom: -3px;
  left: 50%;
  width: 62%;
  height: 7px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.7), transparent 72%);
}

.sprite {
  position: relative;
  height: 100%;
  width: auto;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.7));
  transform-origin: 50% 92%;
  will-change: translate, filter;
  z-index: 2;
}

/* 前冲拖影：出手瞬间在身后拉出的一道阵营色残影 */
.trail {
  position: absolute;
  top: 18%;
  bottom: 6%;
  width: 160%;
  z-index: 1;
  pointer-events: none;
  animation: dash-trail 0.32s ease-out;
}
.side-hero .trail {
  right: 44%;
  background: linear-gradient(270deg, color-mix(in srgb, var(--actor) 60%, transparent), transparent 78%);
  -webkit-mask: linear-gradient(180deg, transparent, #000 32%, #000 78%, transparent);
  mask: linear-gradient(180deg, transparent, #000 32%, #000 78%, transparent);
}
.side-enemy .trail {
  left: 44%;
  background: linear-gradient(90deg, color-mix(in srgb, var(--actor) 60%, transparent), transparent 78%);
  -webkit-mask: linear-gradient(180deg, transparent, #000 32%, #000 78%, transparent);
  mask: linear-gradient(180deg, transparent, #000 32%, #000 78%, transparent);
}
@keyframes dash-trail {
  0% { opacity: 0; translate: calc(var(--dir) * 12px) 0; scale: 0.6 1; }
  25% { opacity: 0.9; }
  100% { opacity: 0; translate: calc(var(--dir) * -26px) 0; scale: 1.3 1; }
}

/* ---------- 角色四态动画 ---------- */
/* 待机：轻微上下呼吸，让画面"活着" */
.act-idle { animation: actor-idle 2.8s ease-in-out infinite; }
@keyframes actor-idle {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -4px; }
}

/*
 * 出手：横板三段式前冲 —— 后撤蓄势 → 冲到对手身前 → 命中定格 → 回身。
 * 冲程由 --lunge 决定（脚本按两侧实测间距写入），因此不论立绘多宽、
 * 屏幕多窄，出手方一定"打得到"对面，而不是在原地做一个挥拳动作。
 */
.act-attack { animation: actor-attack 0.46s cubic-bezier(0.34, 0.9, 0.3, 1); }
@keyframes actor-attack {
  0% { translate: 0 0; rotate: 0deg; scale: 1; }
  15% { translate: calc(var(--dir) * -8px) 0; rotate: calc(var(--dir) * -3deg); scale: 0.985; }
  34% { translate: calc(var(--dir) * var(--lunge)) -6px; rotate: calc(var(--dir) * 6deg); scale: 1.05; }
  50% { translate: calc(var(--dir) * var(--lunge)) -4px; rotate: calc(var(--dir) * 5deg); scale: 1.03; }
  72% { translate: calc(var(--dir) * var(--lunge) * 0.18) 0; rotate: calc(var(--dir) * 1deg); }
  100% { translate: 0 0; rotate: 0deg; scale: 1; }
}

/* 受击：延迟 0.14s 起跳（等出手方打到身上），向后击退 + 闪白 */
.act-hurt { animation: actor-hurt 0.34s ease-out 0.14s; }
@keyframes actor-hurt {
  0% { translate: 0 0; filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.7)); }
  22% {
    translate: calc(var(--knock) * 12px) 2px;
    filter: brightness(2.4) saturate(0.3) drop-shadow(0 0 12px rgba(255, 255, 255, 0.95));
  }
  55% { translate: calc(var(--knock) * 3px) 0; }
  100% { translate: 0 0; filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.7)); }
}

/* 死亡：倒地 + 灰化 + 淡出（保持终态，由开局/换波重置） */
.act-dead { animation: actor-dead 1.45s cubic-bezier(0.4, 0, 0.6, 1) 0.1s forwards; }
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

/* 蓄力中：脚下升起的橙红蓄能光 */
.charge-aura {
  position: absolute;
  inset: -12% -18% 0;
  z-index: 1;
  pointer-events: none;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 72%, rgba(255, 160, 60, 0.42), transparent 62%);
  animation: charge-aura 0.9s ease-in-out infinite;
}
@keyframes charge-aura {
  0%, 100% { opacity: 0.35; scale: 1; }
  50% { opacity: 0.95; scale: 1.06; }
}

/* ============================================================
 * 命中特效：所有特效延迟 --fx-delay（≈ 出手方冲到人前的时间点）
 * ============================================================ */
.hit-fx {
  position: absolute;
  pointer-events: none;
  z-index: 4;
}

/* 普攻斩击：斜向白光扫过 + 命中火花四溅 */
.fx-slash {
  inset: -10% -14%;
  background: linear-gradient(112deg, transparent 41%, #fff 50%, transparent 59%);
  mix-blend-mode: screen;
  animation: fx-slash 0.42s ease-out var(--fx-delay) forwards;
}
.fx-slash::after {
  content: '';
  position: absolute;
  left: 48%;
  top: 44%;
  width: 46%;
  aspect-ratio: 1;
  translate: -50% -50%;
  background: repeating-conic-gradient(from 6deg, rgba(255, 255, 255, 0.95) 0 3deg, transparent 3deg 26deg);
  -webkit-mask: radial-gradient(circle, transparent 30%, #000 36%, #000 54%, transparent 64%);
  mask: radial-gradient(circle, transparent 30%, #000 36%, #000 54%, transparent 64%);
  opacity: 0;
  animation: fx-spark 0.4s ease-out calc(var(--fx-delay) + 0.04s) forwards;
}
@keyframes fx-slash {
  0% { opacity: 0; transform: translateX(-40%) scaleY(0.5); }
  24% { opacity: 1; }
  100% { opacity: 0; transform: translateX(40%) scaleY(1.4); }
}
@keyframes fx-spark {
  0% { opacity: 0; scale: 0.4; rotate: -14deg; }
  30% { opacity: 1; }
  100% { opacity: 0; scale: 1.5; rotate: 8deg; }
}

/* 技能：贯穿光柱 + 落点冲击环 + 光刺爆发（三层叠加 = 一次技能该有的体量） */
.fx-skill {
  left: 50%;
  top: -40%;
  width: 54%;
  height: 175%;
  transform: translateX(-50%);
  background: linear-gradient(180deg, transparent, var(--fx) 26%, #fff 50%, var(--fx) 72%, transparent);
  filter: blur(3px);
  animation: fx-skill 0.5s ease-out var(--fx-delay) forwards;
}
.fx-skill::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 5%;
  width: 92%;
  aspect-ratio: 1;
  translate: -50% 0;
  border-radius: 50%;
  border: 3px solid var(--fx);
  box-shadow: 0 0 22px var(--fx), inset 0 0 14px var(--fx);
  opacity: 0;
  animation: fx-ring 0.5s ease-out calc(var(--fx-delay) + 0.06s) forwards;
}
.fx-skill::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 40%;
  width: 132%;
  aspect-ratio: 1;
  translate: -50% -50%;
  background: repeating-conic-gradient(from 10deg, var(--fx) 0 2.5deg, transparent 2.5deg 22deg);
  -webkit-mask: radial-gradient(circle, transparent 24%, #000 32%, #000 56%, transparent 66%);
  mask: radial-gradient(circle, transparent 24%, #000 32%, #000 56%, transparent 66%);
  opacity: 0;
  animation: fx-spark 0.52s ease-out calc(var(--fx-delay) + 0.06s) forwards;
}
@keyframes fx-skill {
  0% { opacity: 0; scale: 1 0.3; }
  30% { opacity: 1; scale: 1 1; }
  100% { opacity: 0; scale: 1.4 1; }
}
@keyframes fx-ring {
  0% { opacity: 0.9; scale: 0.3; }
  100% { opacity: 0; scale: 2.6; }
}

/* 重击爆点（怪物普攻）：扩散冲击波 + 中心白闪 */
.fx-impact {
  left: 50%;
  top: 50%;
  width: 26%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 3px solid var(--fx);
  transform: translate(-50%, -50%);
  box-shadow: 0 0 22px var(--fx), inset 0 0 14px var(--fx);
  animation: fx-impact 0.46s ease-out var(--fx-delay) forwards;
}
.fx-impact::after {
  content: '';
  position: absolute;
  inset: 24%;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 30%, color-mix(in srgb, var(--fx) 80%, transparent) 60%, transparent 72%);
  animation: fx-flash 0.3s ease-out var(--fx-delay) forwards;
}
@keyframes fx-impact {
  0% { scale: 0.25; opacity: 1; }
  100% { scale: 4; opacity: 0; }
}
@keyframes fx-flash {
  0% { opacity: 0; scale: 0.4; }
  30% { opacity: 1; }
  100% { opacity: 0; scale: 1.4; }
}

/* 治疗：脚下升起的柔和辉光 */
.fx-heal {
  inset: -8%;
  background: radial-gradient(circle at 50% 78%, color-mix(in srgb, var(--fx) 70%, transparent), transparent 62%);
  animation: fx-heal 0.5s ease-out var(--fx-delay) forwards;
}
@keyframes fx-heal {
  0% { opacity: 0; scale: 0.72; }
  38% { opacity: 1; }
  100% { opacity: 0; scale: 1.12; translate: 0 -16px; }
}

/* 施法蓄能（技能/大招前摇）：出手方身上的爆闪 + 扩散环 + 冲天光柱，无延迟 */
.fx-cast {
  inset: -14% -18%;
  background: radial-gradient(
    circle at 50% 52%,
    #fff 0 6%,
    color-mix(in srgb, var(--fx) 85%, transparent) 24%,
    transparent 62%
  );
  animation: fx-cast 0.44s ease-out forwards;
}
.fx-cast::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 52%;
  width: 40%;
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  border: 2px solid var(--fx);
  box-shadow: 0 0 18px var(--fx);
  animation: fx-ring 0.5s ease-out forwards;
}
.fx-cast::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 12%;
  width: 26%;
  height: 96%;
  translate: -50% 0;
  background: linear-gradient(0deg, color-mix(in srgb, var(--fx) 70%, transparent), transparent 78%);
  filter: blur(2px);
  transform-origin: 50% 100%;
  animation: fx-cast-pillar 0.5s ease-out forwards;
}
@keyframes fx-cast {
  0% { opacity: 0; scale: 0.6; }
  20% { opacity: 1; scale: 1.12; }
  100% { opacity: 0; scale: 1.25; }
}
@keyframes fx-cast-pillar {
  0% { opacity: 0; scale: 1 0.2; }
  30% { opacity: 0.95; }
  100% { opacity: 0; scale: 1 1.25; }
}

/* ============================================================
 * 伤害数字：渲染在受击角色头顶，与命中特效同拍弹出
 * ============================================================ */
.dmg-layer {
  position: absolute;
  left: 50%;
  bottom: 58%;
  width: 0;
  height: 0;
  z-index: 6;
  pointer-events: none;
}
.dmg {
  position: absolute;
  left: var(--jx, 0);
  bottom: var(--jy, 0px);
  transform: translateX(-50%);
  font-weight: 900;
  white-space: nowrap;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 5px rgba(0, 0, 0, 0.95), 0 0 12px rgba(0, 0, 0, 0.75);
  animation: dmg-pop 0.9s cubic-bezier(0.2, 0.85, 0.3, 1) var(--fx-delay) both;
}
@keyframes dmg-pop {
  0% { opacity: 0; translate: 0 12px; scale: 0.5; }
  16% { opacity: 1; translate: 0 -2px; scale: 1.28; }
  32% { scale: 1; }
  74% { opacity: 1; }
  100% { opacity: 0; translate: 0 -34px; scale: 0.9; }
}
.dmg-damage { font-size: 17px; color: #ffd9b8; }
/* 暴击与技能伤害更大字号、更强辉光（REQ-DAMAGE-006） */
.dmg-crit {
  font-size: 24px;
  color: #ffb03c;
  text-shadow: 0 0 16px rgba(255, 110, 60, 0.95), 0 2px 6px rgba(0, 0, 0, 0.95);
}
.dmg-skill {
  font-size: 22px;
  color: #ffe89a;
  text-shadow: 0 0 16px rgba(240, 200, 90, 0.9), 0 2px 6px rgba(0, 0, 0, 0.95);
}
.dmg-heal {
  font-size: 17px;
  color: #8df5b8;
  text-shadow: 0 0 14px rgba(60, 220, 140, 0.8), 0 2px 5px rgba(0, 0, 0, 0.9);
}

/* ---------- 教学关训练目标：场景顶部胶囊，不占 HUD ---------- */
.goal-chip {
  position: absolute;
  left: 50%;
  top: 8%;
  transform: translateX(-50%);
  /* 绝对定位的收缩宽度会被 left:50% 剩下的空间挤窄（导致文案折行），
     这里按内容宽度展开，再交给 max-width 兜底 */
  width: max-content;
  max-width: 94%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 11px;
  border-radius: 999px;
  background: rgba(10, 7, 18, 0.72);
  border: 1px solid var(--border-gold);
  z-index: 5;
}
.goal-icon { width: 18px; height: 18px; object-fit: contain; }
.goal-text { font-size: 12px; color: var(--gold-light); white-space: nowrap; }
.goal-progress { display: flex; gap: 5px; }
.goal-dot {
  width: 8px;
  height: 8px;
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

/* ---------- 场景级状态修饰 ---------- */
/* 行动预警：整场泛红 + 怪物侧红光（REQ-FEEL-005） */
.warn-fx {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 78% 55%, rgba(255, 60, 40, 0.55), transparent 62%),
    linear-gradient(180deg, rgba(255, 60, 40, 0.35), transparent 40%);
  animation: warn-sweep 0.5s ease-out;
}
@keyframes warn-sweep {
  0% { opacity: 0; }
  30% { opacity: 1; }
  100% { opacity: 0; }
}
/* 生命告急：英雄侧红光呼吸 */
.low-fx {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background: radial-gradient(ellipse at 22% 78%, rgba(255, 60, 40, 0.3), transparent 58%);
  animation: low-pulse 1.1s ease-in-out infinite;
}
@keyframes low-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.9; }
}
/* 舞台边框：生命告急 / Boss / 蓄力中 / 预警 */
.stage-low { border-color: rgba(255, 90, 60, 0.8); }
.stage-boss {
  border-color: var(--border-gold-strong);
  box-shadow: var(--shadow-panel), inset 0 0 30px rgba(212, 175, 55, 0.09);
}
.stage-warn {
  border-color: rgba(255, 90, 60, 0.9);
  animation: warn-pulse 0.5s ease-in-out;
}
@keyframes warn-pulse {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 22px rgba(255, 90, 60, 0.75); }
}
.stage-charging {
  border-color: rgba(255, 160, 60, 0.85);
  animation: charge-pulse 0.9s ease-in-out infinite;
}
@keyframes charge-pulse {
  0%, 100% { box-shadow: var(--shadow-panel); }
  50% { box-shadow: var(--shadow-panel), 0 0 18px rgba(255, 140, 50, 0.5); }
}
.stage-charging .timer-num {
  color: #ffc46b;
  text-shadow: 0 0 10px rgba(255, 170, 70, 0.9);
}

/* ============================================================
 * 宽屏（≥860px）：舞台给足空间，立绘更大，数字更醒目
 * ============================================================ */
@media (min-width: 860px) {
  .battle-stage {
    height: clamp(190px, 26dvh, 260px);
    padding: 6px var(--sp-4) 8px;
    --ground-h: 30px;
  }
  .p-name { font-size: 14px; }
  .p-num { font-size: 15px; min-width: 28px; }
  .p-bar { height: 15px; }
  .mini-icon { width: 20px; height: 20px; }
  .mini-badge { font-size: 10px; }
  .mini-badge img { width: 11px; height: 11px; }
  .intent-name { font-size: 11px; }
  .timer-num { font-size: 14px; }
  .timer-label { font-size: 10px; }
  .goal-text { font-size: 14px; }
  .dmg-damage { font-size: 21px; }
  .dmg-crit { font-size: 30px; }
  .dmg-skill { font-size: 27px; }
  .dmg-heal { font-size: 21px; }
}

/* ============================================================
 * 矮屏（≤760px 高）：舞台压扁，把高度让给棋盘
 *
 * 棋盘是正方形，边长 = min(宽, 高)，矮屏上真正卡住棋盘的是高度。
 * 这里按「HUD 收紧 → 地面收窄 → 内边距收紧」的顺序让位；
 * 场景仍保留约 70% 的舞台高度，角色不会退化成"一条信息栏"。
 * 断点与 BattleView.vue 的矮屏规则保持同一数值，且必须放在宽屏规则之后。
 * ============================================================ */
@media (max-height: 760px) {
  .battle-stage {
    height: clamp(112px, 19dvh, 150px);
    padding: 3px var(--sp-3) 4px;
    --ground-h: 18px;
  }
  .p-bar { height: 10px; }
  .p-name { font-size: 10.5px; }
  .p-num { font-size: 11px; min-width: 20px; }
  .mini-icon { width: 15px; height: 15px; }
  .mini-badge { font-size: 8.5px; }
  .intent-name { font-size: 9px; }
  .timer-num { font-size: 11px; }
  .meta-row { min-height: 13px; }
  .scene { border-radius: 8px; }
}
</style>