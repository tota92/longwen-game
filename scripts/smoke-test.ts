/**
 * 核心逻辑冒烟测试（棋盘引擎 + 数值公式）
 * 运行：npx tsx scripts/smoke-test.ts
 */
import { GameBoard } from '../src/core/board'
import { BOARD_SIZE, ELEMENTS } from '../src/config/constants'
import {
  advanceEnemyPhase,
  calcWaveDamage,
  calcComboMult,
  calcSkillDamage,
  createEnemyState,
  enemyDead
} from '../src/core/battle'
import type { ElementType, Grid, MatchGroup, Pos } from '../src/types'

let passed = 0
let failed = 0

function assert(cond: boolean, name: string): void {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.error(`  ✗ ${name}`)
  }
}

// ------------------------------------------------------------------
console.log('\n[1] 棋盘生成不变量（100 次随机生成）')
// ------------------------------------------------------------------
{
  let allValid = true
  let hasSwap = true
  for (let i = 0; i < 100; i++) {
    const b = new GameBoard()
    if (b.findMatches().length > 0) allValid = false
    if (!b.hasAnyValidSwap()) hasSwap = false
  }
  assert(allValid, '100 次生成均无初始三消（REQ-BOARD-001）')
  assert(hasSwap, '100 次生成均存在有效交换（REQ-BOARD-001）')
}

// ------------------------------------------------------------------
console.log('\n[2] 匹配检测与特殊石产物')
// ------------------------------------------------------------------
{
  // 手工构造 4 连（行 2：火火火火）
  const b = new GameBoard()
  b.grid = emptyGrid()
  for (let c = 0; c < 4; c++) setCell(b, 2, c, 'fire')
  const matches = b.findMatches()
  assert(matches.length === 1 && matches[0].length === 4, '横向 4 连识别')
  assert(matches[0].special === 'small', '4 连产物=小技能石（REQ-BOARD-003）')

  // 5 连 → ultimate
  b.grid = emptyGrid()
  for (let c = 0; c < 5; c++) setCell(b, 3, c, 'water')
  const m5 = b.findMatches()
  assert(m5.length === 1 && m5[0].special === 'ultimate', '5 连产物=终极技能石')

  // L 型 → bomb（行2：(1,1)(1,2)(1,3) + 列交叉）
  b.grid = emptyGrid()
  setCell(b, 1, 1, 'wood'); setCell(b, 1, 2, 'wood'); setCell(b, 1, 3, 'wood')
  setCell(b, 2, 1, 'wood'); setCell(b, 3, 1, 'wood')
  const mL = b.findMatches()
  const bombGroup = mL.find((g) => g.special === 'bomb')
  assert(!!bombGroup && bombGroup.length === 5, 'L/T 型产物=炸弹石，5 格全消')
  assert(bombGroup!.anchor.row === 1 && bombGroup!.anchor.col === 1, '炸弹石生成于交叉点')

  // 3 连无产物
  b.grid = emptyGrid()
  setCell(b, 0, 0, 'light'); setCell(b, 0, 1, 'light'); setCell(b, 0, 2, 'light')
  const m3 = b.findMatches()
  assert(m3.length === 1 && m3[0].special === null, '3 连无特殊石产物')

  // 冻结宝石打断匹配（REQ-ENEMY-101）
  b.grid = emptyGrid()
  setCell(b, 4, 0, 'dark'); setCell(b, 4, 1, 'dark'); setCell(b, 4, 2, 'dark')
  b.grid[4][1]!.frozen = 2
  assert(b.findMatches().length === 0, '冻结宝石不可消除，打断连续性')
}

// ------------------------------------------------------------------
console.log('\n[3] 炸弹 3×3 展开与连锁引爆（REQ-BOARD-005）')
// ------------------------------------------------------------------
{
  const b = new GameBoard()
  b.grid = emptyGrid()
  // (4,4) 放炸弹石，3×3 范围内铺满宝石
  setCell(b, 4, 4, 'fire')
  b.grid[4][4]!.special = 'bomb'
  for (let r = 3; r <= 5; r++) {
    for (let c = 3; c <= 5; c++) {
      if (r === 4 && c === 4) continue
      setCell(b, r, c, 'water')
    }
  }
  b.grid[5][5]!.special = 'small' // 3×3 范围内的连锁引爆目标
  setCell(b, 4, 6, 'fire') // 范围外的对照格，不应被清除
  const { clear, triggeredSpecials } = GameBoard.expandBombTargets(b.grid, [{ row: 4, col: 4 }])
  assert(clear.length === 9, `炸弹 3×3 展开（实际 ${clear.length} 格）`)
  assert(
    !clear.some((p) => p.row === 4 && p.col === 6),
    '炸弹范围外（距离 >1）的宝石不受影响'
  )
  assert(
    triggeredSpecials.length === 2 && triggeredSpecials.every((p) =>
      (p.row === 4 && p.col === 4) || (p.row === 5 && p.col === 5)
    ),
    '范围内技能石被连锁引爆'
  )
}

