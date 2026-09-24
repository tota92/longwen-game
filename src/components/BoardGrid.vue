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
import { BOARD_SIZE, ELEMENT_INFO } from '@/config/constants'
import type { Cell, Grid, Pos } from '@/types'

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
  special: string | null
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

const specialIcon: Record<string, string> = {
  small: '✦',
  ultimate: '★',
  bomb: '💣'
}
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
          'gem-new': newIds.has(cell.id)
        }
      ]"
      :style="{
        transform: `translate(${cell.col * 100}%, ${cell.row * 100}%)`
      }"
      @pointerdown.prevent="onPointerDown($event, cell.row, cell.col)"
      @pointerup.prevent="onPointerUp(cell.row, cell.col)"
    >
      <span class="gem-icon">{{ ELEMENT_INFO[cell.element].icon }}</span>
      <span v-if="cell.special" class="gem-special-mark">{{ specialIcon[cell.special] }}</span>
      <span v-if="cell.frozen > 0" class="gem-frozen-mark">❄</span>
    </div>
  </div>
</template>

<style scoped>
.board {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border-gold);
  box-shadow:
    inset 0 0 24px rgba(0, 0, 0, 0.5),
    0 6px 24px rgba(0, 0, 0, 0.45);
  touch-action: none; /* 阻止页面滚动，滑动交换专用 */
  overflow: hidden;
}

.board-bg {
  position: absolute;
  width: 12.5%;
  height: 12.5%;
  background: rgba(255, 255, 255, 0.02);
}
.board-bg.bg-alt {
  background: rgba(255, 255, 255, 0.045);
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

.gem-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 82%;
  height: 82%;
  font-size: clamp(16px, 5.4vw, 30px);
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.35), transparent 55%);
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.4);
  transition: box-shadow 0.15s, scale 0.15s;
}

.el-fire .gem-icon { background-color: rgba(255, 90, 60, 0.22); }
.el-water .gem-icon { background-color: rgba(60, 167, 255, 0.22); }
.el-wood .gem-icon { background-color: rgba(76, 217, 100, 0.22); }
.el-light .gem-icon { background-color: rgba(255, 217, 76, 0.22); }
.el-dark .gem-icon { background-color: rgba(160, 107, 255, 0.22); }
.el-thunder .gem-icon { background-color: rgba(255, 225, 53, 0.22); }

/* 选中态（脉冲放大） */
.gem-selected .gem-icon {
  scale: 1.18;
  box-shadow:
    0 0 0 2px var(--gold-light),
    0 0 16px rgba(240, 216, 120, 0.8);
}

/* 教学提示高亮（REQ-TUTO-002：闪烁提示可消除位置） */
.gem-hint .gem-icon {
  animation: hint-blink 1s ease-in-out infinite;
}
@keyframes hint-blink {
  0%, 100% { box-shadow: 0 0 0 0 rgba(240, 216, 120, 0); scale: 1; }
  50% { box-shadow: 0 0 0 3px rgba(240, 216, 120, 0.9), 0 0 18px rgba(240, 216, 120, 0.7); scale: 1.14; }
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

/* 特殊石外观 */
.gem-special-small .gem-icon {
  border: 2px solid var(--gold-light);
  box-shadow: 0 0 10px rgba(240, 216, 120, 0.65);
}
.gem-special-ultimate .gem-icon {
  border: 2px solid #c77dff;
  box-shadow: 0 0 14px rgba(199, 125, 255, 0.85);
  animation: ultimate-glow 1.4s ease-in-out infinite;
}
@keyframes ultimate-glow {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.45); }
}
.gem-special-bomb .gem-icon {
  border: 2px solid #ff5a3c;
  box-shadow: 0 0 12px rgba(255, 90, 60, 0.8);
}

.gem-special-mark {
  position: absolute;
  top: 4%;
  right: 6%;
  font-size: 11px;
  color: var(--gold-light);
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.8);
}
.gem-special-ultimate .gem-special-mark {
  color: #e0b3ff;
}
.gem-special-bomb .gem-special-mark {
  color: #ff8d75;
}

/* 冻结宝石 */
.gem-frozen .gem-icon {
  filter: grayscale(0.6) brightness(1.2);
  border: 2px solid rgba(160, 220, 255, 0.8);
}
.gem-frozen-mark {
  position: absolute;
  bottom: 2%;
  right: 8%;
  font-size: 11px;
  color: #a0dcff;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
}
</style>
