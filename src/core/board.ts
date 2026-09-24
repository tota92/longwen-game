/**
 * 棋盘核心引擎（框架无关的纯逻辑，REQ-BOARD / REQ-BATTLE）
 *
 * 职责：
 * - 棋盘生成（无初始三消 + 保证至少 1 个有效交换；教学关保证四消/五消机会）
 * - 相邻交换校验与执行（REQ-BATTLE-002 / REQ-BOARD-006）
 * - 匹配检测：横/纵 3 连；4 连→小技能石，5 连→终极技能石，L/T 型→炸弹石（REQ-BOARD-002/003）
 * - 特殊石效果展开（炸弹 3×3 连锁引爆，REQ-BOARD-005）
 * - 重力下落与顶部填充（冻结宝石悬空固定阻挡下落，REQ-ENEMY-101）
 * - 死局检测与洗牌（REQ-BATTLE-005）
 *
 * 设计说明：
 * - Cell 持有唯一 id，Vue 以 id 为 key 渲染 DOM，位置变化由 CSS transition 补间动画
 * - 本类不包含任何伤害/回合逻辑（由 battle 层组合），便于单元测试
 */
import { BOARD_SIZE, ELEMENTS } from '@/config/constants'
import type { Cell, Grid, MatchGroup, Pos, SpecialType } from '@/types'

/** 直线 run（横或纵连续段） */
interface Run {
  cells: Pos[]
  orientation: 'h' | 'v'
  element: Cell['element']
}

export interface CreateBoardOptions {
  /** 教学关：保证存在一次交换可形成四连 */
  ensureFourMatch?: boolean
  /** 教学关：保证存在一次交换可形成五连 */
  ensureFiveMatch?: boolean
  /** DDA-001：开局赠送 1 个小技能石 */
  initialSpecial?: boolean
}

export class GameBoard {
  grid: Grid = []
  private nextId = 1

  constructor(opts: CreateBoardOptions = {}) {
    this.generate(opts)
  }

  // ------------------------------------------------------------------
  // 生成
  // ------------------------------------------------------------------

  private newCell(element: Cell['element'], special: SpecialType | null = null): Cell {
    return { id: this.nextId++, element, special, frozen: 0 }
  }