// ------------------------------------------------------------------
console.log('\n[4] 重力下落与冻结阻挡（REQ-ENEMY-101 悬空固定）')
// ------------------------------------------------------------------
{
  const b = new GameBoard()
  b.grid = emptyGrid()
  // 列 2：顶(0,2)宝石、冻结(3,2)、底(7,2)宝石
  setCell(b, 0, 2, 'fire')
  setCell(b, 3, 2, 'water'); b.grid[3][2]!.frozen = 2
  setCell(b, 7, 2, 'wood')
  b.applyGravity()
  const topSeg = b.grid[2][2] // 顶部段底(0-2行)：宝石落至第2行
  const frozenStay = b.grid[3][2]
  const bottomStay = b.grid[7][2]
  const gap = b.grid[4][2] === null || b.grid[5][2] === null || b.grid[6][2] === null
  assert(topSeg?.element === 'fire', '顶部段宝石落至冻结宝石上方')
  assert(frozenStay?.frozen === 2 && frozenStay.element === 'water', '冻结宝石悬空固定不动')
  assert(bottomStay?.element === 'wood', '底部段宝石落底')
  assert(gap, '冻结宝石下方空洞保留（解冻后自动恢复）')
  // 补新宝石：顶部段应被填满
  const topFilled = b.grid[0][2] !== null && b.grid[1][2] !== null && b.grid[2][2] !== null
  assert(topFilled, '顶部开放段由新宝石填满')
}

// ------------------------------------------------------------------
console.log('\n[5] 数值公式（REQ-DAMAGE 锚点验算）')
// ------------------------------------------------------------------
{
  assert(calcComboMult(1) === 1.0 && calcComboMult(2) === 1.2 && calcComboMult(3) === 1.5, '连击倍率 1/2/3 连')
  assert(calcComboMult(4) === 2.0 && calcComboMult(5) === 2.5 && calcComboMult(6) === 3.0 && calcComboMult(9) === 3.0, '连击倍率 4/5/6+ 连（封顶 3.0）')

  // 第一章攻击 2，3 颗火宝石，主战火（+20%），1 连
  const dmg = calcWaveDamage(
    [{ element: 'fire' }, { element: 'fire' }, { element: 'fire' }],
    1,
    { gemPower: 2, leaderElement: 'fire', sameBonusElement: null, gemMasteryBonus: 0, desperate: false }
  )
  assert(dmg === 7, `火3消+主战火加成 = floor(3×2×1.2) = 7（实际 ${dmg}）`)

  // 无加成对照
  const dmgPlain = calcWaveDamage(
    [{ element: 'water' }, { element: 'water' }, { element: 'water' }],
    1,
    { gemPower: 2, leaderElement: 'fire', sameBonusElement: null, gemMasteryBonus: 0, desperate: false }
  )
  assert(dmgPlain === 6, `水3消无加成 = 6（实际 ${dmgPlain}）`)

  // 2 连倍率：3 颗×2攻×1.2连击 = 7.2 → 7
  const dmg2 = calcWaveDamage(
    [{ element: 'water' }, { element: 'water' }, { element: 'water' }],
    2,
    { gemPower: 2, leaderElement: 'fire', sameBonusElement: null, gemMasteryBonus: 0, desperate: false }
  )
  assert(dmg2 === 7, `2 连击 3 消 = floor(6×1.2) = 7（实际 ${dmg2}）`)

  // 技能伤害：炎龙 15 × (1+15%支援+30%火焰之心)
  const skillDmg = calcSkillDamage(15, 'fire', { firePassive: true, heartOfFlame: true })
  assert(skillDmg === 21, `火焰斩+双重加成 = floor(15×1.45) = 21（实际 ${skillDmg}）`)

  // 冰霜女巫被动：敌人倒计时 +1
  const enemy = createEnemyState({ enemyId: 'enemy_slime' }, { enemyCdUp: true })
  assert(enemy.countdown === 4 && enemy.baseCountdown === 4, '冰霜女巫支援被动：初始倒计时 3→4')
}

// ------------------------------------------------------------------
console.log('\n[6] 洗牌（REQ-BATTLE-005）')
// ------------------------------------------------------------------
{
  let ok = true
  for (let i = 0; i < 30; i++) {
    const b = new GameBoard()
    b.shuffle()
    if (b.findMatches().length > 0 || !b.hasAnyValidSwap()) ok = false
  }
  assert(ok, '30 次洗牌均无现成消除且存在有效交换')
}

