/**
 * 游戏全局状态与战斗流程编排（Pinia）
 *
 * 职责：
 * - 页面切换（主界面/编队/关卡选择/战斗）
 * - 战斗回合编排：交换→消除连锁→伤害→敌人阶段（REQ-BATTLE-001）
 * - 技能石主动触发（REQ-BOARD-004）
 * - 状态效果：燃烧/中毒/冻结/眩晕/护盾（REQ-HERO-101~103）
 * - 遗物三选一与局内构建（REQ-RELIC）
 * - DDA 动态难度（REQ-DDA-001）
 * - 战斗快照存档与中断恢复（REQ-SAVE-002）
 * - UI 瞬态：飘字/技能特写/连击/震屏/闪白
 */
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { GameBoard } from '@/core/board'
import {
  advanceEnemyPhase,
  calcSkillDamage,
  calcWaveDamage,
  createEnemyState,
  elementCounterOf,
  enemyDead,
  resolvePattern,
  tryEnrage
} from '@/core/battle'
import {
  ANIM,
  BOARD_SIZE,
  chapterAtkMult,
  chapterHpMult,
  DDA_FAIL_TIMES,
  DRAGON_EVENT_CHANCE,
  ELEMENT_INFO,
  ELEMENTS,
  GEM_CRIT_CHANCE,
  GEM_CRIT_MULT,
  GEM_FROZEN_TURNS,
  MAX_RELICS,
  PASSIVE_HEAL_PER_TURN,
  PLAYER_MAX_HP,
  RELIC_CHOICES,
  skillChapterScale,
  SWAP_HP_COST,
  TUTORIAL_MATCH_TARGET
} from '@/config/constants'
import { applyDragonEventToBoard, rollDragonEvent } from '@/core/events'
import { getLevel } from '@/config/levels'
import { getEnemy } from '@/config/enemies'
import { getRelic, RELICS } from '@/config/relics'
import { ENEMY_ACTION_FX, fxLife, fxPose, heroSkillFx, type FxVariant } from '@/config/fxVariants'
import { getHero, HEROES } from '@/config/heroes'
import { buildGemEntries, createGemStats } from '@/core/gems'
import type {
  ActorAction,
  CutIn,
  DotEffect,
  ElementType,
  EnemyState,
  FloatText,
  Grid,
  HitFx,
  HitFxKind,
  LevelConfig,
  MatchGroup,
  Pos,
  SaveData,
  SkillEffect,
  SpecialType
} from '@/types'
import { loadSave, writeSave } from '@/utils/storage'
import { audio } from '@/utils/audio'
import { preloadBoardIcons } from '@/utils/icons'
import { preloadSprites } from '@/utils/sprites'
import { sampleN, sleep } from '@/utils/anim'
import type { IconId } from '@/config/iconIds'

export type Screen = 'home' | 'team' | 'levels' | 'battle'
export type BattlePhase = 'fighting' | 'relicSelect' | 'result'

interface BattleRuntime {
  level: LevelConfig | null
  waveIndex: number
  board: GameBoard | null
  playerHP: number
  playerShield: number
  enemy: EnemyState | null
  relics: string[]
  turnCount: number
  combo: number
  maxComboInBattle: number
  totalDamage: number
  woodGemCleared: number
  /** 玩家身上的灼烧 / 中毒（Boss 施加，回合结束结算，REQ-ENEMY-002） */
  playerBurn: DotEffect | null
  playerPoison: DotEffect | null
  canInteract: boolean
  paused: boolean
  phase: BattlePhase
  result: 'victory' | 'defeat' | null
  /** 棋盘实例序号：关卡重开时递增，用于强制重建棋盘 DOM（避免复用上一局宝石产生幻影滑动） */
  boardSeq: number
  /** 教学 1-1：已完成消除次数 */
  tutorialProgress: number
  /** 教学 1-1：高亮提示的有效交换对 */
  hint: [Pos, Pos] | null
  /** 教程引导是否已被玩家手动关闭（仅本关有效，重开/换关后恢复） */
  guideDismissed: boolean
  /** 洗牌动画标记 */
  shuffling: boolean
  /* ---------------- 战斗展示区 / 宝石区 / 技能区（REQ-UI） ---------------- */
  /** 本局各元素宝石的累计消除量（宝石展示区数据源，不入快照） */
  gemStats: Record<ElementType, number>
  /** 英雄动作状态：驱动展示区立绘动画 */
  heroAction: ActorAction
  /** 怪物动作状态：驱动展示区立绘动画 */
  enemyAction: ActorAction
  /** 底部信息面板当前 Tab */
  bottomTab: 'gem' | 'skill'
  /** 宝石展示区聚焦的元素：高亮棋盘上同元素宝石（辅助规划，不消耗回合） */
  focusElement: ElementType | null
}

