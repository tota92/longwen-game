/**
 * 本地存档（REQ-SAVE）
 * - try/catch 包裹所有读写，失败静默降级不阻塞游戏（REQ-SAVE-003）
 * - 版本迁移：structure version 字段，不兼容时回退默认档
 */
import type { SaveData } from '@/types'
import { HEROES } from '@/config/heroes'

const SAVE_KEY = 'longwen_save_v1'

function defaultSave(): SaveData {
  return {
    version: 1,
    unlockedLevel: 1,
    team: {
      leader: HEROES[0].id,
      supports: [HEROES[1].id, HEROES[2].id]
    },
    maxCombo: 0,
    settings: { sound: true },
    failStreak: {},
    battleSnapshot: null
  }
}

/** 读取存档（损坏时返回默认档） */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return defaultSave()
    const data = JSON.parse(raw) as SaveData
    if (data.version !== 1 || !data.team) return defaultSave()
    return { ...defaultSave(), ...data }
  } catch (e) {
    console.warn('[save] 存档读取失败，使用默认存档', e)
    return defaultSave()
  }
}

/** 写入存档（失败静默） */
export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    return true
  } catch (e) {
    console.warn('[save] 存档写入失败（隐私模式/空间不足），降级为内存档', e)
    return false
  }
}

/** 清除战斗快照（正常结束战斗后调用） */
export function clearBattleSnapshot(): void {
  try {
    const data = loadSave()
    data.battleSnapshot = null
    writeSave(data)
  } catch {
    /* 静默 */
  }
}
