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
import { ENEMIES, ENEMY_VARIANTS } from '../src/config/enemies'
import { LEVELS } from '../src/config/levels'
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
  assert(dragon.phaseHP.length === 2 && dragon.phaseMaxHp === 120, '远古巨龙：一阶段 120 血')

  dragon.hp = 0
  const advanced = advanceEnemyPhase(dragon)
  assert(advanced && dragon.phase === 2, '血量耗尽后推进到第二阶段')
  assert(dragon.hp === 100, '二阶段血量重置为 100')
  // 回归点：阶段上限必须同步，否则血条按 120 计算永远显示不满
  assert(dragon.phaseMaxHp === 100, '二阶段血量上限同步为 100（血条显示正确）')
  assert(dragon.countdown === dragon.baseCountdown + 1, '阶段转换重置倒计时（补偿本回合递减）')
  assert(!enemyDead(dragon), '二阶段敌人不应判定为死亡')

  dragon.hp = 0
  assert(!advanceEnemyPhase(dragon), '最后一阶段血量耗尽后不再推进')
  assert(enemyDead(dragon), '最后一阶段血量耗尽判定为死亡')
}

// ------------------------------------------------------------------
console.log('\n[11] Boss 行动轮换与蓄力机制（5.4 回归）')
// ------------------------------------------------------------------
{
  const dragon = createEnemyState({ enemyId: 'enemy_ancient_dragon' })
  assert(dragon.pattern.length === 3, '远古巨龙一阶段行动轮换含 3 招')
  assert(dragon.pattern[0].kind === 'charge', '蓄力大招排在轮换首位（保证每阶段必触发）')
  assert(dragon.attack === 14 && dragon.phaseAttack[1] === 17, '阶段攻击力表 14 → 17')
  assert(dragon.patternIndex === 0 && dragon.charging === null, '初始轮换游标为 0 且未蓄力')
  const firstCharge = dragon.pattern[0]
  assert(
    firstCharge.kind === 'charge' && firstCharge.window === 3 && firstCharge.interrupt > 0,
    '蓄力招式带独立打断窗口（window=3）与打断阈值'
  )

  // 阶段推进：切换轮换、攻击力、倒计时，并清除蓄力
  dragon.charging = {
    name: '龙焰蓄能',
    release: '灭世龙焰',
    damage: 30,
    interrupt: 38,
    recoil: 14,
    taken: 0
  }
  dragon.hp = 0
  advanceEnemyPhase(dragon)
  assert(dragon.attack === 17, '二阶段攻击力提升到 17（狂怒）')
  assert(dragon.baseCountdown === 2, '二阶段倒计时缩短为 2（狂怒加速）')
  assert(dragon.pattern.some((a) => a.kind === 'burn'), '二阶段轮换加入灼烧招式')
  assert(dragon.patternIndex === 0, '阶段转换重置轮换游标')
  assert(dragon.charging === null, '阶段转换清除进行中的蓄力')

  // 轮换回退：只配置一套轮换的敌人（幼龙），二阶段沿用同一套
  const whelp = createEnemyState({ enemyId: 'enemy_dragon_whelp' })
  assert(whelp.pattern[0].kind === 'charge', '幼龙开局即蓄力（教学）')
  whelp.hp = 0
  advanceEnemyPhase(whelp)
  assert(
    whelp.pattern.length === 2 && whelp.pattern.some((a) => a.kind === 'charge'),
    '幼龙仅配置一套轮换，二阶段自动沿用'
  )

  // 未配置 patterns 的小怪退化为空轮换（走旧版普攻分支）
  const slime = createEnemyState({ enemyId: 'enemy_slime' })
  assert(slime.pattern.length === 0, '史莱姆未配置轮换，退化为普通攻击')

  // 变体倍率同时作用于各阶段攻击力与 HP
  const eliteDragon = createEnemyState({
    enemyId: 'enemy_ancient_dragon',
    variant: { ...ENEMY_VARIANTS.elite }
  })
  assert(eliteDragon.attack === Math.floor(14 * 1.4), '精英变体作用于阶段攻击力')
  assert(eliteDragon.phaseMaxHp === Math.floor(120 * 1.8), '精英变体作用于阶段 HP')
  assert(eliteDragon.display === '精英·远古巨龙', '变体前缀写入显示名')
  assert(eliteDragon.tint === ENEMY_VARIANTS.elite.tint, '变体主题色写入状态（UI 区分用）')
}

// ------------------------------------------------------------------
console.log('\n[12] 敌人变体（关卡差异化的基础）')
// ------------------------------------------------------------------
{
  const base = createEnemyState({ enemyId: 'enemy_slime' })
  const berserk = createEnemyState({ enemyId: 'enemy_slime', variant: { ...ENEMY_VARIANTS.berserk } })
  const giant = createEnemyState({ enemyId: 'enemy_slime', variant: { ...ENEMY_VARIANTS.giant } })
  const swift = createEnemyState({ enemyId: 'enemy_slime', variant: { ...ENEMY_VARIANTS.swift } })

  assert(berserk.attack > base.attack * 1.5 && berserk.phaseMaxHp < giant.phaseMaxHp, '狂暴：攻击高、血量不厚（速杀定位）')
  assert(giant.phaseMaxHp === Math.floor(30 * 2.6) && giant.attack === base.attack, '巨化：血量 2.6 倍、攻击不变（持久定位）')
  assert(swift.countdown === base.countdown - 1, '迅捷：初始倒计时 -1（出手更快）')
  assert(base.tint === null && base.display === '史莱姆', '普通敌人无变体前缀与主题色')

  // 倒计时偏移与冰霜女巫支援被动（+1）叠加，且不会低于 1
  const swiftWithCdUp = createEnemyState(
    { enemyId: 'enemy_slime', variant: { ...ENEMY_VARIANTS.swift } },
    { enemyCdUp: true }
  )
  assert(swiftWithCdUp.countdown === base.countdown, '迅捷(-1) 与冰霜女巫被动(+1) 相互抵消')
  const swiftLizard = createEnemyState({
    enemyId: 'enemy_fire_lizard',
    variant: { ...ENEMY_VARIANTS.swift }
  })
  assert(swiftLizard.countdown === 1, '迅捷火蜥蜴倒计时 2→1，且被下限保护为 1')
}

