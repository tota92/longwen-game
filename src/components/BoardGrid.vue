<script setup lang="ts">
/**
 * 棋盘组件（8×8）
 *
 * 渲染策略（高性能）：
 * - 64 个宝石 DOM 以 cell.id 为 key 复用；位置由 transform: translate(%) 表达，
 *   行列变化时 CSS transition 自动补间 → 交换/下落动画零 JS 开销
 * - 新宝石入场用独立 translate 属性动画（不与 transform 冲突）
 * - 消除动画通过 cell.popping 标记驱动（scale 收缩后由引擎移除数据）
 *
 * 交互（REQ-G-03 零门槛）：
 * - 点击：选中 → 点击相邻交换；点击特殊石直接释放（REQ-BOARD-004）
 * - 滑动：向上下左右滑动即交换（移动端手感）
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { BOARD_SIZE, ELEMENT_INFO, FROZEN_MARK_ICON, SPECIAL_MARK_ICON } from '@/config/constants'
import { iconUrl } from '@/utils/icons'
import type { ElementType, SpecialType, Cell, Grid, Pos } from '@/types'

/**
 * 组件只依赖棋盘的公开数据接口；
 * 避免直接以 class 类型为 prop（reactive 代理会丢失私有成员类型）
 */
interface BoardLike {
  grid: Grid
  cellAt: (p: Pos) => Cell | null
}

const props = defineProps<{
  board: BoardLike
  canInteract: boolean
  /** 教学 1-1 高亮提示的交换对（REQ-TUTO-002） */
  hint?: [Pos, Pos] | null
  /**
   * 宝石展示区聚焦的元素：高亮该元素、压暗其余宝石，
   * 帮玩家快速定位"我要消的颜色在哪"。纯视觉辅助，不影响可操作性。
   */
  focusElement?: ElementType | null
}>()

const emit = defineEmits<{
  (e: 'swap', a: Pos, b: Pos): void
  (e: 'tapSpecial', pos: Pos): void
}>()

/** 扁平化渲染列表（响应式追踪 grid 每格变化） */
interface RenderCell {
  id: number
  row: number
  col: number
  element: keyof typeof ELEMENT_INFO
  special: SpecialType | null
  frozen: number
  popping: boolean
}

const cells = computed<RenderCell[]>(() => {
  const out: RenderCell[] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = props.board.grid[r][c]
      if (cell) {
        out.push({
          id: cell.id,
          row: r,
          col: c,
          element: cell.element,
          special: cell.special,
          frozen: cell.frozen,
          popping: !!cell.popping
        })
      }
    }
  }
  return out
})

const selected = ref<Pos | null>(null)

/** 新入场宝石 id 集合（播放掉落入场动画后移除） */
const knownIds = new Set<number>()
const newIds = ref<Set<number>>(new Set())
watch(
  cells,
  (list) => {
    const fresh = new Set<number>()
    for (const c of list) {
      if (!knownIds.has(c.id)) {
        knownIds.add(c.id)
        fresh.add(c.id)
      }
    }
    const alive = new Set(list.map((c) => c.id))
    for (const id of knownIds) {
      if (!alive.has(id)) knownIds.delete(id)
    }
    if (fresh.size > 0) {
      newIds.value = new Set([...newIds.value, ...fresh])
      window.setTimeout(() => {
        const s = new Set(newIds.value)
        fresh.forEach((id) => s.delete(id))
        newIds.value = s
      }, 420)
    }
  },
  { immediate: true }
)

function isSamePos(a: Pos | null, b: Pos): boolean {
  return !!a && a.row === b.row && a.col === b.col
}

function isHintCell(r: number, c: number): boolean {
  if (!props.hint) return false
  return props.hint.some((p) => p.row === r && p.col === c)
}

// ------------------------------------------------------------------
// 指针交互（鼠标 + 触摸统一）
// ------------------------------------------------------------------
interface DragState {
  start: Pos
  x: number
  y: number
  moved: boolean
}
let drag: DragState | null = null

