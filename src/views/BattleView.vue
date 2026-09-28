<script setup lang="ts">
/**
 * 战斗界面（REQ-UI 9.2 布局）
 *
 * UI 层次（自上而下）：
 *   顶部    暂停 + 关卡名 + 回合数        —— 窄条，不抢占游玩区
 *   展示区  英雄 vs 怪物：立绘 / 动作 / 特效 / 血条 —— 战斗反馈的舞台
 *   中部    8×8 棋盘                      —— 游玩区，独占剩余全部空间
 *   浮层    提示条（TipBar）               —— 覆盖在棋盘之上，不占布局空间
 *   信息区  宝石 / 技能 双 Tab 面板        —— 局内态势与技能可用状态
 *
 * 窄屏（<860px）单列纵向堆叠，信息区收成底部双 Tab，棋盘不被压缩；
 * 宽屏（≥860px）转为「左：展示区+棋盘 / 右：信息区常驻」双栏。
 *
 * 棋盘尺寸只有一个来源：.board-wrap 的实测内容框（见下方 100cqh），
 * 边长取「可用宽度 ∩ 可用高度」，既不溢出也不留出无用空隙；
 * 提示浮层挂在棋盘方框内做绝对定位，因此提示的出现/消失不会改变棋盘。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import BoardGrid from '@/components/BoardGrid.vue'
import BattleStage from '@/components/BattleStage.vue'
import GemPanel from '@/components/GemPanel.vue'
import SkillPanel from '@/components/SkillPanel.vue'
import FloatLayer from '@/components/FloatLayer.vue'
import SkillCutIn from '@/components/SkillCutIn.vue'
import RelicSelect from '@/components/RelicSelect.vue'
import ResultOverlay from '@/components/ResultOverlay.vue'
import PauseOverlay from '@/components/PauseOverlay.vue'
import TipBar from '@/components/TipBar.vue'
import { iconUrl } from '@/utils/icons'

const store = useGameStore()
const battle = store.battle

/** 界面图标 */
const ICON = {
  pause: iconUrl('ui_pause'),
  tip: iconUrl('ui_tip'),
  gem: iconUrl('el_light'),
  skill: iconUrl('ov_ultimate')
} as const

const waveText = computed(() => {
  if (!battle.level || battle.level.waves.length <= 1) return null
  return `第 ${battle.waveIndex + 1}/${battle.level.waves.length} 波`
})

/**
 * 宽屏断点（与样式里的 860px 保持一致）。
 * 宽屏时信息区不再收成底部 Tab，而是常驻右侧栏——
 * 用 v-if 而非双份 DOM，避免 GemPanel/SkillPanel 被重复挂载。
 */
const isWide = ref(false)
let mq: MediaQueryList | null = null
function onMqChange(e: MediaQueryList | MediaQueryListEvent): void {
  isWide.value = e.matches
}
onMounted(() => {
  mq = window.matchMedia('(min-width: 860px)')
  isWide.value = mq.matches
  mq.addEventListener('change', onMqChange)
})
onBeforeUnmount(() => mq?.removeEventListener('change', onMqChange))
</script>

