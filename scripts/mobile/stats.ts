/**
 * 单文件构建统计（插件与包装脚本共享）
 *
 * Vite 配置模块与 scripts/build-mobile.mjs 运行在同一进程内：
 * 各插件在构建过程中把统计写入 globalThis，由包装脚本统一读取并打印构建报告。
 */

/** 单文件构建统计 */
export interface MobileBuildStats {
  /** public/ 图片资源内联统计 */
  assets?: {
    /** 内联资源数量 */
    count: number
    /** 原始字节数 */
    rawBytes: number
    /** Base64 后（Data URI 文本）字节数 */
    encodedBytes: number
  }
  /** JS / CSS 内联统计 */
  bundle?: {
    /** 内联 JS 字节数 */
    jsBytes: number
    /** 内联 CSS 字节数 */
    cssBytes: number
    /** 未能内联、仍以独立文件产出的产物（正常应为空） */
    leftovers: string[]
  }
}

const KEY = '__MOBILE_BUILD_STATS__'

type GlobalWithStats = typeof globalThis & { [KEY]?: MobileBuildStats }

/** 合并写入一部分统计（多个插件按需调用） */
export function reportStats(patch: MobileBuildStats): void {
  const g = globalThis as GlobalWithStats
  g[KEY] = { ...g[KEY], ...patch }
}

/** 读取当前累计统计 */
export function readStats(): MobileBuildStats {
  return (globalThis as GlobalWithStats)[KEY] ?? {}
}