  /** 随机元素 */
  private randElement(): Cell['element'] {
    return ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)]
  }

  /**
   * 生成初始棋盘：
   * 1) 逐格随机，避免与左侧两个/上方两个同元素 → 无初始三消（REQ-BOARD-001）
   * 2) 保证至少 1 个有效交换
   * 3) 教学关额外保证四消/五消机会（REQ-TUTO-003/004）
   */
  generate(opts: CreateBoardOptions = {}): void {
    const maxAttempts = 60
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      this.nextId = 1
      this.grid = []
      for (let r = 0; r < BOARD_SIZE; r++) {
        const row: (Cell | null)[] = []
        for (let c = 0; c < BOARD_SIZE; c++) {
          let el = this.randElement()
          let guard = 0
          // 避免生成即三消：与左二、上二 不同
          while (guard++ < 20 && this.createsImmediateMatch(row, r, c, el)) {
            el = this.randElement()
          }
          row.push(this.newCell(el))
        }
        this.grid.push(row)
      }

      if (!this.hasAnyValidSwap()) continue
      if (opts.ensureFourMatch && !this.hasSwapForming(4)) continue
      if (opts.ensureFiveMatch && !this.hasSwapForming(5)) continue

      // DDA-001：连续失败后开局赠送小技能石
      if (opts.initialSpecial) {
        const r = Math.floor(Math.random() * BOARD_SIZE)
        const c = Math.floor(Math.random() * BOARD_SIZE)
        const cell = this.grid[r][c]
        if (cell) cell.special = 'small'
      }
      return
    }
    // 理论不可达：兜底接受最后一次结果
  }

  /** 假设将 (r,c) 置为 el，是否与已有格子形成立即三消（仅用于生成期） */
  private createsImmediateMatch(row: (Cell | null)[], r: number, c: number, el: Cell['element']): boolean {
    // 横向：左边两个
    if (c >= 2) {
      const a = this.grid[r]?.[c - 1]
      const b = this.grid[r]?.[c - 2]
      if (a && b && a.element === el && b.element === el) return true
    }
    // 纵向：上边两个
    if (r >= 2) {
      const a = this.grid[r - 1][c]
      const b = this.grid[r - 2][c]
      if (a && b && a.element === el && b.element === el) return true
    }
    return false
  }

  // ------------------------------------------------------------------
  // 存取
  // ------------------------------------------------------------------

  cellAt(p: Pos): Cell | null {
    return this.grid[p.row]?.[p.col] ?? null
  }

  inBounds(p: Pos): boolean {
    return p.row >= 0 && p.row < BOARD_SIZE && p.col >= 0 && p.col < BOARD_SIZE
  }

  /** 相邻判断 */
  isAdjacent(a: Pos, b: Pos): boolean {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1
  }

  /**
   * 交换校验：相邻 + 双方非空 + 双方未冻结 + 双方非特殊石
   * （REQ-BOARD-006：技能石不可被交换；REQ-ENEMY-101：冻结宝石不可交换）
   */
  canSwap(a: Pos, b: Pos): boolean {
    if (!this.inBounds(a) || !this.inBounds(b) || !this.isAdjacent(a, b)) return false
    const ca = this.cellAt(a)
    const cb = this.cellAt(b)
    if (!ca || !cb) return false
    if (ca.frozen > 0 || cb.frozen > 0) return false
    if (ca.special || cb.special) return false
    return true
  }

  /** 执行交换（调用方需先校验 canSwap 或容忍无效交换用于模拟） */
  swap(a: Pos, b: Pos): void {
    const t = this.grid[a.row][a.col]
    this.grid[a.row][a.col] = this.grid[b.row][b.col]
    this.grid[b.row][b.col] = t
  }

  // ------------------------------------------------------------------
  // 匹配检测
  // ------------------------------------------------------------------

  /**
   * 扫描全盘消除组（REQ-BOARD-002：横/纵连续 3 个及以上；冻结宝石打断连续性）
   * L/T 型（横竖 run 共享格子）合并为炸弹组，产物生成于交叉点
   */
  findMatches(): MatchGroup[] {
    const runs: Run[] = []
    const size = BOARD_SIZE

    // 横向扫描
    for (let r = 0; r < size; r++) {
      let c = 0
      while (c < size) {
        const seg = this.collectRun(r, c, 0, 1)
        if (seg) {
          runs.push({ cells: seg.cells, orientation: 'h', element: seg.element })
          c = seg.endCol + 1
        } else c++
      }
    }
    // 纵向扫描
    for (let c = 0; c < size; c++) {
      let r = 0
      while (r < size) {
        const seg = this.collectRun(r, c, 1, 0)
        if (seg) {
          runs.push({ cells: seg.cells, orientation: 'v', element: seg.element })
          r = seg.endCol + 1
        } else r++
      }
    }

    // 合并共享格子的横竖 run → L/T 型炸弹
    const groups: MatchGroup[] = []
    const usedH = new Set<Run>()
    const usedV = new Set<Run>()

    for (const h of runs) {
      if (h.orientation !== 'h' || usedH.has(h)) continue
      let merged = false
      for (const v of runs) {
        if (v.orientation !== 'v' || usedV.has(v) || h.element !== v.element) continue
        const cross = h.cells.find((p) => v.cells.some((q) => q.row === p.row && q.col === p.col))
        if (cross) {
          // L/T 型：合并两臂，产物为炸弹石，生成于交叉点
          const cells = [...h.cells]
          for (const p of v.cells) {
            if (!cells.some((q) => q.row === p.row && q.col === p.col)) cells.push(p)
          }
          groups.push({
            cells,
            length: cells.length,
            special: 'bomb',
            anchor: cross,
            element: h.element
          })
          usedH.add(h)
          usedV.add(v)
          merged = true
          break
        }
      }
      if (merged) continue
      // 未交叉的横 run 按长度定产物
      groups.push(this.runToGroup(h))
    }
    // 未处理的竖 run
    for (const v of runs) {
      if (v.orientation === 'v' && !usedV.has(v)) groups.push(this.runToGroup(v))
    }
    return groups
  }

  /** 从 (r,c) 起沿 (dr,dc) 方向收集同元素连续段（≥3 返回） */
  private collectRun(r: number, c: number, dr: number, dc: number): { cells: Pos[]; element: Cell['element']; endCol: number } | null {
    const start = this.grid[r]?.[c]
    if (!start || start.frozen > 0) return null
    const cells: Pos[] = [{ row: r, col: c }]
    let nr = r + dr
    let nc = c + dc
    while (nr < BOARD_SIZE && nc < BOARD_SIZE) {
      const cell = this.grid[nr][nc]
      if (!cell || cell.frozen > 0 || cell.element !== start.element) break
      cells.push({ row: nr, col: nc })
      nr += dr
      nc += dc
    }
    if (cells.length < 3) return null
    // endCol 复用为结束索引（行或列）
    return { cells, element: start.element, endCol: dr === 1 ? nr - 1 : nc - 1 }
  }

  /** 直线 run → 消除组（4 连→small，5+ 连→ultimate，产物生成于中点） */
  private runToGroup(run: Run): MatchGroup {
    const sorted = [...run.cells].sort((a, b) =>
      run.orientation === 'h' ? a.col - b.col : a.row - b.row
    )
    const anchor = sorted[Math.floor(sorted.length / 2)]
    let special: SpecialType | null = null
    if (sorted.length >= 5) special = 'ultimate'
    else if (sorted.length === 4) special = 'small'
    return { cells: sorted, length: sorted.length, special, anchor, element: run.element }
  }

  // ------------------------------------------------------------------
  // 消除执行
  // ------------------------------------------------------------------

  /** 标记一次消除波的结果（由 battle 层消费后调用 commitClear 落盘） */
  static expandBombTargets(grid: Grid, seeds: Pos[]): { clear: Pos[]; triggeredSpecials: Pos[] } {
    const clearMap = new Map<string, Pos>()
    const triggered: Pos[] = []
    const queue: Pos[] = []
    const key = (p: Pos) => `${p.row},${p.col}`

    const pushClear = (p: Pos) => {
      const k = key(p)
      if (!clearMap.has(k)) {
        clearMap.set(k, p)
        queue.push(p)
      }
    }
    seeds.forEach(pushClear)

    // 波及展开：被清除的特殊石触发效果（炸弹扩大范围；小/终极技能石由 battle 层结算技能伤害）
    while (queue.length) {
      const p = queue.shift()!
      const cell = grid[p.row]?.[p.col]
      if (!cell) continue
      if (cell.special && !triggered.some((q) => q.row === p.row && q.col === p.col)) {
        triggered.push(p)
        if (cell.special === 'bomb') {
          // 3×3 范围（REQ-BOARD-005）
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const r = p.row + dr
              const c = p.col + dc
              if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                pushClear({ row: r, col: c })
              }
            }
          }
        }
      }
    }
    return { clear: [...clearMap.values()], triggeredSpecials: triggered }
  }

  /**
   * 落盘一次消除：
   * @param seeds 清除种子格（自然消除=所有匹配格；主动触发=技能石所在格）
   * @param groups 产物放置信息（自然消除时的匹配组；主动触发传空数组）
   * @returns 被清除的格子与被触发的特殊石（供伤害/技能结算）
   */
  commitClear(
    seeds: Pos[],
    groups: MatchGroup[] = []
  ): { cleared: { pos: Pos; element: Cell['element']; special: SpecialType | null }[]; specialsTriggered: { pos: Pos; element: Cell['element']; special: SpecialType }[] } {
    const { clear, triggeredSpecials } = GameBoard.expandBombTargets(this.grid, seeds)

    const cleared: { pos: Pos; element: Cell['element']; special: SpecialType | null }[] = []
    for (const p of clear) {
      const cell = this.grid[p.row][p.col]
      if (cell) {
        cleared.push({ pos: p, element: cell.element, special: cell.special })
        this.grid[p.row][p.col] = null
      }
    }

    // 从 cleared 中恢复被触发的特殊石信息（格子此时已清空）
    const specialsTriggered: { pos: Pos; element: Cell['element']; special: SpecialType }[] = []
    for (const p of triggeredSpecials) {
      const info = cleared.find((c) => c.pos.row === p.row && c.pos.col === p.col)
      if (info && info.special) {
        specialsTriggered.push({ pos: p, element: info.element, special: info.special })
      }
    }

    // 放置产物（清空后 anchor 必为 null）
    for (const g of groups) {
      if (g.special && this.inBounds(g.anchor) && !this.grid[g.anchor.row][g.anchor.col]) {
        this.grid[g.anchor.row][g.anchor.col] = this.newCell(g.element, g.special)
      }
    }
    return { cleared, specialsTriggered }
  }

  /**
   * 在指定位置放置特殊石（元素共鸣遗物：四消概率额外生成小技能石）
   * @returns 是否成功放置
   */
  placeSpecial(pos: Pos, special: SpecialType): boolean {
    const cell = this.cellAt(pos)
    if (!cell || cell.special) return false
    cell.special = special
    return true
  }

  /** 随机挑一个可放置特殊石的普通宝石位（优先从候选位中选） */
  pickRandomNormalCell(candidates?: Pos[]): Pos | null {
    const pool: Pos[] = []
    const tryAdd = (p: Pos) => {
      const cell = this.cellAt(p)
      if (cell && !cell.special && cell.frozen === 0) pool.push(p)
    }
    if (candidates && candidates.length > 0) {
      candidates.forEach(tryAdd)
    }
    if (pool.length === 0) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) tryAdd({ row: r, col: c })
      }
    }
    if (pool.length === 0) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  // ------------------------------------------------------------------
  // 重力下落（REQ-BATTLE-003 / REQ-ENEMY-101）
  // ------------------------------------------------------------------

  /**
   * 每列按冻结宝石分段：段内宝石落向段底；包含棋盘顶部的段可接收新宝石；
   * 其余段顶部留空洞（被冻结宝石阻挡，解冻后自动恢复）
   * @returns 新生成的宝石 id 集合（渲染层用于下落入场动画）
   */
  applyGravity(): Set<number> {
    const newIds = new Set<number>()
    for (let c = 0; c < BOARD_SIZE; c++) {
      // 冻结行切分段边界
      const frozenRows: number[] = []
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (this.grid[r][c]?.frozen) frozenRows.push(r)
      }
      const bounds: [number, number][] = []
      let prev = -1
      for (const fr of frozenRows) {
        if (fr - 1 >= prev + 1) bounds.push([prev + 1, fr - 1])
        prev = fr
      }
      if (prev + 1 <= BOARD_SIZE - 1) bounds.push([prev + 1, BOARD_SIZE - 1])

      for (const [start, end] of bounds) {
        // 收集段内非空宝石（自上而下保持顺序）
        const cells: Cell[] = []
        for (let r = start; r <= end; r++) {
          const cell = this.grid[r][c]
          if (cell) cells.push(cell)
        }
        // 清空段
        for (let r = start; r <= end; r++) this.grid[r][c] = null
        // 堆到段底
        let write = end
        for (let i = cells.length - 1; i >= 0; i--) {
          this.grid[write--][c] = cells[i]
        }
        // 顶部开放段（从棋盘顶开始、上方无冻结阻挡）：补新宝石
        if (start === 0) {
          const emptyCount = end - start + 1 - cells.length
          for (let i = 0; i < emptyCount; i++) {
            const cell = this.newCell(this.randElement())
            this.grid[start + i][c] = cell
            newIds.add(cell.id)
          }
        }
      }
    }
    return newIds
  }

  /** 回合推进时冻结倒计时递减，归零解冻（REQ-ENEMY-101：2 回合自动解冻） */
  tickFrozen(): void {
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell && cell.frozen > 0) cell.frozen--
      }
    }
  }

  // ------------------------------------------------------------------
  // 死局检测与洗牌（REQ-BATTLE-005）
  // ------------------------------------------------------------------

  /** 是否存在任一有效交换（交换后可形成消除） */
  hasAnyValidSwap(): boolean {
    return this.findValidSwap() !== null
  }

  /** 找到一个有效交换对（无则 null） */
  findValidSwap(): [Pos, Pos] | null {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const a = { row: r, col: c }
        const rights: Pos[] = [
          { row: r, col: c + 1 },
          { row: r + 1, col: c }
        ]
        for (const b of rights) {
          if (!this.canSwap(a, b)) continue
          this.swap(a, b)
          const matched = this.findMatches().length > 0
          this.swap(a, b) // 换回
          if (matched) return [a, b]
        }
      }
    }
    return null
  }

  /**
   * 洗牌重排（不消耗回合）：重排非冻结宝石位置，
   * 保证洗后无现成消除且存在有效交换
   */
  shuffle(): void {
    const positions: Pos[] = []
    const cells: Cell[] = []
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = this.grid[r][c]
        if (cell && cell.frozen === 0) {
          positions.push({ row: r, col: c })
          cells.push(cell)
        }
      }
    }
    if (positions.length < 2) return

    for (let attempt = 0; attempt < 80; attempt++) {
      // Fisher-Yates 洗牌
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[cells[i], cells[j]] = [cells[j], cells[i]]
      }
      positions.forEach((p, i) => {
        this.grid[p.row][p.col] = cells[i]
      })
      if (this.findMatches().length === 0 && this.hasAnyValidSwap()) return
    }
    // 兜底：接受最后一次排列（极小概率）
  }

  /** 教学关检测：是否存在交换可形成 n 连（n=4 或 5） */
  private hasSwapForming(n: number): boolean {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const a = { row: r, col: c }
        const neighbors: Pos[] = [
          { row: r, col: c + 1 },
          { row: r + 1, col: c }
        ]
        for (const b of neighbors) {
          if (!this.canSwap(a, b)) continue
          this.swap(a, b)
          const ok = this.findMatches().some((g) => g.length >= n)
          this.swap(a, b)
          if (ok) return true
        }
      }
    }
    return false
  }

  // ------------------------------------------------------------------
  // 序列化（REQ-SAVE-002 战斗中断恢复）
  // ------------------------------------------------------------------

  static fromGrid(grid: Grid): GameBoard {
    const board = Object.create(GameBoard.prototype)
    board.grid = grid
    let maxId = 0
    for (const row of grid) {
      for (const cell of row) {
        if (cell && cell.id > maxId) maxId = cell.id
      }
    }
    board.nextId = maxId + 1
    return board
  }
}
