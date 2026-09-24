/**
 * 动画/异步辅助工具
 */

/** 等待指定毫秒（战斗流程编排用） */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 等待下一帧（用于让 Vue 先渲染一次 DOM 再变更，实现入场位移动画） */
export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

/** 区间随机整数 [min, max] */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** 数组随机取 n 个不重复元素 */
export function sampleN<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const result: T[] = []
  while (result.length < n && copy.length > 0) {
    result.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  }
  return result
}