export const useGameStore = defineStore('game', () => {
  // ================================================================
  // 全局状态
  // ================================================================
  const screen = ref<Screen>('home')
  const profile = reactive<SaveData>(loadSave())
  audio.setEnabled(profile.settings.sound)

  const battle = reactive<BattleRuntime>({
    level: null,
    waveIndex: 0,
    board: null,
    playerHP: PLAYER_MAX_HP,
    playerShield: 0,
    enemy: null,
    relics: [],
    turnCount: 0,
    combo: 0,
    maxComboInBattle: 0,
    totalDamage: 0,
    woodGemCleared: 0,
    playerBurn: null,
    playerPoison: null,
    canInteract: false,
    paused: false,
    phase: 'fighting',
    result: null,
    boardSeq: 0,
    tutorialProgress: 0,
    hint: null,
    guideDismissed: false,
    shuffling: false,
    gemStats: createGemStats(),
    heroAction: 'idle',
    enemyAction: 'idle',
    bottomTab: 'gem',
    focusElement: null
  })

  // UI 瞬态
  const floatTexts = ref<FloatText[]>([])
  /** 战斗展示区命中特效（斩击/技能光柱/元素爆点/治疗光辉） */
  const hitFxs = ref<HitFx[]>([])
  let fxUid = 1
  const cutIn = ref<CutIn | null>(null)
  const shakeScreen = ref(0)
  const flashWhite = ref(0)
  /** 敌人行动预警计数（REQ-FEEL-005：行动前 0.5 秒预警动画） */
  const enemyWarn = ref(0)
  /** 提示浮层当前展示的系统提示（自动消失；教程引导走 guideText 常驻） */
  const tip = ref<{ id: number; text: string } | null>(null)
  let tipTimer = 0
  let uid = 1

  // 遗物三选一候选
  const relicOffers = ref<string[]>([])

  // ================================================================
  // 派生状态
  // ================================================================
  const leader = computed(() => getHero(profile.team.leader))
  const supports = computed(() => profile.team.supports.map((id) => getHero(id)))
  const hasBattleSnapshot = computed(() => profile.battleSnapshot !== null)

  /** 同元素加成：两名支援均与主战同元素（REQ-HERO-004） */
  const sameBonusElement = computed<ElementType | null>(() => {
    if (supports.value.length < 2) return null
    const [a, b] = supports.value
    return a.element === leader.value.element && b.element === leader.value.element
      ? leader.value.element
      : null
  })

  const hasRelic = (id: string) => battle.relics.includes(id)

  /* ---------------- V2：元素克制 / 护甲 / 火加成（伤害结算共用） ---------------- */

  /** 元素克制信息（弱点猎手遗物把弱点倍率 1.5 提升到 1.8） */
  const enemyCounter = computed(() =>
    elementCounterOf(battle.enemy ? getEnemy(battle.enemy.configId) : null, hasRelic('relic_weak_hunter'))
  )

  /** 敌人当前阶段护甲（按消除波减免伤害，下限 1） */
  function enemyArmor(): number {
    const e = battle.enemy
    if (!e) return 0
    return e.armor?.[e.phase - 1] ?? 0
  }

  /** 火元素伤害加成（火焰之心遗物 + 支援被动，加算） */
  const fireBonus = computed(
    () =>
      (hasRelic('relic_heart_of_flame') ? 0.25 : 0) +
      (supports.value.some((h) => h.passiveId === 'fireSkillUp') ? 0.1 : 0)
  )

  /** 遗物护盾累计上限（自然共鸣 / 铁壁） */
  const RELIC_SHIELD_CAP = 20

  /** 宝石展示区条目（6 元素 + 熟练度等级/进度），由本局消除量实时推导 */
  const gemEntries = computed(() => buildGemEntries(battle.gemStats))

  /** 技能信息区上下文：遗物 / 支援被动 / 低血（绝境反击条件）/ 当前敌人克制与护甲 */
  const skillContext = computed(() => ({
    relics: [...battle.relics],
    firePassive: supports.value.some((h) => h.passiveId === 'fireSkillUp'),
    freezePassive: supports.value.some((h) => h.passiveId === 'freezeUp'),
    lowHP: battle.playerHP > 0 && battle.playerHP < PLAYER_MAX_HP * 0.3,
    // V2：技能面板展示的真实伤害需包含元素克制 / 护甲 / 章节缩放（与战斗结算同源）
    counter: enemyCounter.value,
    armor: enemyArmor(),
    chapterScale: battle.level ? skillChapterScale(battle.level.gemPower) : 1
  }))

  /**
   * 敌人属性面板（V2 战斗舞台展示）：元素 / 弱点 / 抗性 / 当前阶段护甲。
   * 数据源为敌人配置表（随版本更新），护甲取当前阶段值（含变体加成）。
   */
  const enemyAttributes = computed(() => {
    const e = battle.enemy
    if (!e) return null
    const cfg = getEnemy(e.configId)
    return {
      element: cfg.element,
      weak: cfg.weak,
      resist: cfg.resist,
      armor: e.armor?.[e.phase - 1] ?? 0
    }
  })

  /** 棋盘上某元素的可交互宝石数量（宝石区"使用"时的反馈文案） */
  function countElementOnBoard(el: ElementType): number {
    const grid = battle.board?.grid
    if (!grid) return 0
    let n = 0
    for (const row of grid) {
      for (const cell of row) {
        if (cell && cell.element === el) n++
      }
    }
    return n
  }

  /** 战斗引导文案（REQ-TUTORIAL：非弹窗式引导） */
  const guideText = computed<string | null>(() => {
    const lv = battle.level
    if (!lv?.tutorial) return null
    if (lv.tutorial === 'match') {
      // 目标与进度在上方训练面板展示，这里只给"怎么做"的操作提示，避免重复文案
      return battle.tutorialProgress < TUTORIAL_MATCH_TARGET
        ? '交换相邻两颗宝石，凑齐 3 个同元素即可消除'
        : '干得漂亮！'
    }
    if (lv.tutorial === 'intro4') {
      // V2：1-2 同时承担"元素克制"教学——史莱姆弱火，与主战炎龙骑士天然对齐
      return '提示：打弱点伤害 ×1.5（史莱姆弱火）；4 个相同宝石连成一线会生成技能石，点击可释放！'
    }
    if (lv.tutorial === 'intro5') {
      return '提示：幼龙弱光；Boss 蓄力时抢输出把进度条打满即可打断它的大招！'
    }
    return null
  })

  /**
   * 提示浮层当前应展示的内容（系统提示优先于教程引导）。
   * 所有提示统一收敛到覆盖在棋盘之上的提示浮层：
   * 既不占布局空间（棋盘尺寸/位置完全不受影响），也不拦截棋盘操作。
   */
  const activeTip = computed<{ text: string; kind: 'tutorial' | 'system' } | null>(() => {
    if (tip.value) return { text: tip.value.text, kind: 'system' }
    const guide = guideText.value
    if (guide && !battle.guideDismissed) return { text: guide, kind: 'tutorial' }
    return null
  })

  /** 是否存在被手动关闭、可重新打开的教程引导 */
  const hasHiddenGuide = computed(() => !!guideText.value && battle.guideDismissed)

  // ================================================================
  // 存档
  // ================================================================
  function persist(): void {
    writeSave(JSON.parse(JSON.stringify(profile)))
  }

  /** 战斗快照（REQ-SAVE-002：每回合结束实时存档） */
  function saveSnapshot(): void {
    if (!battle.level || battle.phase === 'result') return
    profile.battleSnapshot = {
      levelId: battle.level.id,
      waveIndex: battle.waveIndex,
      turnCount: battle.turnCount,
      playerHP: battle.playerHP,
      playerShield: battle.playerShield,
      enemy: battle.enemy ? JSON.parse(JSON.stringify(battle.enemy)) : null,
      relics: [...battle.relics],
      grid: JSON.parse(JSON.stringify(battle.board?.grid ?? [])),
      combo: battle.combo,
      maxComboInBattle: battle.maxComboInBattle,
      totalDamage: battle.totalDamage,
      woodGemCleared: battle.woodGemCleared,
      playerBurn: battle.playerBurn ? { ...battle.playerBurn } : null,
      playerPoison: battle.playerPoison ? { ...battle.playerPoison } : null,
      // 遗物三选一属于"进行中战斗"的一部分：记录阶段与候选，恢复后可继续选择
      phase: battle.phase === 'relicSelect' ? 'relicSelect' : 'fighting',
      relicOffers: battle.phase === 'relicSelect' ? [...relicOffers.value] : []
    }
    persist()
  }

  /**
   * 快照敌人状态规整（REQ-SAVE-002 兼容性）：
   * - iconId 按配置表重新派生，避免旧存档残留失效值
   * - pattern / patternIndex / charging / phaseAttack / phaseCountdown 为新增字段，
   *   旧存档缺失时按当前阶段从配置表补齐，保证恢复后可继续正常战斗
   */
  function normalizeEnemy(raw: EnemyState): EnemyState {
    const cfg = getEnemy(raw.configId)
    const phaseAttack = raw.phaseAttack ?? cfg.phaseAttack ?? cfg.phaseHP.map(() => cfg.attack)
    const phaseCountdown =
      raw.phaseCountdown ?? cfg.phaseCountdown ?? cfg.phaseHP.map(() => cfg.countdown)
    return {
      ...raw,
      iconId: cfg.iconId,
      // 立绘 ID 同样随配置表派生：旧存档快照可能缺失或残留历史值
      spriteId: cfg.spriteId,
      tint: raw.tint ?? null,
      phaseAttack,
      phaseCountdown,
      attack: raw.attack ?? phaseAttack[raw.phase - 1] ?? cfg.attack,
      baseCountdown: raw.baseCountdown ?? phaseCountdown[raw.phase - 1] ?? cfg.countdown,
      pattern: raw.pattern ?? resolvePattern(cfg, raw.phase),
      patternIndex: raw.patternIndex ?? 0,
      charging: raw.charging ?? null,
      // V2 新增字段：旧存档缺失时按配置表补齐（护甲随阶段），护盾/狂怒从零开始
      armor: raw.armor ?? cfg.armor ?? cfg.phaseHP.map(() => 0),
      shield: raw.shield ?? 0,
      enraged: raw.enraged ?? false
    }
  }

  // ================================================================
  // UI 瞬态工具
  // ================================================================
  /**
   * 提示浮层：展示一条系统提示（到点自动消失）。
   * 系统提示不再以飘字形式飘在棋盘上方，统一走棋盘之上的提示浮层，
   * 避免多条信息叠加遮挡操作区域。
   */
  function showTip(text: string, duration = ANIM.tip): void {
    clearTimeout(tipTimer)
    tip.value = { id: uid++, text }
    tipTimer = window.setTimeout(() => {
      tip.value = null
    }, duration)
  }

  /** 手动关闭提示：系统提示直接清掉；教程引导则标记为本关不再显示 */
  function dismissTip(): void {
    if (tip.value) {
      clearTimeout(tipTimer)
      tip.value = null
      return
    }
    if (guideText.value) battle.guideDismissed = true
  }

  /** 重新打开被手动关闭的教程引导 */
  function reopenTip(): void {
    battle.guideDismissed = false
  }

  /**
   * 伤害/治疗飘字入队。
   * 飘字由战斗舞台渲染在"挨打/受益"那一方的角色头顶（FloatText.side），
   * 不再按屏幕百分比定位，宽屏双栏与竖屏单列都不会飘错位置。
   * @param side 数字落在哪一方身上；默认伤害归怪物、治疗归英雄，
   *             敌人被治疗、英雄被打等相反情况由调用方显式指定
   */
  function addFloat(
    text: string,
    kind: FloatText['kind'],
    side: 'hero' | 'enemy' = kind === 'heal' ? 'hero' : 'enemy'
  ): void {
    // 系统提示统一走提示浮层，不再盖在棋盘格子上
    if (kind === 'info') {
      showTip(text)
      return
    }
    const ft: FloatText = { id: uid++, side, text, kind }
    floatTexts.value.push(ft)
    setTimeout(() => {
      floatTexts.value = floatTexts.value.filter((f) => f.id !== ft.id)
    }, ANIM.floatText + 100)
  }

  function showCutIn(
    heroIconId: IconId,
    skillIconId: IconId,
    heroName: string,
    skillName: string,
    color: string
  ): void {
    const id = uid++
    cutIn.value = { id, heroIconId, skillIconId, heroName, skillName, color }
    setTimeout(() => {
      if (cutIn.value?.id === id) cutIn.value = null
    }, ANIM.cutIn + 150)
  }

  function doShake(): void {
    shakeScreen.value++
  }

  function doFlash(): void {
    flashWhite.value++
  }

  // ================================================================
  // 战斗展示区：角色动作状态机与命中特效（REQ-UI 战斗反馈元素）
  // ================================================================

  /** 各阵营动作状态的自动回退定时器 */
  const actionTimers: Record<'hero' | 'enemy', number> = { hero: 0, enemy: 0 }

  /**
   * 切换角色动作状态，播放完毕后自动回到 idle。
   * idle 与 dead 不设回退：idle 是默认态，dead 是终态（由 startLevel / spawnWave 重置）。
   */
  function setActorAction(side: 'hero' | 'enemy', action: ActorAction): void {
    const apply = (a: ActorAction): void => {
      if (side === 'hero') battle.heroAction = a
      else battle.enemyAction = a
    }
    apply(action)
    clearTimeout(actionTimers[side])
    if (action === 'idle' || action === 'dead') return
    const dur =
      action === 'attack' ? ANIM.actorAttack : action === 'skill' ? ANIM.actorSkill : ANIM.actorHurt
    actionTimers[side] = window.setTimeout(() => {
      const current = side === 'hero' ? battle.heroAction : battle.enemyAction
      if (current === action) apply('idle')
    }, dur)
  }

  /** 重置双方动作状态与特效（开局 / 换波 / 中断恢复） */
  function resetActorActions(): void {
    clearTimeout(actionTimers.hero)
    clearTimeout(actionTimers.enemy)
    battle.heroAction = 'idle'
    battle.enemyAction = 'idle'
    hitFxs.value = []
  }

  /**
   * 生成一次命中特效（side = 出手方，特效落在其对面角色身上）。
   * @param variant 具体招式动画（见 src/config/fxVariants.ts）；缺省时渲染层按 kind 兜底。
   *                驻留时长按变体查表——各招式动画长短差很多，统一时长会把长动画拦腰截断。
   */
  function spawnHitFx(
    kind: HitFxKind,
    side: 'hero' | 'enemy',
    color: string,
    variant?: FxVariant
  ): void {
    const fx: HitFx = { id: fxUid++, kind, side, color, variant }
    hitFxs.value.push(fx)
    window.setTimeout(() => {
      hitFxs.value = hitFxs.value.filter((f) => f.id !== fx.id)
    }, fxLife(variant, ANIM.hitFx))
  }

  /** 敌人主题色：优先取变体色，否则按敌人 ID 取元素近似色 */
  function enemyColor(): string {
    const e = battle.enemy
    if (!e) return '#ff5a3c'
    if (e.tint) return e.tint
    const map: Record<string, string> = {
      enemy_slime: '#4cd964',
      enemy_fire_lizard: '#ff5a3c',
      enemy_frost_ghost: '#3ca7ff',
      enemy_dragon_whelp: '#a06bff',
      enemy_ancient_dragon: '#ff5a3c'
    }
    return map[e.configId] ?? '#ff5a3c'
  }

  /** 宝石展示区：聚焦/取消聚焦某元素（高亮棋盘，辅助规划，不消耗回合） */
  function toggleGemFocus(el: ElementType): void {
    if (battle.focusElement === el) {
      battle.focusElement = null
      return
    }
    battle.focusElement = el
    audio.play('select')
    const n = countElementOnBoard(el)
    showTip(
      n > 0
        ? `已高亮棋盘上的${ELEMENT_INFO[el].name}元素宝石（${n} 颗）`
        : `棋盘上暂时没有${ELEMENT_INFO[el].name}元素宝石`
    )
  }

  /** 切换底部信息面板 Tab（宝石 / 技能） */
  function setBottomTab(tab: 'gem' | 'skill'): void {
    battle.bottomTab = tab
    audio.play('select')
  }

  // ================================================================
  // 战斗生命周期
  // ================================================================

  /**
   * 开始关卡（REQ-LEVEL-005：失败重开无惩罚；DDA-001：连败赠送技能石）
   */
  function startLevel(levelId: number): void {
    const level = getLevel(levelId)
    audio.unlock()
    preloadBoardIcons() // 预加载元素宝石与技能石标记，避免棋盘首帧闪空
    battle.level = level
    battle.waveIndex = 0
    battle.relics = []
    battle.turnCount = 0
    battle.combo = 0
    battle.maxComboInBattle = 0
    battle.totalDamage = 0
    battle.woodGemCleared = 0
    battle.playerBurn = null
    battle.playerPoison = null
    battle.playerHP = PLAYER_MAX_HP
    battle.playerShield = 0
    battle.result = null
    battle.phase = 'fighting'
    battle.paused = false
    battle.tutorialProgress = 0
    battle.guideDismissed = false
    battle.shuffling = false
    battle.gemStats = createGemStats()
    battle.focusElement = null
    battle.bottomTab = 'gem'
    resetActorActions()
    floatTexts.value = []
    clearTimeout(tipTimer)
    tip.value = null
    cutIn.value = null

    // DDA-001：同关连续失败 2 次 → 开局赠送小技能石
    const ddaSpecial = (profile.failStreak[levelId] ?? 0) >= DDA_FAIL_TIMES

    const board = new GameBoard({
      ensureFourMatch: level.ensureFourMatch,
      ensureFiveMatch: level.ensureFiveMatch,
      initialSpecial: ddaSpecial
    })
    battle.board = board // reactive 包装由赋值触发
    battle.boardSeq++

    if (level.tutorial === 'match') {
      // 教学 1-1：无敌人（REQ-TUTO-002）
      battle.enemy = null
      battle.hint = board.findValidSwap()
    } else {
      spawnWave(0)
      battle.hint = null
    }
    relicOffers.value = []
    battle.canInteract = true
    if (level.tutorial !== 'match') {
      // V3 机制公示：操作烧血与回合末随机事件是本作核心张力，开局一次性讲清
      showTip(`龙脉法则：每次操作棋盘汲取 ${SWAP_HP_COST} 点生命，回合末可能触发龙脉异象`, ANIM.tip + 1600)
    }
    screen.value = 'battle'
    saveSnapshot()
  }

  /** 生成一波敌人（V2：按章节成长放大 HP / 攻击，见 chapterHpMult / chapterAtkMult） */
  function spawnWave(index: number): void {
    const level = battle.level!
    const wave = level.waves[index]
    battle.enemy = createEnemyState(wave, {
      hpMult: chapterHpMult(level.gemPower),
      atkMult: chapterAtkMult(level.chapter)
    })
    battle.waveIndex = index
    battle.combo = 0
    // 新敌人入场：清掉上一波的受击/死亡姿态与残留特效
    resetActorActions()
  }

  /** 中断恢复（REQ-BATTLE-006 / REQ-SAVE-002） */
  function continueBattle(): void {
    const snap = profile.battleSnapshot
    if (!snap) return
    const level = getLevel(snap.levelId)
    battle.level = level
    battle.waveIndex = snap.waveIndex
    battle.turnCount = snap.turnCount
    battle.playerHP = snap.playerHP
    battle.playerShield = snap.playerShield
    // 图标与新增字段随配置表更新派生（旧存档可能残留历史值 / 缺少行动轮换字段）
    battle.enemy = snap.enemy ? normalizeEnemy(snap.enemy) : null
    battle.relics = [...snap.relics]
    battle.board = GameBoard.fromGrid(snap.grid)
    battle.boardSeq++
    battle.combo = 0
    battle.maxComboInBattle = snap.maxComboInBattle
    battle.totalDamage = snap.totalDamage
    battle.woodGemCleared = snap.woodGemCleared
    battle.playerBurn = snap.playerBurn ? { ...snap.playerBurn } : null
    battle.playerPoison = snap.playerPoison ? { ...snap.playerPoison } : null
    battle.result = null
    battle.paused = false
    battle.tutorialProgress = level.tutorial === 'match' ? snap.turnCount : 0
    battle.hint = level.tutorial === 'match' ? battle.board.findValidSwap() : null
    battle.guideDismissed = false
    battle.shuffling = false
    battle.gemStats = createGemStats()
    battle.focusElement = null
    battle.bottomTab = 'gem'
    resetActorActions()
    floatTexts.value = []
    clearTimeout(tipTimer)
    tip.value = null

    // 若中断发生在遗物三选一，恢复同样的候选并重新进入选择阶段（旧存档无 phase 字段则视为战斗阶段）
    const offers = (snap.relicOffers ?? []).filter((id) => !battle.relics.includes(id))
    if (snap.phase === 'relicSelect' && offers.length > 0) {
      relicOffers.value = offers
      battle.phase = 'relicSelect'
      battle.canInteract = false
    } else {
      relicOffers.value = []
      battle.phase = 'fighting'
      battle.canInteract = true
    }
    screen.value = 'battle'
  }

  // ================================================================
  // 伤害 / 治疗结算
  // ================================================================

  /**
   * 玩家对敌人造成伤害（含 V2 冻结增伤 / 凝甲护盾 / 阶段转换 / 狂怒）
   * @param source 'hero' = 英雄主动出手（切攻击态 + 命中特效）；'dot' = 灼烧/中毒等持续伤害
   *               （只有怪物受击反馈，英雄不做出手动作）
   * @param fxVariant 这一击该播的招式动画；缺省时按 kind 兜底（技能→英雄专属，暴击→交叉双斩，其余→普攻斩击）
   */
  async function dealDamageToEnemy(
    dmg: number,
    kind: FloatText['kind'],
    source: 'hero' | 'dot' = 'hero',
    fxVariant?: FxVariant
  ): Promise<void> {
    const enemy = battle.enemy
    if (!enemy || dmg <= 0) return
    // 寒冰之触遗物：被冻结的敌人受到伤害 +15%
    let final = dmg
    if (hasRelic('relic_ice_touch') && enemy.frozen > 0) final = Math.floor(dmg * 1.15)
    // 凝甲护盾先于血量抵扣（V2）
    let rest = final
    if (enemy.shield > 0) {
      const absorbed = Math.min(enemy.shield, rest)
      enemy.shield -= absorbed
      rest -= absorbed
      if (absorbed > 0) addFloat(`护盾抵挡 ${absorbed}`, 'info')
    }
    enemy.hp -= rest
    battle.totalDamage += rest
    if (rest > 0) addFloat(`-${rest}`, kind)
    // 战斗展示区反馈：命中特效落在挨打的一方身上（side = 出手方，组件内部会取反）
    const isSkill = source === 'hero' && kind === 'skill'
    // 招式动画：显式指定优先；暴击（含打断蓄力的反噬）走交叉双斩，其余走普攻斩击
    const variant: FxVariant = fxVariant ?? (kind === 'crit' ? 'cross_slash' : 'slash_basic')
    // 身位跟着招式走：贴身招式三段式前冲，施法/远程招式浮空释放
    if (source === 'hero') setActorAction('hero', fxPose(variant))
    setActorAction('enemy', 'hurt')
    spawnHitFx(isSkill || kind === 'crit' ? 'skill' : 'slash', 'hero', enemyColor(), variant)
    audio.play(kind === 'skill' ? 'skill' : 'combo', Math.min(battle.combo, 8))

    // 蓄力打断：蓄力期间累计承受伤害达到阈值即打断（Boss 蓄力失败并吃反噬）
    if (enemy.charging) {
      enemy.charging.taken += rest
      if (enemy.charging.taken >= enemy.charging.interrupt) {
        await interruptCharge(enemy)
      }
    }

    // Boss 阶段转换：血量耗尽且仍有下一阶段
    if (advanceEnemyPhase(enemy)) {
      addFloat(`${enemy.display} 狂怒！进入第 ${enemy.phase} 阶段`, 'info')
      doShake()
      doFlash()
      await sleep(ANIM.enemyWarn)
      // 阶段转换全屏攻击（5.2 远古巨龙：全屏攻击 15）
      if (enemy.phaseBlastDamage > 0) {
        await sleep(200)
        damagePlayer(enemy.phaseBlastDamage, 'beam_burst')
      }
    }

    // 阶段内狂怒（V2）：半数血后攻击力一次性提升
    if (tryEnrage(enemy)) {
      addFloat(`${enemy.display} 狂怒了！攻击提升`, 'info')
      doShake()
    }

    // 彻底死亡：立绘切到倒地消散姿态（阶段转换后才会走到这里）
    if (enemyDead(enemy)) setActorAction('enemy', 'dead')
  }

  /**
   * 打断蓄力（Boss 战核心正反馈）：清空蓄力、播放打击反馈并结算反噬伤害。
   * 先置空 charging 再结算反噬，避免反噬伤害递归触发打断判定。
   */
  async function interruptCharge(enemy: EnemyState): Promise<void> {
    const charge = enemy.charging
    if (!charge) return
    enemy.charging = null
    addFloat(`打断「${charge.release}」！`, 'info')
    doShake()
    doFlash()
    audio.play('skill')
    await sleep(ANIM.enemyWarn)
    if (charge.recoil > 0) {
      addFloat(`${enemy.display} 反噬 -${charge.recoil}`, 'crit')
      await dealDamageToEnemy(charge.recoil, 'crit')
    }
  }

  /** 敌人回复生命（汲取类行动），不超过当前阶段上限 */
  function healEnemy(amount: number): void {
    const enemy = battle.enemy
    if (!enemy || amount <= 0 || enemy.hp <= 0) return
    const healed = Math.min(enemy.phaseMaxHp - enemy.hp, amount)
    if (healed <= 0) return
    enemy.hp += healed
    addFloat(`${enemy.display} 回复 ${healed}`, 'heal', 'enemy')
  }

  /** 给玩家施加灼烧/中毒（可叠加层数，持续时间取较长者，REQ-HERO-101 同规则） */
  function applyPlayerDot(kind: 'burn' | 'poison', effect: DotEffect): void {
    const cur = kind === 'burn' ? battle.playerBurn : battle.playerPoison
    const merged: DotEffect = {
      damage: (cur?.damage ?? 0) + effect.damage,
      turns: Math.max(cur?.turns ?? 0, effect.turns)
    }
    if (kind === 'burn') battle.playerBurn = merged
    else battle.playerPoison = merged
    addFloat(kind === 'burn' ? '你被灼烧！' : '你中毒了！', 'info')
  }

  /**
   * 回合结束结算玩家身上的灼烧/中毒（无视护盾，直接扣血）。
   * @returns 玩家是否因此死亡
   */
  function tickPlayerStatus(): boolean {
    let died = false
    const kinds: ('burn' | 'poison')[] = ['burn', 'poison']
    for (const kind of kinds) {
      const st = kind === 'burn' ? battle.playerBurn : battle.playerPoison
      if (!st) continue
      battle.playerHP = Math.max(0, battle.playerHP - st.damage)
      addFloat(`-${st.damage} (${kind === 'burn' ? '灼烧' : '中毒'})`, 'damage', 'hero')
      st.turns--
      if (st.turns <= 0) {
        if (kind === 'burn') battle.playerBurn = null
        else battle.playerPoison = null
      }
      if (battle.playerHP <= 0) died = true
    }
    return died
  }

  /**
   * 敌人对玩家造成伤害（护盾优先抵扣，REQ-HERO-103）
   * @param variant 这一招的动画（调用方从 ENEMY_ACTION_FX 取）；缺省走重击冲击波
   */
  function damagePlayer(dmg: number, variant?: FxVariant): void {
    let rest = dmg
    if (battle.playerShield > 0) {
      const absorbed = Math.min(battle.playerShield, rest)
      battle.playerShield -= absorbed
      rest -= absorbed
      if (absorbed > 0) addFloat(`护盾抵挡 ${absorbed}`, 'info')
    }
    if (rest > 0) {
      battle.playerHP = Math.max(0, battle.playerHP - rest)
      addFloat(`-${rest}`, 'damage', 'hero')
      doShake()
      audio.play('hit')
      // 战斗展示区反馈：怪物出手，英雄受击
      const move = variant ?? 'heavy_impact'
      setActorAction('enemy', fxPose(move))
      setActorAction('hero', 'hurt')
      spawnHitFx('impact', 'enemy', enemyColor(), move)
    }
  }

  /**
   * 玩家治疗。铁壁遗物：过量治疗转化为护盾（累计上限 20，V2）
   */
  function healPlayer(amount: number, reason?: string): void {
    if (battle.playerHP <= 0) return
    const healed = Math.min(PLAYER_MAX_HP - battle.playerHP, amount)
    battle.playerHP += healed
    if (healed > 0) {
      addFloat(`+${healed}${reason ? ` (${reason})` : ''}`, 'heal')
      audio.play('heal')
      spawnHitFx('heal', 'hero', '#7dedb2', 'heal_bloom')
    }
    const overheal = amount - healed
    if (overheal > 0 && hasRelic('relic_iron_wall')) {
      gainShield(overheal, RELIC_SHIELD_CAP, '铁壁')
    }
  }

  /**
   * 获得护盾（上限 cap 仅约束遗物来源的累计护盾，技能护盾不受限）
   */
  function gainShield(amount: number, cap = Infinity, reason?: string): void {
    const room = cap === Infinity ? amount : Math.max(0, cap - battle.playerShield)
    const gain = Math.min(room, amount)
    if (gain <= 0) return
    battle.playerShield += gain
    addFloat(`护盾 +${gain}${reason ? ` (${reason})` : ''}`, 'info')
    spawnHitFx('heal', 'hero', '#68d8ff', 'heal_bloom')
  }

  /** 释放主战英雄技能（技能石触发，REQ-HERO-002；V2：元素克制/护甲/章节缩放/奥术回响） */
  async function castHeroSkill(which: 'small' | 'ultimate'): Promise<void> {
    const hero = leader.value
    const skill: SkillEffect = which === 'small' ? hero.skill4 : hero.skill5
    // 技能特写 0.5 秒，不阻塞操作（REQ-FEEL-002）
    showCutIn(
      hero.iconId,
      which === 'small' ? hero.skill4IconId : hero.skill5IconId,
      hero.name,
      skill.name,
      hero.color
    )
    audio.play('skill')
    /** 这一档技能的专属招式动画（见 src/config/fxVariants.ts 的注册表） */
    const moveFx = heroSkillFx(hero.id, hero.element, which)
    // 纯辅助技能（只回血/加盾）不经过 dealDamageToEnemy，这里统一给出身位
    setActorAction('hero', fxPose(moveFx))
    // 施法前摇：脚下符文魔法阵 + 冲天光柱，让"技能释放"有明确的起手
    spawnHitFx('cast', 'hero', hero.color, 'arcane_cast')
    await sleep(150) // 让特写先入场

    const firePassive = supports.value.some((h) => h.passiveId === 'fireSkillUp')
    const heartOfFlame = hasRelic('relic_heart_of_flame')
    const desperate = hasRelic('relic_desperate_counter') && battle.playerHP < PLAYER_MAX_HP * 0.3
    const arcaneEcho = hasRelic('relic_arcane_echo')
    const dmg = calcSkillDamage(skill.damage, hero.element, {
      firePassive,
      heartOfFlame,
      desperate,
      counter: enemyCounter.value,
      armor: enemyArmor(),
      arcaneEcho,
      chapterScale: skillChapterScale(battle.level!.gemPower)
    })
    // 遗物/被动协同生效时飘字说明加成来源（REQ-FEEL-004）
    if (hero.element === 'fire' && heartOfFlame) {
      addFloat('火焰之心：火元素伤害 +25%', 'info')
    }
    if (hero.element === 'fire' && firePassive) {
      addFloat('炎龙骑士支援：火元素伤害 +10%', 'info')
    }
    if (arcaneEcho) {
      addFloat('奥术回响：技能伤害 +40%', 'info')
    }
    if (desperate) {
      addFloat('绝境反击：全部伤害 +50%', 'info')
    }
    if (dmg > 0) await dealDamageToEnemy(dmg, 'skill', 'hero', moveFx)
    else if (skill.heal || skill.shield || skill.clearDebuff) {
      // 纯辅助技能没有命中特效这条路径，专属动画要在这里自己放（落在英雄自己身上）
      spawnHitFx('heal', 'hero', hero.color, moveFx)
    }
    if (skill.heal) healPlayer(skill.heal)
    if (skill.shield) gainShield(skill.shield)
    if (skill.clearDebuff && (battle.playerBurn || battle.playerPoison)) {
      battle.playerBurn = null
      battle.playerPoison = null
      addFloat('负面状态已清除', 'info')
    }
    if (skill.burn) {
      // 燃烧可叠加（REQ-HERO-101）
      const cur = battle.enemy?.burn
      if (battle.enemy) {
        battle.enemy.burn = {
          damage: (cur?.damage ?? 0) + skill.burn.damage,
          turns: Math.max(cur?.turns ?? 0, skill.burn.turns)
        }
      }
    }
    if (skill.freeze && battle.enemy) {
      // 冻结延长：寒冰之触遗物 +1 回合；冰霜女巫支援被动（freezeUp）+1 回合
      const relicBonus = hasRelic('relic_ice_touch') ? 1 : 0
      const passiveBonus = supports.value.some((h) => h.passiveId === 'freezeUp') ? 1 : 0
      const total = skill.freeze + relicBonus + passiveBonus
      battle.enemy.frozen += total
      addFloat(`敌人被冻结 ${total} 回合！`, 'info')
    }
  }

  // ================================================================
  // 回合编排（REQ-BATTLE-001：交换→消除→掉落→连锁→伤害→敌人倒计时）
  // ================================================================

  /**
   * 玩家交换入口（REQ-BATTLE-002：无效交换回弹不消耗回合）
   */
  async function doSwap(a: Pos, b: Pos): Promise<void> {
    const board = battle.board
    if (!board || !battle.canInteract || battle.paused || battle.phase !== 'fighting') return

    const ca = board.cellAt(a)
    const cb = board.cellAt(b)
    if (!ca || !cb) return
    // 技能石不可交换（REQ-BOARD-006）
    if (ca.special || cb.special) {
      addFloat('技能石不可交换，点击它可直接释放', 'info')
      audio.play('invalid')
      return
    }
    if (ca.frozen > 0 || cb.frozen > 0) {
      addFloat('冰冻的宝石无法移动', 'info')
      audio.play('invalid')
      return
    }
    if (!board.isAdjacent(a, b)) return

    battle.canInteract = false
    battle.hint = null
    board.swap(a, b)
    await sleep(ANIM.swap)

    const matched = board.findMatches().length > 0
    if (!matched) {
      board.swap(a, b) // 回弹
      audio.play('invalid')
      await sleep(ANIM.swap)
      // 教学关 1-1：无效交换后恢复高亮提示（REQ-TUTO-002）
      if (battle.level?.tutorial === 'match') {
        battle.hint = board.findValidSwap()
      }
      battle.canInteract = true
      return
    }
    await resolveTurn()
  }

  /**
   * 主动点击技能石触发（REQ-BOARD-004：消耗 1 回合，走完整回合结算）
   */
  async function tapSpecial(pos: Pos): Promise<void> {
    const board = battle.board
    if (!board || !battle.canInteract || battle.paused || battle.phase !== 'fighting') return
    const cell = board.cellAt(pos)
    if (!cell || !cell.special) return
    if (cell.frozen > 0) {
      addFloat('冰冻的技能石无法释放', 'info')
      return
    }
    battle.canInteract = false
    battle.hint = null
    // 以该格为种子展开（炸弹自动 3×3 连锁引爆，REQ-BOARD-005）
    await resolveTurn({ seeds: [pos] })
  }

  /**
   * 完整回合结算：消除连锁 → 掉落填充 → 回合结束 → 敌人阶段
   * @param initial 主动触发技能石时的初始消除种子；自然消除不传
   */
  async function resolveTurn(initial?: { seeds: Pos[] }): Promise<void> {
    const board = battle.board!
    // 龙脉代价（V3）：每次有效棋盘操作汲取生命（无视护盾；教学关免收）。
    // 无效交换在 doSwap 里已回弹返回，不会走到这里——扣血惩罚的是回合消耗而非误触。
    if (battle.level?.tutorial !== 'match') {
      battle.playerHP = Math.max(0, battle.playerHP - SWAP_HP_COST)
      addFloat(`-${SWAP_HP_COST} (龙脉汲取)`, 'damage', 'hero')
    }
    battle.combo = 0
    // 炸弹狂潮遗物：炸弹展开半径 3×3 → 5×5（V2）
    const bombRadius = hasRelic('relic_bomb_frenzy') ? 2 : 1

    // ---- 消除连锁循环 ----
    let pendingSeeds: Pos[] | null = initial?.seeds ?? null
    for (;;) {
      let groups: MatchGroup[] = []
      let seeds: Pos[]
      if (pendingSeeds) {
        seeds = pendingSeeds
        pendingSeeds = null
      } else {
        groups = board.findMatches()
        if (groups.length === 0) break
        seeds = groups.flatMap((g) => g.cells)
      }

      battle.combo++
      battle.maxComboInBattle = Math.max(battle.maxComboInBattle, battle.combo)

      // 消除动画：先标记 popping 播放收缩动画，再真正清除
      const preview = GameBoard.expandBombTargets(board.grid, seeds, bombRadius)
      for (const p of preview.clear) {
        const cell = board.grid[p.row][p.col]
        if (cell) cell.popping = true
      }
      await sleep(ANIM.pop)

      const { cleared, specialsTriggered } = board.commitClear(seeds, groups, { bombRadius })

      // 宝石伤害：仅普通宝石计数（技能石走技能结算）
      const gems = cleared.filter((c) => !c.special)
      if (gems.length > 0) {
        // 宝石展示区：累计本局各元素消除量（熟练度等级的数据源）
        for (const g of gems) battle.gemStats[g.element]++
        let dmg = calcWaveDamage(
          gems,
          battle.combo,
          {
            gemPower: battle.level!.gemPower,
            leaderElement: leader.value.element,
            sameBonusElement: sameBonusElement.value,
            counter: enemyCounter.value,
            armor: enemyArmor(),
            fireBonus: fireBonus.value,
            arcanePenalty: hasRelic('relic_arcane_echo'),
            // 宝石精通：4 连及以上的消除波 +40%（按波判定）
            bigMatchBonus: hasRelic('relic_gem_mastery') && groups.some((g) => g.length >= 4),
            // 炸弹狂潮：炸弹波伤害 +20%
            bombBonus: hasRelic('relic_bomb_frenzy') && specialsTriggered.some((s) => s.special === 'bomb'),
            desperate: hasRelic('relic_desperate_counter') && battle.playerHP < PLAYER_MAX_HP * 0.3
          },
          hasRelic('relic_chain_reaction')
        )
        // 龙纹暴击（V3）：每波消除 12% 概率伤害 ×1.5——随机爽感来源，技能石不暴击
        let critted = false
        if (dmg > 0 && battle.enemy && !enemyDead(battle.enemy) && Math.random() < GEM_CRIT_CHANCE) {
          dmg = Math.round(dmg * GEM_CRIT_MULT)
          addFloat('龙纹暴击！', 'crit')
          critted = true
        }
        // 暴击要把 kind 提上来：伤害数字走暴击样式、命中特效走交叉双斩，爽感才完整
        if (dmg > 0) await dealDamageToEnemy(dmg, battle.combo >= 3 || critted ? 'crit' : 'damage')
      }

      // 被清除的特殊石触发英雄技能
      for (const s of specialsTriggered) {
        if (s.special === 'small' || s.special === 'ultimate') {
          await castHeroSkill(s.special)
        }
      }

      // 元素共鸣遗物：四消产物 30% 概率额外生成 1 个小技能石
      if (hasRelic('relic_element_resonance') && groups.some((g) => g.special === 'small')) {
        if (Math.random() < 0.3) {
          const spot = board.pickRandomNormalCell(cleared.map((c) => c.pos))
          if (spot) board.placeSpecial(spot, 'small')
          addFloat('元素共鸣：额外技能石！', 'info')
        }
      }

      // 自然共鸣遗物：每消除 5 个木宝石获得 3 点护盾（V2 由回血改为护盾，累计上限 20）
      const woodCount = gems.filter((g) => g.element === 'wood').length
      battle.woodGemCleared += woodCount
      while (battle.woodGemCleared >= 5 && hasRelic('relic_nature_resonance')) {
        battle.woodGemCleared -= 5
        gainShield(3, RELIC_SHIELD_CAP, '自然共鸣')
      }

      // 表现：连击震动 + 音阶升高（REQ-FEEL-001）
      if (battle.combo >= 2) doShake()

      // 掉落 + 顶部填充（REQ-BATTLE-003）
      board.applyGravity()
      await sleep(ANIM.drop)

      // 敌人死亡则提前结束连锁
      if (battle.enemy && enemyDead(battle.enemy)) break
    }

    await endOfTurn()
  }

  /**
   * 回合结束：被动回血 → 玩家持续伤害 → 幸运骰子 → 敌人阶段 → 冻结递减 → 死局洗牌 → 存档
   */
  async function endOfTurn(): Promise<void> {
    battle.turnCount++

    // 森林德鲁伊支援被动：每回合结束回复生命（V2.2：3 → 2，见 PASSIVE_HEAL_PER_TURN）
    if (supports.value.some((h) => h.passiveId === 'healPerTurn')) {
      healPlayer(PASSIVE_HEAL_PER_TURN)
    }

    // 玩家身上的灼烧/中毒结算（Boss 施加，REQ-ENEMY-002）
    if (tickPlayerStatus()) {
      finishBattle('defeat')
      return
    }

    // 幸运骰子遗物：20% 概率不消耗回合（REQ-RELIC 清单）
    const luckySkip = hasRelic('relic_lucky_dice') && Math.random() < 0.2

    if (battle.enemy) {
      if (enemyDead(battle.enemy)) {
        // 本波敌人已被击杀，跳过敌人阶段
      } else if (!luckySkip) {
        await enemyPhase()
      } else {
        addFloat('幸运骰子：回合未消耗！', 'info')
      }
    }

    // 冻结宝石倒计时递减（REQ-ENEMY-101：2 回合自动解冻）
    battle.board?.tickFrozen()

    // 连击清零（REQ-DAMAGE-004）
    battle.combo = 0

    // 教学关 1-1：3 次消除过关（REQ-TUTO-002）
    if (battle.level?.tutorial === 'match') {
      battle.tutorialProgress++
      if (battle.tutorialProgress >= TUTORIAL_MATCH_TARGET) {
        finishBattle('victory')
        return
      }
      battle.hint = battle.board?.findValidSwap() ?? null
    }

    // 胜负判定（REQ-BATTLE-004：双方 HP 归零时玩家优先，因玩家伤害先结算）
    if (battle.enemy && enemyDead(battle.enemy)) {
      await waveCleared()
      return
    }
    if (battle.playerHP <= 0) {
      finishBattle('defeat')
      return
    }

    // 龙脉异象（V3）：回合末随机事件，打破背板节奏（教学关不触发；反噬可能致死）
    if (
      battle.level?.tutorial !== 'match' &&
      battle.enemy &&
      !enemyDead(battle.enemy) &&
      Math.random() < DRAGON_EVENT_CHANCE
    ) {
      applyDragonEvent()
      if (battle.playerHP <= 0) {
        finishBattle('defeat')
        return
      }
    }

    // 死局检测与自动洗牌（REQ-BATTLE-005：不消耗回合）
    if (battle.board && !battle.board.hasAnyValidSwap()) {
      battle.shuffling = true
      audio.play('shuffle')
      addFloat('棋盘无可用消除，自动洗牌', 'info')
      await sleep(ANIM.shuffle)
      battle.board.shuffle()
      await sleep(ANIM.shuffle)
      battle.shuffling = false
    }

    battle.canInteract = true
    saveSnapshot()
  }

  /**
   * 敌人阶段：DOT 结算 → 倒计时推进 → 行动（REQ-HERO-101/102、REQ-ENEMY-001/002）
   */
  async function enemyPhase(): Promise<void> {
    const enemy = battle.enemy!
    // DOT：燃烧/中毒在敌人行动阶段结算（REQ-HERO-101）
    if (enemy.burn) {
      await dealDamageToEnemy(enemy.burn.damage, 'damage', 'dot')
      enemy.burn.turns--
      if (enemy.burn.turns <= 0) enemy.burn = null
    }
    if (enemy.poison) {
      await dealDamageToEnemy(enemy.poison.damage, 'damage', 'dot')
      enemy.poison.turns--
      if (enemy.poison.turns <= 0) enemy.poison = null
    }
    if (enemyDead(enemy) || battle.playerHP <= 0) return

    // 冻结/眩晕：倒计时暂停（REQ-HERO-102）
    if (enemy.frozen > 0) {
      enemy.frozen--
      addFloat('敌人冻结中，倒计时暂停', 'info')
      return
    }
    if (enemy.stunned > 0) {
      enemy.stunned--
      addFloat('敌人眩晕，跳过行动', 'info')
      return
    }

    enemy.countdown--
    if (enemy.countdown <= 0) {
      // 蓄力招式可指定独立窗口（window），避免二阶段加速后打断窗口过短而不公平
      const window = await enemyAct()
      if (battle.playerHP > 0) enemy.countdown = window ?? enemy.baseCountdown
    }
  }

  /** 冻结棋盘随机 size×size 区域（REQ-ENEMY-101），返回被冻结宝石数 */
  function applyFreezeBoard(size: number, turns: number): number {
    const r = Math.floor(Math.random() * (8 - size + 1))
    const c = Math.floor(Math.random() * (8 - size + 1))
    let count = 0
    for (let dr = 0; dr < size; dr++) {
      for (let dc = 0; dc < size; dc++) {
        const cell = battle.board?.grid[r + dr]?.[c + dc]
        if (cell) {
          cell.frozen = turns
          count++
        }
      }
    }
    return count
  }

  /**
   * 污染（V2）：把 count 颗随机宝石转为指定元素（跳过冻结宝石与技能石），
   * 返回实际转换数量。与敌人抗性叠加，构成"看起来很诱人、其实很亏"的陷阱。
   */
  function corruptBoardGems(count: number, element: ElementType): number {
    const board = battle.board
    if (!board) return 0
    let done = 0
    let guard = 0
    while (done < count && guard++ < count * 30) {
      const r = Math.floor(Math.random() * BOARD_SIZE)
      const c = Math.floor(Math.random() * BOARD_SIZE)
      const cell = board.grid[r]?.[c]
      if (!cell || cell.frozen > 0 || cell.special || cell.element === element) continue
      cell.element = element
      done++
    }
    return done
  }

  /**
   * 龙脉异象（V3）：回合末随机事件。吉事件给补给/爆发（回响回血/护体加盾/
   * 赐福与龙晶产出技能石/元素风暴聚色），凶事件制造小危机（反噬扣血/紊乱洗色）。
   * 改盘效果统一由 core/events 落实（含现成匹配修复），这里只负责数值结算与反馈。
   */
  function applyDragonEvent(): void {
    const ev = rollDragonEvent()
    switch (ev.kind) {
      case 'dragon_echo':
        healPlayer(ev.hp!, '龙脉回响')
        break
      case 'scale_guard':
        gainShield(ev.shield!, Infinity, '龙鳞护体')
        break
      case 'crystal_blessing':
        if (battle.board && applyDragonEventToBoard(battle.board, ev) > 0) {
          showTip('龙脉异象·龙晶赐福：一枚小技能石降临棋盘')
          audio.play('select')
        }
        break
      case 'bomb_drop':
        if (battle.board && applyDragonEventToBoard(battle.board, ev) > 0) {
          showTip('龙脉异象·天降龙晶：一颗炸弹石降临棋盘')
          audio.play('select')
        }
        break
      case 'element_storm': {
        const n = battle.board ? applyDragonEventToBoard(battle.board, ev) : 0
        if (n > 0) {
          showTip(`龙脉异象·元素风暴：${n} 颗宝石化为${ELEMENT_INFO[ev.convertElement!].name}元素`)
        }
        break
      }
      case 'element_chaos': {
        const n = battle.board ? applyDragonEventToBoard(battle.board, ev) : 0
        if (n > 0) showTip(`龙脉异象·元素紊乱：${n} 颗宝石的元素被重置`)
        break
      }
      case 'dragon_backlash':
        // 反噬与龙脉代价同规则：无视护盾直接扣血
        battle.playerHP = Math.max(0, battle.playerHP - ev.hp!)
        addFloat(`-${ev.hp} (龙脉反噬)`, 'damage', 'hero')
        doShake()
        audio.play('hit')
        break
    }
  }

  /**
   * 敌人招式的展示层反馈：切身位 + 放对应的 SVG 动画。
   * 不打伤害的招式（冻结棋盘 / 凝甲 / 蓄力起手）也必须走这里，
   * 否则玩家只看得到飘字，读不出"敌人这回合到底做了什么"。
   * @param self true = 特效落在怪物自己身上（增益 / 蓄力）；false = 朝英雄打出去
   */
  function playEnemyMove(variant: FxVariant, self = false): void {
    setActorAction('enemy', fxPose(variant))
    spawnHitFx(self ? 'cast' : 'skill', 'enemy', enemyColor(), variant)
  }

  /**
   * 敌人行动（REQ-ENEMY-002 / 5.4 Boss 战机制；前摇 0.5 秒预警）
   * 优先级：蓄力释放 > 行动轮换 > 旧版单技能（未配置轮换的小怪）
   * @returns 本次行动后要使用的倒计时（null = 用 baseCountdown）；蓄力时返回 window
   */
  async function enemyAct(): Promise<number | null> {
    const enemy = battle.enemy!
    // 预警动画（REQ-FEEL-005：行动前 0.5 秒预警）
    enemyWarn.value++
    await sleep(ANIM.enemyWarn)
    if (battle.playerHP <= 0) return null

    // ① 蓄力完成：释放大招（蓄力期间未被玩家打断）
    if (enemy.charging) {
      const charge = enemy.charging
      enemy.charging = null
      addFloat(`${enemy.display} 释放「${charge.release}」！`, 'info')
      doFlash()
      doShake()
      // 大招释放：怪物脚下符文阵起手，紧接一道贯穿光束砸在英雄身上
      spawnHitFx('cast', 'enemy', enemyColor(), 'arcane_cast')
      damagePlayer(charge.damage, 'beam_burst')
      await sleep(200)
      return null
    }

    // ② 行动轮换（Boss / 精英）
    if (enemy.pattern.length > 0) {
      const action = enemy.pattern[enemy.patternIndex % enemy.pattern.length]
      enemy.patternIndex = (enemy.patternIndex + 1) % enemy.pattern.length
      addFloat(`${enemy.display}「${action.name}」`, 'info')
      /** 这一招对应的 SVG 动画：从注册表按行动类型取，招式与画面永远对得上 */
      const moveFx = ENEMY_ACTION_FX[action.kind]
      let chargeWindow: number | null = null
      switch (action.kind) {
        case 'attack':
          damagePlayer(enemy.attack, moveFx)
          break
        case 'freezeBoard': {
          const count = applyFreezeBoard(action.size, action.turns)
          addFloat(`冻结了 ${count} 颗宝石！`, 'info')
          if (action.damage) damagePlayer(action.damage, moveFx)
          else playEnemyMove(moveFx)
          break
        }
        case 'poison':
          damagePlayer(action.damage, moveFx)
          if (battle.playerHP > 0) applyPlayerDot('poison', action.poison)
          break
        case 'burn':
          damagePlayer(action.damage, moveFx)
          if (battle.playerHP > 0) applyPlayerDot('burn', action.burn)
          break
        case 'drain':
          damagePlayer(action.damage, moveFx)
          healEnemy(action.heal)
          break
        case 'corrupt': {
          // 污染（V2）：造成伤害并把随机宝石转为敌人元素；伤害缺省取当前攻击力
          // （随变体/章节成长，避免固定值与敌人强度脱节）
          damagePlayer(action.damage ?? enemy.attack, moveFx)
          const cfg = getEnemy(enemy.configId)
          const n = corruptBoardGems(action.count, cfg.element)
          addFloat(`${action.name}：${n} 颗宝石变为${ELEMENT_INFO[cfg.element].name}元素`, 'info')
          break
        }
        case 'shield': {
          // 凝甲（V2）：附加可吸收伤害的护盾，惩罚慢节奏、奖励爆发
          enemy.shield += action.amount
          addFloat(`${enemy.display} 凝甲 +${action.amount}`, 'info')
          playEnemyMove(moveFx, true)
          break
        }
        case 'charge':
          enemy.charging = {
            name: action.name,
            release: action.release,
            damage: action.releaseDamage,
            interrupt: action.interrupt,
            recoil: action.recoil ?? 0,
            taken: 0
          }
          chargeWindow = action.window ?? null
          addFloat(`蓄力中！累计造成 ${action.interrupt} 点伤害可打断`, 'info')
          // 蓄力起手：脚下升起符文阵，与状态栏的蓄力条一起构成"必须打断"的压迫感
          playEnemyMove(moveFx, true)
          doShake()
          break
      }
      await sleep(200)
      return chargeWindow
    }

    // ③ 旧版单技能（未配置 patterns 的普通小怪）
    switch (enemy.skill.type) {
      case 'freezeBoard': {
        // 冰霜幽灵：冻结随机 2×2 区域（REQ-ENEMY-101）
        const count = applyFreezeBoard(enemy.skill.size, GEM_FROZEN_TURNS)
        addFloat(`${enemy.display} 冻结了 ${count} 颗宝石！`, 'info')
        playEnemyMove(ENEMY_ACTION_FX.freezeBoard)
        break
      }
      case 'poisonAttack': {
        damagePlayer(enemy.attack, ENEMY_ACTION_FX.poison)
        if (battle.playerHP > 0) {
          applyPlayerDot('poison', { damage: enemy.skill.damage, turns: enemy.skill.turns })
        }
        break
      }
      default:
        damagePlayer(enemy.attack, ENEMY_ACTION_FX.attack)
    }
    await sleep(200)
    return null
  }

  // ================================================================
  // 波次与遗物（REQ-RELIC-002/004）
  // ================================================================

  /**
   * 遗物三选一候选（V2）：候选保证跨流派（至少来自 2 个 type），
   * 避免"三个都是同类"的无效选择；已持有遗物不进池（REQ-RELIC-004）。
   */
  function rollRelicOffers(): string[] {
    const pool = RELICS.filter((r) => !battle.relics.includes(r.id))
    const picks = sampleN(pool, RELIC_CHOICES).map((r) => r.id)
    const types = new Set(picks.map((id) => getRelic(id).type))
    if (types.size >= 2) return picks
    // 全是同类：把最后一个名额换成其他流派的随机遗物
    const others = pool.filter((r) => !picks.includes(r.id) && !types.has(r.type))
    if (others.length === 0) return picks
    const swap = others[Math.floor(Math.random() * others.length)]
    return [...picks.slice(0, picks.length - 1), swap.id]
  }

  /** 本波敌人清空：进入下一波（遗物三选一）或通关 */
  async function waveCleared(): Promise<void> {
    const level = battle.level!
    const nextIndex = battle.waveIndex + 1
    if (nextIndex >= level.waves.length) {
      finishBattle('victory')
      return
    }
    // 波间遗物三选一（上限 3 个，REQ-RELIC-003）
    if (battle.relics.length < MAX_RELICS) {
      relicOffers.value = rollRelicOffers()
      battle.phase = 'relicSelect'
      battle.canInteract = false
      saveSnapshot()
    } else {
      spawnWave(nextIndex)
      battle.canInteract = true
      saveSnapshot()
    }
  }

  /** 选择遗物，进入下一波（REQ-RELIC-002） */
  function chooseRelic(relicId: string): void {
    if (battle.phase !== 'relicSelect') return
    battle.relics.push(relicId)
    relicOffers.value = []
    battle.phase = 'fighting'
    spawnWave(battle.waveIndex + 1)
    battle.canInteract = true
    saveSnapshot()
  }

  // ================================================================
  // 结算（REQ-LEVEL-005：失败可立即重开；REQ-SAVE-001 进度保存）
  // ================================================================
  function finishBattle(result: 'victory' | 'defeat'): void {
    battle.result = result
    battle.phase = 'result'
    battle.canInteract = false
    profile.maxCombo = Math.max(profile.maxCombo, battle.maxComboInBattle)
    if (result === 'victory') {
      const level = battle.level!
      profile.unlockedLevel = Math.max(profile.unlockedLevel, Math.min(level.id + 1, 15))
      profile.failStreak[level.id] = 0
      audio.play('victory')
    } else {
      profile.failStreak[battle.level!.id] = (profile.failStreak[battle.level!.id] ?? 0) + 1
      audio.play('defeat')
    }
    // 战斗已结束：必须清掉响应式 profile 上的快照，否则主界面会残留"继续战斗"入口，
    // 点击后恢复到一场已经打完的战斗（快照在 persist 之前清除）
    profile.battleSnapshot = null
    persist()
  }

  /** 重开当前关（REQ-LEVEL-005：无惩罚） */
  function retryLevel(): void {
    if (battle.level) startLevel(battle.level.id)
  }

  /** 前往下一关 */
  function nextLevel(): void {
    if (battle.level) startLevel(Math.min(battle.level.id + 1, 15))
  }

  // ================================================================
  // 编队与设置（REQ-HERO-001）
  // ================================================================
  /** 设置主战英雄：其余英雄自动成为支援（MVP 共 3 名英雄） */
  function setLeader(heroId: string): void {
    const allIds = HEROES.map((h) => h.id)
    profile.team.leader = heroId
    profile.team.supports = allIds.filter((id) => id !== heroId)
    audio.play('select')
    persist()
  }

  function toggleSound(): void {
    profile.settings.sound = !profile.settings.sound
    audio.setEnabled(profile.settings.sound)
    persist()
  }

  function setScreen(s: Screen): void {
    screen.value = s
    // 离开战斗时若有进行中的战斗则保留快照（已实时保存）
  }

  function getRelicInfo(id: string) {
    return getRelic(id)
  }

  return {
    // 状态
    screen,
    profile,
    battle,
    floatTexts,
    hitFxs,
    cutIn,
    shakeScreen,
    flashWhite,
    enemyWarn,
    relicOffers,
    tip,
    // 派生
    leader,
    supports,
    sameBonusElement,
    hasBattleSnapshot,
    guideText,
    activeTip,
    hasHiddenGuide,
    gemEntries,
    skillContext,
    enemyAttributes,
    // 动作
    setScreen,
    startLevel,
    continueBattle,
    doSwap,
    tapSpecial,
    chooseRelic,
    retryLevel,
    nextLevel,
    setLeader,
    toggleSound,
    getRelicInfo,
    dismissTip,
    reopenTip,
    showTip,
    toggleGemFocus,
    setBottomTab,
    saveSnapshot
  }
})
