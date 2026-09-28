/**
 * 龙纹消消棋 - 全局类型定义
 * 所有核心数据结构在此集中声明，确保类型安全
 */

/** 元素类型：火/水/木/光/暗/雷 */
export type ElementType = 'fire' | 'water' | 'wood' | 'light' | 'dark' | 'thunder'

/** 特殊宝石类型：四消小技能石 / 五消终极技能石 / L型T型炸弹石 */
export type SpecialType = 'small' | 'ultimate' | 'bomb'

/** 棋盘格子（null 表示空洞，由冻结宝石阻挡下落产生） */
export interface Cell {
  /** 唯一 ID，Vue 渲染 key 与动画追踪 */
  id: number
  element: ElementType
  special: SpecialType | null
  /** 冻结剩余回合数，>0 时不可交换/消除/下落（REQ-ENEMY-101） */
  frozen: number
  /** 消除动画进行中标记（渲染层播放缩放消失动画） */
  popping?: boolean
}

/** 棋盘网格 grid[row][col] */
export type Grid = (Cell | null)[][]

/** 坐标 */
export interface Pos {
  row: number
  col: number
}

/** 单次消除组 */
export interface MatchGroup {
  /** 参与消除的格子坐标 */
  cells: Pos[]
  /** 直线长度（L/T 型为两臂之和） */
  length: number
  /** 产物特殊石类型（3 连为 null） */
  special: SpecialType | null
  /** 产物生成位置 */
  anchor: Pos
  element: ElementType
}

/** 英雄技能效果配置 */
export interface SkillEffect {
  name: string
  desc: string
  damage: number
  /** 回复生命 */
  heal?: number
  /** 获得护盾 */
  shield?: number
  /** 燃烧：每回合伤害/持续回合 */
  burn?: { damage: number; turns: number }
  /** 冻结敌人回合数 */
  freeze?: number
  /** 清除玩家负面状态 */
  clearDebuff?: boolean
  /** 斩杀（暗影刺客专属，MVP 外） */
  execute?: boolean
}

/** 英雄配置（REQ-HERO，REQ-CFG-003 唯一 ID） */
export interface HeroConfig {
  id: string
  name: string
  title: string
  element: ElementType
  /** 四消技能（小技能石触发） */
  skill4: SkillEffect
  /** 五消技能（终极技能石触发） */
  skill5: SkillEffect
  /** 支援被动 ID（代码逻辑引用） */
  passiveId: 'fireSkillUp' | 'enemyCdUp' | 'healPerTurn'
  passiveDesc: string
  icon: string
  color: string
}

/** 敌人技能 */
export type EnemySkill =
  | { type: 'none' }
  /** 冻结棋盘随机 size×size 区域 turns 回合 */
  | { type: 'freezeBoard'; size: number; turns: number }
  /** 攻击附带中毒 */
  | { type: 'poisonAttack'; damage: number; turns: number }
  /** 阶段转换全屏攻击（Boss 专属） */
  | { type: 'phaseBlast'; damage: number }

/** 敌人配置（REQ-ENEMY） */
export interface EnemyConfig {
  id: string
  name: string
  /** 各阶段 HP（多阶段 Boss，长度即阶段数） */
  phaseHP: number[]
  /** 行动倒计时初始值 */
  countdown: number
  /** 普通攻击力 */
  attack: number
  /** 阶段转换效果（可选） */
  phaseBlast?: { damage: number }
  skill: EnemySkill
  desc: string
  icon: string
}

/** 遗物配置（REQ-RELIC） */
export interface RelicConfig {
  id: string
  name: string
  desc: string
  icon: string
  type: 'output' | 'control' | 'survival' | 'rule'
}

/** 关卡波次中的敌人生成项 */
export interface WaveEnemy {
  enemyId: string
  /** 精英倍率（不填为普通） */
  elite?: { hpMult: number; atkMult: number; namePrefix: string }
}

/** 关卡配置（REQ-LEVEL） */
export interface LevelConfig {
  id: number
  chapter: number
  /** 章内序号（1 起） */
  indexInChapter: number
  type: 'tutorial' | 'normal' | 'elite' | 'boss'
  /** 波次（每波 1 个敌人；波间触发遗物三选一） */
  waves: WaveEnemy[]
  /** 本关单颗宝石攻击力（REQ-DAMAGE-002） */
  gemPower: number
  name: string
  /** 教学关类型 */
  tutorial?: 'match' | 'intro4' | 'intro5'
  /** 初始棋盘保证存在四消机会 */
  ensureFourMatch?: boolean
  /** 初始棋盘保证存在五消机会 */
  ensureFiveMatch?: boolean
}

/** 状态效果（燃烧/中毒） */
export interface DotEffect {
  damage: number
  turns: number
}

/** 战斗中敌人运行时状态 */
export interface EnemyState {
  configId: string
  display: string
  icon: string
  phase: number
  hp: number
  phaseMaxHp: number
  phaseHP: number[]
  countdown: number
  baseCountdown: number
  attack: number
  frozen: number
  stunned: number
  burn: DotEffect | null
  poison: DotEffect | null
  /** 阶段转换全屏攻击 */
  phaseBlastDamage: number
  skill: EnemySkill
}

/** 伤害/治疗飘字 */
export interface FloatText {
  id: number
  x: number
  y: number
  text: string
  kind: 'damage' | 'heal' | 'skill' | 'crit' | 'info'
}

/** 技能特写展示 */
export interface CutIn {
  id: number
  heroIcon: string
  heroName: string
  skillName: string
  color: string
}

/** 存档结构（REQ-SAVE） */
export interface SaveData {
  version: number
  /** 最高已解锁关卡 ID */
  unlockedLevel: number
  /** 编队：主战 + 支援 */
  team: { leader: string; supports: string[] }
  /** 最高连击纪录 */
  maxCombo: number
  settings: { sound: boolean }
  /** 各关卡连续失败次数（DDA-001 用） */
  failStreak: Record<number, number>
  /** 战斗中断快照（P1 中断恢复） */
  battleSnapshot: BattleSnapshot | null
}

/** 战斗快照：序列化进行中的战斗（REQ-SAVE-002） */
export interface BattleSnapshot {
  levelId: number
  waveIndex: number
  turnCount: number
  playerHP: number
  playerShield: number
  enemy: EnemyState
  relics: string[]
  grid: Grid
  combo: number
  maxComboInBattle: number
  totalDamage: number
  woodGemCleared: number
  /** 快照保存时的战斗阶段：遗物三选一中断后可正确恢复（旧存档缺省视为 fighting） */
  phase?: 'fighting' | 'relicSelect'
  /** 与 phase='relicSelect' 配套保存的三选一候选，保证恢复后选项一致 */
  relicOffers?: string[]
}