function cellSize(): number {
  const el = boardEl.value
  return el ? el.clientWidth / BOARD_SIZE : 40
}

const boardEl = ref<HTMLElement | null>(null)

function onPointerDown(e: PointerEvent, row: number, col: number): void {
  if (!props.canInteract) return
  // 指针捕获：快速滑动移出宝石范围仍可追踪
  try {
   ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    /* 忽略 */
  }
  drag = { start: { row, col }, x: e.clientX, y: e.clientY, moved: false }
}

function onPointerMove(e: PointerEvent): void {
  if (!drag || !props.canInteract) return
  const dx = e.clientX - drag.x
  const dy = e.clientY - drag.y
  const threshold = cellSize() * 0.45
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return

  // 判定滑动方向并触发交换
  const { row, col } = drag.start
  let target: Pos
  if (Math.abs(dx) > Math.abs(dy)) {
    target = { row, col: col + (dx > 0 ? 1 : -1) }
  } else {
    target = { row: row + (dy > 0 ? 1 : -1), col }
  }
  drag.moved = true
  selected.value = null
  emit('swap', drag.start, target)
  drag = null
}

function onPointerUp(row: number, col: number): void {
  if (!drag) return
  const wasClick = !drag.moved
  drag = null
  if (!wasClick || !props.canInteract) return

  const pos = { row, col }
  const cell = props.board.cellAt(pos)
  if (!cell) return

  // 特殊石：直接点击释放（REQ-BOARD-004）
  if (cell.special) {
    selected.value = null
    emit('tapSpecial', pos)
    return
  }
  if (cell.frozen > 0) return

  // 普通宝石：选中 → 相邻交换
  if (selected.value && !isSamePos(selected.value, pos)) {
    const dist = Math.abs(selected.value.row - row) + Math.abs(selected.value.col - col)
    if (dist === 1) {
      emit('swap', selected.value, pos)
      selected.value = null
      return
    }
  }
  selected.value = isSamePos(selected.value, pos) ? null : pos
}

function onPointerCancel(): void {
  drag = null
}

/** 相对棋盘的安全清除选中（外部交换失败时由父组件调用） */
function clearSelection(): void {
  selected.value = null
}
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
})

/** 图标解析：元素宝石按元素取图，特殊石/冻结取覆盖标记图 */
const elementIcon = (el: ElementType): string => iconUrl(ELEMENT_INFO[el].iconId)
const specialMarkIcon = (s: SpecialType): string => iconUrl(SPECIAL_MARK_ICON[s])
const frozenMarkIcon = iconUrl(FROZEN_MARK_ICON)
</script>

