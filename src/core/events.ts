/**
 * 龙脉异象随机事件池（V3 趣味包）
 *
 * 设计意图：
 * - 每回合结束按 DRAGON_EVENT_CHANCE 概率触发一次，打破"背板式"回合节奏
 * - 吉凶约 7:3：吉事件给补给/爆发（回血/护盾/技能石/聚色），凶事件制造小危机
 *   （反噬扣血/洗色），期望净补给约 +0.3~0.5 HP/回合，与龙脉代价（SWAP_HP_COST）
 *   对冲后仍保留净压力
 * - rollDragonEvent 只产出纯数据描述（无副作用），棋盘类效果由
 *   applyDragonEventToBoard 统一落实——store 与数值模拟器共用同一实现
 */
import { BOARD_SIZE, ELEMENTS } from '@/config/constants'
import type { ElementType, Grid, Pos, SpecialType } from '@/types'

/**
 * applyDragonEventToBoard 依赖的棋盘能力（结构类型）。
 * store 里的棋盘是 Vue reactive 包装后的对象，不再是 GameBoard 类实例类型，
 * 用结构接口可同时兼容 reactive 包装与数值模拟器里的原生 GameBoard。
 */
export interface DragonEventBoard {
  grid: Grid
  pickRandomNormalCell(candidates?: Pos[]): Pos | null
  placeSpecial(pos: Pos, special: SpecialType): boolean
  repairImmediateMatches(): void
}

export type DragonEventKind =
  | 'dragon_echo' // 龙脉回响：回复生命
  | 'scale_guard' // 龙鳞护体：获得护盾
  | 'crystal_blessing' // 龙晶赐福：随机普通宝石变小技能石
  | 'bomb_drop' // 天降龙晶：随机普通宝石变炸弹石
  | 'element_storm' // 元素风暴：随机若干宝石变为同一随机元素
  | 'dragon_backlash' // 龙脉反噬：额外损失生命（无视护盾）
  | 'element_chaos' // 元素紊乱：随机若干宝石元素被重置

export interface DragonEvent {
  kind: DragonEventKind
  /** 吉 = 对玩家有利（用于配比统计与测试） */
  beneficial: boolean
  /** 回响回复量 / 反噬伤害量 */
  hp?: number
  /** 护体护盾量 */
  shield?: number
  /** 赐福 / 天降龙晶的产物 */
  special?: SpecialType
  /** 风暴转换数量与目标元素 */
  convertCount?: number
  convertElement?: ElementType
  /** 紊乱重置数量 */
  scrambleCount?: number
}

const randInt = (min: number, max: number): number =>
  min + Math.floor(Math.random() * (max - min + 1))
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]

/** 事件权重表（合计 100，吉凶 70:30） */
const TABLE: { weight: number; roll: () => DragonEvent }[] = [
  { weight: 20, roll: () => ({ kind: 'dragon_echo', beneficial: true, hp: randInt(4, 7) }) },
  { weight: 15, roll: () => ({ kind: 'scale_guard', beneficial: true, shield: randInt(4, 6) }) },
  { weight: 13, roll: () => ({ kind: 'crystal_blessing', beneficial: true, special: 'small' }) },
  { weight: 8, roll: () => ({ kind: 'bomb_drop', beneficial: true, special: 'bomb' }) },
  {
    weight: 14,
    roll: () => ({
      kind: 'element_storm',
      beneficial: true,
      convertCount: 6,
      convertElement: pick(ELEMENTS)
    })
  },
  { weight: 18, roll: () => ({ kind: 'dragon_backlash', beneficial: false, hp: randInt(2, 4) }) },
  { weight: 12, roll: () => ({ kind: 'element_chaos', beneficial: false, scrambleCount: 5 }) }
]

/** 抽取一次龙脉异象事件 */
export function rollDragonEvent(): DragonEvent {
  const total = TABLE.reduce((s, e) => s + e.weight, 0)
  let ticket = Math.random() * total
  for (const entry of TABLE) {
    ticket -= entry.weight
    if (ticket < 0) return entry.roll()
  }
  return TABLE[TABLE.length - 1].roll()
}

/** 随机改写 count 颗宝石元素（跳过冻结宝石与技能石；rewrite 返回 null 表示该格不可改写），返回实际改写数量 */
function rewriteRandomGems(
  board: DragonEventBoard,
  count: number,
  rewrite: (current: ElementType) => ElementType | null
): number {
  let done = 0
  let guard = 0
  while (done < count && guard++ < count * 30) {
    const r = Math.floor(Math.random() * BOARD_SIZE)
    const c = Math.floor(Math.random() * BOARD_SIZE)
    const cell = board.grid[r]?.[c]
    if (!cell || cell.frozen > 0 || cell.special) continue
    const next = rewrite(cell.element)
    if (next === null || next === cell.element) continue
    cell.element = next
    done++
  }
  return done
}

/**
 * 在棋盘上落实事件的改盘效果（赐福/龙晶放置产物、风暴聚色、紊乱洗色），
 * 返回受影响的宝石数（非棋盘类事件返回 0）。
 *
 * 改写元素的事件结束后统一修复现成匹配：否则棋盘上残留自动匹配时，
 * 下一次任意交换都会被误判为"有效交换"（doSwap 以全盘匹配数判定）。
 */
export function applyDragonEventToBoard(board: DragonEventBoard, ev: DragonEvent): number {
  switch (ev.kind) {
    case 'crystal_blessing':
    case 'bomb_drop': {
      const spot = board.pickRandomNormalCell()
      if (!spot || !ev.special) return 0
      return board.placeSpecial(spot, ev.special) ? 1 : 0
    }
    case 'element_storm': {
      const target = ev.convertElement!
      const n = rewriteRandomGems(board, ev.convertCount ?? 6, (cur) =>
        cur === target ? null : target
      )
      board.repairImmediateMatches()
      return n
    }
    case 'element_chaos': {
      const n = rewriteRandomGems(
        board,
        ev.scrambleCount ?? 5,
        (cur) => pick(ELEMENTS.filter((e) => e !== cur))
      )
      board.repairImmediateMatches()
      return n
    }
    default:
      return 0
  }
}
