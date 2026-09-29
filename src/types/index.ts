/**
 * 龙纹消消棋 - 全局类型定义
 * 所有核心数据结构在此集中声明，确保类型安全
 */
import type { IconId } from '@/config/iconIds'
import type { SpriteId } from '@/config/spriteIds'

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
  /** 头像图标 ID（256×256 透明 PNG，见 src/utils/icons.ts） */
  iconId: IconId
  /** 战斗展示区立绘 ID（640px 高透明 PNG，见 src/utils/sprites.ts） */
  spriteId: SpriteId
  /** 四消技能图标 ID */
  skill4IconId: IconId
  /** 五消技能图标 ID */
  skill5IconId: IconId
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

/**
 * 敌人单个行动（Boss / 精英的行动轮换，REQ-ENEMY-003）
 * 敌人每次行动按顺序取一条执行并循环，让 Boss 战具备"读招—应对"的节奏，
 * 而不是永远只有一次普通攻击。
 */
export type EnemyAction =
  /** 普通攻击：造成当前阶段攻击力伤害 */
  | { kind: 'attack'; name: string; desc?: string }
  /** 冻结棋盘 size×size 区域 turns 回合，可附带伤害 */
  | {
      kind: 'freezeBoard'
      name: string
      size: number
      turns: number
      damage?: number
      desc?: string
    }
  /** 造成伤害并使玩家中毒 */
  | { kind: 'poison'; name: string; damage: number; poison: DotEffect; desc?: string }
  /** 造成伤害并使玩家灼烧 */
  | { kind: 'burn'; name: string; damage: number; burn: DotEffect; desc?: string }
  /**
   * 蓄力：本次行动不造成伤害，进入蓄力状态；
   * 倒计时归零（敌人下次行动）时释放 release 大招。
   * 玩家在蓄力期间累计造成 interrupt 点伤害即可打断，打断后敌人受到 recoil 反噬。
   * window 可指定蓄力窗口回合数（默认沿用当前阶段倒计时），保证二阶段加速时
   * 打断窗口仍然公平。
   */
  | {
      kind: 'charge'
      name: string
      release: string
      releaseDamage: number
      interrupt: number
      recoil?: number
      window?: number
      desc?: string
    }
  /** 汲取：造成伤害并回复自身生命 */
  | { kind: 'drain'; name: string; damage: number; heal: number; desc?: string }

/** 敌人蓄力状态（Boss 战核心张力：必须抢输出打断，否则吃大招） */
export interface EnemyCharge {
  /** 蓄力招式名（如「龙焰蓄能」） */
  name: string
  /** 释放的招式名（如「灭世龙焰」） */
  release: string
  /** 释放伤害 */
  damage: number
  /** 打断所需累计伤害 */
  interrupt: number
  /** 打断后敌人受到的反噬伤害 */
  recoil: number
  /** 已累计承受的伤害 */
  taken: number
}

/** 敌人配置（REQ-ENEMY） */
export interface EnemyConfig {
  id: string
  name: string
  /** 各阶段 HP（多阶段 Boss，长度即阶段数） */
  phaseHP: number[]
  /** 行动倒计时初始值（单阶段敌人使用；多阶段请优先用 phaseCountdown） */
  countdown: number
  /** 普通攻击力（单阶段敌人使用；多阶段请优先用 phaseAttack） */
  attack: number
  /** 各阶段攻击力，缺省回退到 attack（REQ-ENEMY-003 阶段差异化） */
  phaseAttack?: number[]
  /** 各阶段行动倒计时，缺省回退到 countdown */
  phaseCountdown?: number[]
  /**
   * 各阶段行动轮换（索引 = 阶段 - 1，越界回退到最后一组）。
   * 不配置则敌人每次行动只做普通攻击（普通小怪行为不变）。
   */
  patterns?: EnemyAction[][]
  /** 阶段转换效果（可选） */
  phaseBlast?: { damage: number }
  skill: EnemySkill
  desc: string
  /** 头像图标 ID */
  iconId: IconId
  /** 战斗展示区立绘 ID */
  spriteId: SpriteId
}

/** 遗物配置（REQ-RELIC） */
export interface RelicConfig {
  id: string
  name: string
  desc: string
  /** 图标 ID */
  iconId: IconId
  type: 'output' | 'control' | 'survival' | 'rule'
}

/**
 * 敌人变体（关卡差异化的核心手段）
 *
 * 复用同一套敌人素材，通过名称前缀 + 数值倍率 + 出手节奏偏移，
 * 派生出玩法定位完全不同的敌人。这样不新增任何美术资源，
 * 也能让关卡设计师拥有"速杀 / 持久 / 抢节奏"等多种谜题素材。
 */