<template>
  <div class="battle-view">
    <!-- 顶部条：暂停 + 关卡信息（窄条，不占用游玩区） -->
    <div class="battle-top">
      <div class="top-left">
        <button class="top-btn pause-btn" @click="battle.paused = true" aria-label="暂停">
          <img :src="ICON.pause" alt="" aria-hidden="true" draggable="false" />
        </button>
        <!--
          教程提示被关闭后的重开入口：放在顶栏而不是棋盘上——
          棋盘上任何常驻按钮都会盖住底部一行宝石、抢掉落子点击。
        -->
        <transition name="tip">
          <button
            v-if="!store.activeTip && store.hasHiddenGuide"
            class="top-btn hint-btn"
            type="button"
            aria-label="重新显示提示"
            @click="store.reopenTip()"
          >
            <img :src="ICON.tip" alt="" aria-hidden="true" draggable="false" />
          </button>
        </transition>
      </div>
      <div class="level-info">
        <span class="level-name font-title">{{ battle.level?.name }}</span>
        <span v-if="waveText" class="wave-text">{{ waveText }}</span>
      </div>
      <div class="turn-text num">回合 {{ battle.turnCount }}</div>
    </div>

    <!-- 战斗展示区：英雄 vs 怪物 -->
    <BattleStage />

    <!-- 棋盘：战斗界面的游玩区（独占剩余空间；提示浮层覆盖其上，不占布局空间） -->
    <div class="board-wrap" :class="{ shuffling: battle.shuffling }">
      <div class="board-box">
        <BoardGrid
          v-if="battle.board"
          :key="battle.boardSeq"
          :board="battle.board"
          :can-interact="battle.canInteract && !battle.paused && battle.phase === 'fighting'"
          :hint="battle.hint"
          :focus-element="battle.focusElement"
          @swap="(a, b) => store.doSwap(a, b)"
          @tap-special="(p) => store.tapSpecial(p)"
        />
        <!-- 提示浮层：绝对定位盖在棋盘之上，从文档流里摘除 -->
        <TipBar />
      </div>
    </div>

    <!-- 信息区（窄屏）：宝石 / 技能 双 Tab -->
    <div v-if="!isWide" class="bottom-panel panel">
      <div class="tab-bar" role="tablist">
        <button
          class="tab-btn"
          role="tab"
          :aria-selected="battle.bottomTab === 'gem'"
          :class="{ active: battle.bottomTab === 'gem' }"
          @click="store.setBottomTab('gem')"
        >
          <img :src="ICON.gem" alt="" aria-hidden="true" draggable="false" />
          <span>宝石</span>
        </button>
        <button
          class="tab-btn"
          role="tab"
          :aria-selected="battle.bottomTab === 'skill'"
          :class="{ active: battle.bottomTab === 'skill' }"
          @click="store.setBottomTab('skill')"
        >
          <img :src="ICON.skill" alt="" aria-hidden="true" draggable="false" />
          <span>技能</span>
        </button>
      </div>
      <div class="tab-content">
        <GemPanel v-show="battle.bottomTab === 'gem'" />
        <SkillPanel v-show="battle.bottomTab === 'skill'" />
      </div>
    </div>

    <!-- 信息区（宽屏）：右侧常驻，宝石与技能同时可见 -->
    <aside v-else class="side-panels">
      <section class="side-block panel">
        <h3 class="block-title font-title">宝石图鉴</h3>
        <GemPanel />
      </section>
      <section class="side-block panel">
        <h3 class="block-title font-title">英雄技能</h3>
        <SkillPanel />
      </section>
    </aside>

    <!-- 浮层 -->
    <FloatLayer />
    <SkillCutIn />

    <!-- 遗物三选一 -->
    <RelicSelect v-if="battle.phase === 'relicSelect'" />

    <!-- 结算 -->
    <ResultOverlay v-if="battle.phase === 'result'" />

    <!-- 暂停 -->
    <PauseOverlay v-if="battle.paused" />
  </div>
</template>

<style scoped>
.battle-view {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  /* 面板与棋盘之间的呼吸由 gap 统一控制，避免各处 margin 叠加出垂直死角 */
  gap: var(--sp-3);
  /* 128px = Tab 栏 25 + 技能页内容 86（3 个英雄切换钮纵排是最高的）+ 内边距与间距 17。
     这是技能页不被裁切的下限，两页取同一值，切 Tab 时棋盘尺寸才不会变。
     矮屏实测只差 3px 棋盘，不值得为它牺牲技能页完整性。 */
  --bottom-total: 128px;
}

.battle-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-3) var(--sp-4) 0;
  flex-shrink: 0;
}