<template>
  <div
    ref="boardEl"
    class="board"
    @pointermove="onPointerMove"
    @pointercancel="onPointerCancel"
  >
    <!-- 背格（静态） -->
    <div
      v-for="i in BOARD_SIZE * BOARD_SIZE"
      :key="'bg' + i"
      class="board-bg"
      :style="{
        left: `${((i - 1) % BOARD_SIZE) * 12.5}%`,
        top: `${Math.floor((i - 1) / BOARD_SIZE) * 12.5}%`
      }"
      :class="{ 'bg-alt': (Math.floor((i - 1) / BOARD_SIZE) + ((i - 1) % BOARD_SIZE)) % 2 === 0 }"
    ></div>

    <!-- 宝石层 -->
    <div
      v-for="cell in cells"
      :key="cell.id"
      class="gem"
      role="button"
      :aria-label="`${ELEMENT_INFO[cell.element].name}宝石 行${cell.row + 1} 列${cell.col + 1}${cell.special ? ' 技能石' : ''}${cell.frozen ? ' 已冻结' : ''}`"
      :class="[
        `el-${cell.element}`,
        {
          'gem-special-small': cell.special === 'small',
          'gem-special-ultimate': cell.special === 'ultimate',
          'gem-special-bomb': cell.special === 'bomb',
          'gem-frozen': cell.frozen > 0,
          'gem-pop': cell.popping,
          'gem-selected': selected && selected.row === cell.row && selected.col === cell.col,
          'gem-hint': isHintCell(cell.row, cell.col),
          'gem-new': newIds.has(cell.id),
          /* 宝石展示区聚焦：高亮目标元素、压暗其余（技能石不受影响，始终醒目） */
          'gem-focus': !!props.focusElement && cell.element === props.focusElement,
          'gem-dim': !!props.focusElement && cell.element !== props.focusElement && !cell.special
        }
      ]"
      :style="{
        transform: `translate(${cell.col * 100}%, ${cell.row * 100}%)`
      }"
      @pointerdown.prevent="onPointerDown($event, cell.row, cell.col)"
      @pointerup.prevent="onPointerUp(cell.row, cell.col)"
    >
      <!-- 宝石本体：256×256 透明 PNG（切面/包边/元素印记已绘制在图像内） -->
      <img
        class="gem-icon"
        :src="elementIcon(cell.element)"
        :alt="`${ELEMENT_INFO[cell.element].name}元素宝石`"
        draggable="false"
      />
      <!-- 技能石覆盖标记（REQ-BOARD-003） -->
      <img
        v-if="cell.special"
        class="gem-mark gem-mark-special"
        :src="specialMarkIcon(cell.special)"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      <!-- 冻结角标（REQ-ENEMY-101） -->
      <img
        v-if="cell.frozen > 0"
        class="gem-mark gem-mark-frozen"
        :src="frozenMarkIcon"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
    </div>
  </div>
</template>

<style scoped>
.board {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 18px;
  background:
    radial-gradient(circle at 50% 38%, rgba(212, 175, 55, 0.1), transparent 62%),
    radial-gradient(circle at 50% 118%, rgba(120, 60, 200, 0.14), transparent 58%),
    linear-gradient(180deg, rgba(30, 21, 48, 0.94), rgba(11, 8, 20, 0.96));
  border: 1px solid rgba(212, 175, 55, 0.38);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 0 32px rgba(0, 0, 0, 0.6),
    0 10px 30px rgba(0, 0, 0, 0.55),
    0 0 0 4px rgba(13, 10, 23, 0.9);
  touch-action: none; /* 阻止页面滚动，滑动交换专用 */
  overflow: hidden;
}

/* 内描金线：把棋盘从背景里"框"出来，避免大面积留白显得空 */
.board::after {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 13px;
  border: 1px solid rgba(212, 175, 55, 0.14);
  pointer-events: none;
  z-index: 5;
}

.board-bg {
  position: absolute;
  width: 12.5%;
  height: 12.5%;
  background: transparent;
}
.board-bg.bg-alt {
  background: rgba(255, 255, 255, 0.035);
}

/* ---------- 宝石 ---------- */
.gem {
  position: absolute;
  left: 0;
  top: 0;
  width: 12.5%;
  height: 12.5%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.28s cubic-bezier(0.33, 0.9, 0.5, 1);
  will-change: transform;
}

/*
 * 宝石本体：直接使用 256×256 透明 PNG 图标（public/icons/elements/el_*.png）
 * 图像内已绘制六边切面、金质包边、明暗棱面与元素印记，
 * CSS 只负责尺寸、投影与状态动效，避免重复绘制成本
 */
.gem-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.55));
  transition: scale 0.15s, filter 0.15s;
}

/* 元素主题色（用于状态光晕，与 ELEMENT_INFO 配色一致） */
.el-fire { --gem-glow: 255, 90, 60; }
.el-water { --gem-glow: 60, 167, 255; }
.el-wood { --gem-glow: 76, 217, 100; }
.el-light { --gem-glow: 240, 180, 41; }
.el-dark { --gem-glow: 160, 107, 255; }
.el-thunder { --gem-glow: 44, 195, 230; }