export interface EnemyVariant {
  /** 名称前缀，如「狂暴」「巨化」「迅捷」 */
  namePrefix: string
  /** 生命倍率 */
  hpMult: number
  /** 攻击倍率 */
  atkMult: number
  /** 初始行动倒计时偏移（负数 = 出手更快，压迫感更强） */
  countdownDelta?: number
  /** 变体主题色（仅用于 UI 区分，不影响数值） */
  tint?: string
}

/** 关卡波次中的敌人生成项 */
export interface WaveEnemy {
  enemyId: string
  /** 变体强化（不填为普通敌人） */
  variant?: EnemyVariant
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
  /** 头像图标 ID（中断恢复时按 configId 重新派生，避免旧存档残留失效值） */
  iconId: IconId
  /** 战斗展示区立绘 ID（同样按 configId 重新派生） */
  spriteId: SpriteId
  /** 变体主题色（无变体为 null） */
  tint: string | null
  phase: number
  hp: number
  phaseMaxHp: number
  phaseHP: number[]
  countdown: number
  baseCountdown: number
  attack: number
  /** 各阶段攻击力（阶段推进时取用，已计入精英倍率） */
  phaseAttack: number[]
  /** 各阶段行动倒计时（阶段推进时取用） */
  phaseCountdown: number[]
  /** 当前阶段的行动轮换（空数组 = 只做普通攻击） */
  pattern: EnemyAction[]
  /** 轮换游标 */
  patternIndex: number
  /** 蓄力状态（null = 未蓄力） */
  charging: EnemyCharge | null
  frozen: number
  stunned: number
  burn: DotEffect | null
  poison: DotEffect | null
  /** 阶段转换全屏攻击 */
  phaseBlastDamage: number
  skill: EnemySkill
}

/**
 * 伤害/治疗飘字
 *
 * 只记录"落在谁身上"，不记录屏幕坐标：飘字由战斗舞台（BattleStage.vue）
 * 渲染在自己一方的角色头顶，因此宽屏双栏 / 竖屏单列的版式变化都不会让数字飘错位置。
 */
export interface FloatText {
  id: number
  /** 数字落在哪一方身上（受击/受益方） */
  side: 'hero' | 'enemy'
  text: string
  kind: 'damage' | 'heal' | 'skill' | 'crit' | 'info'
}

/**
 * 角色动作状态（驱动战斗展示区的立绘动画）
 * idle 待机呼吸 / attack 出手前冲 / hurt 受击后仰 / dead 倒地消散
 */
export type ActorAction = 'idle' | 'attack' | 'hurt' | 'dead'

/** 命中特效类型（战斗展示区的攻击反馈元素） */
export type HitFxKind =
  /** 普攻斩击弧光 */
  | 'slash'
  /** 技能释放光柱 */
  | 'skill'
  /** 元素命中爆点 */
  | 'impact'
  /** 治疗光辉 */
  | 'heal'
  /** 施法蓄能：出手方身上的爆闪（技能/大招释放的前摇特效） */
  | 'cast'

/** 战斗展示区的命中特效实例 */
export interface HitFx {
  id: number
  kind: HitFxKind
  /** 出手阵营：hero = 英雄出手，特效落在怪物身上；enemy 反之 */
  side: 'hero' | 'enemy'
  /** 特效主题色（取英雄/敌人的元素色） */
  color: string
}

/** 宝石展示区：单个元素宝石的本局统计 */
export interface GemStat {
  /** 本局累计消除数量 */
  cleared: number
  /** 熟练度等级（1~5，由累计消除量分级，见 GEM_LEVEL_THRESHOLDS） */
  level: number
  /** 当前等级内的进度（0~1），用于绘制升级进度条 */
  progress: number
}

/** 技能特写展示 */
export interface CutIn {
  id: number
  /** 主战英雄头像图标 ID */
  heroIconId: IconId
  /** 技能图标 ID */
  skillIconId: IconId
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
  /** 玩家身上的灼烧/中毒（Boss 施加，回合结束结算） */
  playerBurn?: DotEffect | null
  playerPoison?: DotEffect | null
  /** 快照保存时的战斗阶段：遗物三选一中断后可正确恢复（旧存档缺省视为 fighting） */
  phase?: 'fighting' | 'relicSelect'
  /** 与 phase='relicSelect' 配套保存的三选一候选，保证恢复后选项一致 */
  relicOffers?: string[]
}