/* 顶栏左侧：暂停 +（必要时）提示重开，两者同一套图标按钮语言 */
.top-left {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.top-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--r-md);
  border: 1px solid var(--border-gold);
  background: var(--bg-panel);
  color: var(--text-1);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}
.top-btn:active { transform: scale(0.92); }
.top-btn img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}
/* 提示入口：教程色系蓝调，一眼区别于金色按钮，但不做循环动画（克制） */
.hint-btn {
  border-color: rgba(120, 190, 255, 0.5);
  background: rgba(60, 167, 255, 0.12);
  box-shadow: 0 0 10px rgba(60, 167, 255, 0.28);
}
.hint-btn img {
  filter: drop-shadow(0 0 5px rgba(60, 167, 255, 0.75));
}
/* 与提示浮层共用同一套进出场过渡 */
.tip-enter-active,
.tip-leave-active {
  transition: opacity 0.22s ease, translate 0.22s ease;
}
.tip-enter-from,
.tip-leave-to {
  opacity: 0;
  translate: 0 10px;
}

.level-info {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.level-name {
  font-size: 16px;
  color: var(--gold-light);
  letter-spacing: 3px;
}
.wave-text {
  font-size: 11px;
  color: #ffb199;
  border: 1px solid rgba(255, 177, 145, 0.4);
  padding: 1px 7px;
  border-radius: var(--r-sm);
}
.turn-text {
  font-size: 11px;
  color: var(--text-3);
}

/* 棋盘容器：游玩区，吃掉顶部条 / 展示区 / 信息区之外的全部剩余空间 */
.board-wrap {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 四周留 8px：棋盘外圈 4px 暗色描边 + 投影不会被 overflow 裁掉，
     也让棋盘不贴屏幕边。竖直方向同样内缩，保证"铺满"是铺满可用内容框。 */
  padding: var(--sp-3);
  min-height: 0;
  overflow: hidden; /* 让光晕止步于棋盘区域，不糊到展示区/信息区上 */
  /* 让棋盘用容器实测尺寸定边长（见下方 100cqh），
     而不是拿 100dvh 去减一串魔法常数——安全区、地址栏收起、横屏都会改变可用高度，
     减法公式必然对不准，最后表现为棋盘溢出被裁 */
  container-type: size;
}
/* 棋盘光晕：填补竖屏上下留白，让棋盘像"悬浮在法阵上" */
.board-wrap::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(124%, 128vw);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgba(212, 175, 55, 0.17) 0%,
    rgba(212, 175, 55, 0.06) 38%,
    transparent 64%
  );
  pointer-events: none;
}
/*
 * 棋盘方框：边长 = min(内容框宽, 内容框高)，即剩余空间内能放下的最大正方形。
 * 100cqh 取的是 .board-wrap 内容框的实测高度，因此安全区、地址栏收放、
 * 横屏切换都能自动适应，不再依赖任何魔法常数，也不会溢出被裁。
 * 提示浮层（TipBar）挂在这一层里：绝对定位覆盖棋盘，不参与布局，
 * 所以提示出现/消失不会改变棋盘尺寸与位置。
 */
.board-box {
  position: relative;
  width: min(100%, 100cqh);
  aspect-ratio: 1;
  /* 自己也是容器：浮层内部可用 cqw / cqh 按棋盘实际边长缩放（字号、内边距） */
  container-type: size;
}
/* 重排抖动：只抖棋盘本体，提示浮层保持水平可读 */
.board-wrap.shuffling :deep(.board) {
  animation: shuffle-anim 0.45s ease-in-out infinite;
}
@keyframes shuffle-anim {
  0%, 100% { rotate: 0deg; }
  25% { rotate: 1.2deg; }
  75% { rotate: -1.2deg; }
}

/* ============================================================
 * 信息区（窄屏）：底部双 Tab
 * 高度固定，保证切换 Tab 时棋盘尺寸不变
 * ============================================================ */