/* 覆盖标记（技能石/冻结角标）：右上角贴附，带深色投影保证在宝石上可读 */
.gem-mark {
  position: absolute;
  top: -3%;
  right: -3%;
  width: 54%;
  height: 54%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8));
}
.gem-mark-frozen {
  top: auto;
  right: -2%;
  bottom: -2%;
  width: 56%;
  height: 56%;
}

/* 特殊石状态光晕：提示"当前宝石为技能石" */
.gem-special-small .gem-icon {
  filter: drop-shadow(0 0 7px rgba(240, 216, 120, 0.95))
    drop-shadow(0 2px 3px rgba(0, 0, 0, 0.55));
}
.gem-special-ultimate .gem-icon {
  filter: drop-shadow(0 0 9px rgba(199, 125, 255, 1))
    drop-shadow(0 2px 3px rgba(0, 0, 0, 0.55));
}
.gem-special-bomb .gem-icon {
  filter: drop-shadow(0 0 8px rgba(255, 90, 60, 0.95))
    drop-shadow(0 2px 3px rgba(0, 0, 0, 0.55));
}

/* 选中态（脉冲放大） */
.gem-selected .gem-icon {
  scale: 1.18;
  filter: drop-shadow(0 0 9px rgba(240, 216, 120, 1)) brightness(1.18);
}

/* 教学提示高亮（REQ-TUTO-002：闪烁提示可消除位置） */
.gem-hint .gem-icon {
  animation: hint-blink 1s ease-in-out infinite;
}
@keyframes hint-blink {
  0%, 100% { filter: drop-shadow(0 0 0 rgba(240, 216, 120, 0)); scale: 1; }
  50% { filter: drop-shadow(0 0 10px rgba(240, 216, 120, 1)) brightness(1.2); scale: 1.12; }
}

/* 消除动画：scale 属性独立于 transform，不干扰位移补间 */
.gem-pop .gem-icon {
  animation: gem-pop 0.24s ease-in forwards;
}
@keyframes gem-pop {
  40% { scale: 1.35; filter: brightness(1.6); }
  100% { scale: 0; opacity: 0; }
}

/* 新宝石从上方掉入：translate 属性独立于 transform 定位 */
.gem-new .gem-icon {
  animation: gem-drop-in 0.34s cubic-bezier(0.3, 1.2, 0.6, 1);
}
@keyframes gem-drop-in {
  from { translate: 0 -230%; opacity: 0.4; }
  to { translate: 0 0; opacity: 1; }
}

/* 终极技能石呼吸光效（REQ-FEEL-002 技能石醒目） */
.gem-special-ultimate .gem-mark {
  animation: ultimate-glow 1.4s ease-in-out infinite;
}
@keyframes ultimate-glow {
  0%, 100% { scale: 1; opacity: 0.92; }
  50% { scale: 1.14; opacity: 1; }
}

/* 冻结宝石：去色 + 霜蓝光晕（REQ-ENEMY-101 悬空固定的视觉表达） */
.gem-frozen .gem-icon {
  filter: grayscale(0.75) brightness(1.02) saturate(0.45)
    drop-shadow(0 2px 2px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 8px rgba(140, 210, 255, 0.85));
}

/* ============================================================
 * 宝石展示区聚焦态：把非目标元素压暗，目标元素点亮
 * 用透明度 + 饱和度做减法，不改变宝石尺寸，避免棋盘"抖动"
 * ============================================================ */
.gem-dim .gem-icon {
  opacity: 0.26;
  filter: grayscale(0.6) brightness(0.7) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}
.gem-dim .gem-mark { opacity: 0.3; }

.gem-focus .gem-icon {
  animation: gem-focus-pulse 1.5s ease-in-out infinite;
}
@keyframes gem-focus-pulse {
  0%, 100% {
    filter: drop-shadow(0 0 5px rgba(var(--gem-glow), 0.85))
      drop-shadow(0 2px 3px rgba(0, 0, 0, 0.55));
    scale: 1;
  }
  50% {
    filter: drop-shadow(0 0 13px rgba(var(--gem-glow), 1)) brightness(1.2)
      drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
    scale: 1.1;
  }
}
</style>
