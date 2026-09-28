/**
 * 宝石展示区数值推导（REQ-UI 宝石系统展示）
 *
 * 宝石在本作中同时是"棋盘元素"和"玩家资源"：玩家消除得越多，
 * 对该元素的掌握就越熟练。本模块把这层含义量化成 1~5 级熟练度，
 * 让宝石展示区不只是静态图鉴，而是能读出"这局我在靠什么打"的战况面板。
 *
 * 注意：熟练度**不参与伤害结算**，数值锚点（REQ-DAMAGE）保持不变。
 */
import { ELEMENT_INFO, GEM_LEVEL_THRESHOLDS } from '@/config/constants'
import type { ElementType, GemStat } from '@/types'

/** 全元素零值统计表 */
export function createGemStats(): Record<ElementType, number> {
  return { fire: 0, water: 0, wood: 0, light: 0, dark: 0, thunder: 0 }
}

/**
 * 由累计消除量推导熟练度等级与进度。
 * @param cleared 本局该元素的累计消除数量
 */
export function calcGemStat(cleared: number): GemStat {
  let level = 1
  for (let i = 1; i < GEM_LEVEL_THRESHOLDS.length; i++) {
    if (cleared >= GEM_LEVEL_THRESHOLDS[i]) level = i + 1
  }
  const lo = GEM_LEVEL_THRESHOLDS[level - 1]
  const next = GEM_LEVEL_THRESHOLDS[level]
  // 满级后进度恒为 1（进度条走满，不再显示"还差多少升级"）
  const progress = next === undefined ? 1 : Math.min(1, (cleared - lo) / (next - lo))
  return { cleared, level, progress }
}

/** 宝石展示区单条目 */
export interface GemEntry {
  element: ElementType
  name: string
  iconId: (typeof ELEMENT_INFO)[ElementType]['iconId']
  color: string
  stat: GemStat
  /** 距离下一级还差多少颗（满级为 0） */
  toNextLevel: number
}

/** 构建宝石展示区的完整条目列表（顺序固定为火/水/木/光/暗/雷） */
export function buildGemEntries(counts: Record<ElementType, number>): GemEntry[] {
  return (Object.keys(ELEMENT_INFO) as ElementType[]).map((element) => {
    const info = ELEMENT_INFO[element]
    const cleared = counts[element] ?? 0
    const stat = calcGemStat(cleared)
    const next = GEM_LEVEL_THRESHOLDS[stat.level]
    return {
      element,
      name: info.name,
      iconId: info.iconId,
      color: info.color,
      stat,
      toNextLevel: next === undefined ? 0 : Math.max(0, next - cleared)
    }
  })
}