.bottom-panel {
  flex-shrink: 0;
  height: var(--bottom-total);
  margin: 0 var(--sp-4) var(--sp-4);
  padding: var(--sp-1) var(--sp-2) var(--sp-2);
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 100%, rgba(120, 60, 200, 0.12), transparent 60%),
    var(--bg-panel);
}

.tab-bar {
  display: flex;
  gap: var(--sp-1);
  flex-shrink: 0;
}
.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 4px 0;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-3);
  font-size: 11px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: color var(--dur-fast), background var(--dur-fast), border-color var(--dur-fast);
}
.tab-btn img {
  width: 15px;
  height: 15px;
  object-fit: contain;
  opacity: 0.65;
  transition: opacity var(--dur-fast), filter var(--dur-fast);
}
/* 选中态：金色描边 + 图标点亮，与全站魔幻纹章语言一致 */
.tab-btn.active {
  color: var(--gold-light);
  border-color: var(--border-gold-strong);
  background: rgba(212, 175, 55, 0.12);
}
.tab-btn.active img {
  opacity: 1;
  filter: drop-shadow(0 0 5px rgba(240, 216, 120, 0.8));
}
.tab-btn:active { transform: scale(0.97); }

.tab-content {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
}
.tab-content > * {
  flex: 1;
  min-width: 0;
  height: 100%;
}

/* ============================================================
 * 矮屏（≤760px 高）：HUD 让位给棋盘
 *
 * 棋盘是正方形，边长 = min(宽, 高) —— 矮屏上真正卡住棋盘的是高度：
 * 375×667 上「顶部 52 + 展示区 179 + 间距 32 + 信息区 140」吃掉 403px，
 * 棋盘只剩 264px（70% 屏宽）。这里收紧顶栏与各处间距（展示区的压缩在
 * BattleStage.vue，断点取同一数值），把棋盘送回约 90% 屏宽的视觉重心位置。
 * 信息区高度不动：它的 128px 是技能页不被裁切的下限。
 * ============================================================ */
@media (max-height: 760px) {
  .battle-view { gap: var(--sp-2); }
  .battle-top { padding-top: var(--sp-1); }
  .top-btn {
    width: 32px;
    height: 32px;
  }
  .top-btn img {
    width: 18px;
    height: 18px;
  }
  /* 棋盘外圈描边 4px：内缩收到 4px 刚好容下描边，把宽度全让给棋盘 */
  .board-wrap { padding: var(--sp-1); }
  .bottom-panel { margin-bottom: var(--sp-2); }
}

/* ============================================================
 * 宽屏（≥860px）：左「展示区 + 棋盘」/ 右「信息区」
 * 信息区两块常驻，宝石与技能不再互相遮挡
 * ============================================================ */
@media (min-width: 860px) {
  .battle-view {
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(340px, 30vw, 420px);
    grid-template-rows: auto auto minmax(0, 1fr);
    grid-template-areas:
      'top    top'
      'stage  side'
      'board  side';
    gap: var(--sp-4) var(--sp-6);
    padding: var(--sp-4) var(--sp-6);
    max-width: 1180px;
    margin: 0 auto;
  }
  .battle-top {
    grid-area: top;
    padding: 0;
  }
  .battle-view > .battle-stage {
    grid-area: stage;
    margin: 0;
  }
  .board-wrap {
    grid-area: board;
  }
  /* 棋盘尺寸由 .board-wrap 的 100cqh 自动收敛，宽屏无需单独覆盖；
     提示浮层同样挂在 .board-box 上，宽屏与竖屏行为一致 */

  .side-panels {
    grid-area: side;
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    min-height: 0;
    overflow-y: auto;
  }
  .side-block {
    padding: var(--sp-3) var(--sp-4) var(--sp-4);
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    flex-shrink: 0;
  }
  .block-title {
    margin: 0;
    font-size: 13px;
    color: var(--gold-light);
    letter-spacing: 3px;
    padding-left: 8px;
    border-left: 2px solid var(--gold);
    line-height: 1.2;
  }
}
</style>