// ------------------------------------------------------------------
console.log('\n[13] 关卡设计不变量（设计规则的可执行校验）')
// ------------------------------------------------------------------
{
  // 关卡 ID 唯一且连续
  const ids = LEVELS.map((l) => l.id)
  assert(new Set(ids).size === ids.length, '关卡 ID 无重复')
  assert(ids.every((id, i) => id === i + 1), '关卡 ID 从 1 连续递增')

  // 所有波次引用的敌人 ID 必须存在
  const badRefs = LEVELS.flatMap((l) => l.waves)
    .map((w) => w.enemyId)
    .filter((id) => !ENEMIES.some((e) => e.id === id))
  assert(badRefs.length === 0, `所有波次敌人引用有效（异常 ${badRefs.length} 处）`)

  // 章节与章内序号自洽
  const chapterOk = LEVELS.every((l) => {
    const sameChapter = LEVELS.filter((x) => x.chapter === l.chapter)
    return sameChapter[l.indexInChapter - 1]?.id === l.id
  })
  assert(chapterOk, 'indexInChapter 与章节分组自洽')

  // 每关必须有名字与正整数宝石攻击力
  assert(
    LEVELS.every((l) => l.name.length > 0 && l.gemPower > 0),
    '每关都有名称与合法宝石攻击力'
  )

  // 设计原则 1：禁止相邻关卡同质（波次构成完全相同）
  const sig = (l: (typeof LEVELS)[number]) =>
    l.waves.map((w) => `${w.enemyId}#${w.variant?.namePrefix ?? ''}`).join('>')
  const duplicates: number[] = []
  for (let i = 1; i < LEVELS.length; i++) {
    if (LEVELS[i].waves.length > 0 && sig(LEVELS[i]) === sig(LEVELS[i - 1])) {
      duplicates.push(LEVELS[i].id)
    }
  }
  assert(duplicates.length === 0, `相邻关卡无同质重复（重复 ${duplicates.join(',') || '无'}）`)

  // 设计原则 3：正式 Boss 关至少 3 波，保证进 Boss 前有 2 个遗物（教学 Boss 除外）
  const bossLevels = LEVELS.filter((l) => l.type === 'boss' && !l.tutorial)
  assert(
    bossLevels.length > 0 && bossLevels.every((l) => l.waves.length >= 3),
    `正式 Boss 关波次 >= 3（进 Boss 前遗物 >= 2）：${bossLevels.map((l) => `${l.id}关${l.waves.length}波`).join('，')}`
  )

  // 教学关配置（REQ-TUTO-002/003/004）
  const lv1 = LEVELS[0]
  const lv2 = LEVELS[1]
  const lv3 = LEVELS[2]
  assert(lv1.tutorial === 'match' && lv1.waves.length === 0, '1-1：无敌人，纯消除教学')
  assert(lv2.tutorial === 'intro4' && lv2.ensureFourMatch === true, '1-2：四消教学且保证棋盘有四消机会')
  assert(
    lv3.tutorial === 'intro5' && lv3.ensureFiveMatch === true && lv3.waves.length >= 2,
    '1-3：五消教学 + 两阶段 Boss'
  )

  // 每章最后一关必须有收束（精英或 Boss）
  const chapters = [...new Set(LEVELS.map((l) => l.chapter))]
  const closureOk = chapters.every((ch) => {
    const inChapter = LEVELS.filter((l) => l.chapter === ch)
    const last = inChapter[inChapter.length - 1]
    return last.type === 'boss' || last.type === 'elite'
  })
  assert(closureOk, '每章最后一关为精英或 Boss（章节收束）')

  // 章节基准：宝石攻击力随章节递增
  assert(
    LEVELS.filter((l) => l.chapter === 1).every((l) => l.gemPower === 2) &&
      LEVELS.filter((l) => l.chapter === 2).every((l) => l.gemPower === 3),
    '章节宝石攻击力基准：第一章 2 / 第二章 3'
  )

  // 变体使用情况：第一章应至少用到 4 种变体，避免"全章只有史莱姆"
  const ch1Variants = new Set(
    LEVELS.filter((l) => l.chapter === 1)
      .flatMap((l) => l.waves)
      .map((w) => w.variant?.namePrefix)
      .filter(Boolean)
  )
  assert(ch1Variants.size >= 4, `第一章敌人变体种类 >= 4（实际 ${[...ch1Variants].join('/')}）`)

  // 每关都有可击杀的敌人（除纯教学关）
  assert(
    LEVELS.every((l) => l.waves.length > 0 || l.tutorial === 'match'),
    '除 1-1 教学关外，每关都有敌人波次'
  )
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