// ------------------------------------------------------------------
console.log('\n[7] 教学关棋盘保证（REQ-TUTO-003/004）')
// ------------------------------------------------------------------
{
  const b4 = new GameBoard({ ensureFourMatch: true })
  assert(!!b4.findValidSwap(), '保证四消机会的棋盘仍有有效交换')
  const b5 = new GameBoard({ ensureFiveMatch: true })
  assert(!!b5.findValidSwap(), '保证五消机会的棋盘仍有有效交换')
}

// ------------------------------------------------------------------
console.log('\n[8] 快照序列化往返（REQ-SAVE-002）')
// ------------------------------------------------------------------
{
  const b = new GameBoard({ initialSpecial: true })
  const snapshot: Grid = JSON.parse(JSON.stringify(b.grid))
  const restored = GameBoard.fromGrid(snapshot)
  const next = restored.pickRandomNormalCell()
  assert(!!next, '快照恢复后棋盘可继续操作')
  assert(
    JSON.stringify(restored.grid) === JSON.stringify(b.grid),
    '序列化/反序列化数据一致'
  )
  // 恢复后继续生成的新宝石 id 不冲突
  restored.grid[0][0] = null
  restored.applyGravity()
  let ids = new Set<number>()
  let noConflict = true
  for (const row of restored.grid) {
    for (const cell of row) {
      if (cell) {
        if (ids.has(cell.id)) noConflict = false
        ids.add(cell.id)
      }
    }
  }
  assert(noConflict, '恢复后新宝石 id 无冲突（渲染 key 安全）')
}

// ------------------------------------------------------------------
console.log('\n[9] 冻结宝石免疫消除（REQ-ENEMY-101 回归）')
// ------------------------------------------------------------------
{
  const b = new GameBoard()
  // 造一个干净棋盘：全部填充普通宝石
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      setCell(b, r, c, ELEMENTS[(r + c) % ELEMENTS.length])
    }
  }
  const frozenPos = { row: 3, col: 3 }
  b.grid[frozenPos.row][frozenPos.col]!.frozen = 2

  // 以 (3,3) 正上方为炸弹种子，其 3×3 范围必然覆盖冻结格
  const preview = GameBoard.expandBombTargets(b.grid, [{ row: 2, col: 3 }])
  const hitFrozen = preview.clear.some((p) => p.row === 3 && p.col === 3)
  assert(!hitFrozen, '炸弹 3×3 范围不会波及冻结宝石')

  // 即使直接把冻结格作为种子，也不应被清除
  const direct = GameBoard.expandBombTargets(b.grid, [frozenPos])
  assert(direct.clear.length === 0, '冻结宝石不能作为消除种子')

  // 真实落盘校验：清一次炸弹后冻结格仍在棋盘上
  const { cleared } = b.commitClear([{ row: 2, col: 3 }])
  const stillFrozen = b.grid[frozenPos.row][frozenPos.col]
  assert(!!stillFrozen && stillFrozen.frozen > 0, 'commitClear 后冻结宝石仍留在棋盘上')
  assert(
    cleared.every((c) => !(c.pos.row === frozenPos.row && c.pos.col === frozenPos.col)),
    '被清除列表中不含冻结宝石'
  )
}

// ------------------------------------------------------------------
console.log('\n[10] Boss 阶段转换（REQ-ENEMY-003 回归）')
// ------------------------------------------------------------------
{
  const dragon = createEnemyState({ enemyId: 'enemy_ancient_dragon' })
  assert(dragon.phaseHP.length === 2 && dragon.phaseMaxHp === 80, '远古巨龙：一阶段 80 血')

  dragon.hp = 0
  const advanced = advanceEnemyPhase(dragon)
  assert(advanced && dragon.phase === 2, '血量耗尽后推进到第二阶段')
  assert(dragon.hp === 60, '二阶段血量重置为 60')
  // 回归点：阶段上限必须同步，否则血条按 80 计算永远显示不满
  assert(dragon.phaseMaxHp === 60, '二阶段血量上限同步为 60（血条显示正确）')
  assert(dragon.countdown === dragon.baseCountdown + 1, '阶段转换重置倒计时（补偿本回合递减）')
  assert(!enemyDead(dragon), '二阶段敌人不应判定为死亡')

  dragon.hp = 0
  assert(!advanceEnemyPhase(dragon), '最后一阶段血量耗尽后不再推进')
  assert(enemyDead(dragon), '最后一阶段血量耗尽判定为死亡')
}

// ------------------------------------------------------------------
console.log(`\n========== 结果：${passed} 通过 / ${failed} 失败 ==========\n`)
process.exit(failed > 0 ? 1 : 0)

// ------------------------- 工具函数 -------------------------
function emptyGrid(): Grid {
  return Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null))
}

function setCell(b: GameBoard, row: number, col: number, element: ElementType): void {
  b.grid[row][col] = { id: (b as unknown as { nextId: number }).nextId++, element, special: null, frozen: 0 }
}

// 类型占位（保持导入完整）
export type { MatchGroup, Pos }
