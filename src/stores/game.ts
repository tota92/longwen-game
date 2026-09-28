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
  enemyDead,
  resolvePattern
} from '@/core/battle'
import {
  ANIM,
  DDA_FAIL_TIMES,
  GEM_FROZEN_TURNS,
  MAX_RELICS,
  PLAYER_MAX_HP,
  RELIC_CHOICES,
  TUTORIAL_MATCH_TARGET
} from '@/config/constants'
import { getLevel } from '@/config/levels'
import { getEnemy } from '@/config/enemies'
import { getRelic, RELICS } from '@/config/relics'
import { getHero, HEROES } from '@/config/heroes'
import type {
  CutIn,
  DotEffect,
  ElementType,
  EnemyState,
  FloatText,
  Grid,
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
  /** 洗牌动画标记 */
  shuffling: boolean
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
    shuffling: false
  })

  // UI 瞬态
  const floatTexts = ref<FloatText[]>([])
  const cutIn = ref<CutIn | null>(null)
  const shakeScreen = ref(0)
  const flashWhite = ref(0)
  /** 敌人行动预警计数（REQ-FEEL-005：行动前 0.5 秒预警动画） */
  const enemyWarn = ref(0)
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
    if (lv.tutorial === 'intro4') return '提示：4 个相同宝石连成一线会生成技能石，点击它可直接释放！'
    if (lv.tutorial === 'intro5') {
      return '提示：Boss 蓄力时会出现进度条，抢输出把进度打满即可打断它的大招！'
    }
    return null
  })

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
      tint: raw.tint ?? null,
      phaseAttack,
      phaseCountdown,
      attack: raw.attack ?? phaseAttack[raw.phase - 1] ?? cfg.attack,
      baseCountdown: raw.baseCountdown ?? phaseCountdown[raw.phase - 1] ?? cfg.countdown,
      pattern: raw.pattern ?? resolvePattern(cfg, raw.phase),
      patternIndex: raw.patternIndex ?? 0,
      charging: raw.charging ?? null
    }
  }

  // ================================================================
  // UI 瞬态工具
  // ================================================================
  function addFloat(text: string, kind: FloatText['kind']): void {
    // x 轴轻微抖动：避免同回合多条飘字完全重叠（连击/技能/状态同时出现时）
    const ft: FloatText = {
      id: uid++,
      x: 50 + Math.round((Math.random() - 0.5) * 26),
      y: kind === 'heal' ? 78 : 22,
      text,
      kind
    }
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
    battle.shuffling = false
    floatTexts.value = []
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
    screen.value = 'battle'
    saveSnapshot()
  }

  /** 生成一波敌人（冰霜女巫支援被动：初始倒计时 +1） */
  function spawnWave(index: number): void {
    const level = battle.level!
    const wave = level.waves[index]
    const enemyCdUp = supports.value.some((h) => h.passiveId === 'enemyCdUp')
    battle.enemy = createEnemyState(wave, { enemyCdUp })
    battle.waveIndex = index
    battle.combo = 0
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
    battle.shuffling = false
    floatTexts.value = []

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

  /** 玩家对敌人造成伤害（含 Boss 阶段转换，REQ-ENEMY-003；蓄力打断见 5.4） */
  async function dealDamageToEnemy(dmg: number, kind: FloatText['kind']): Promise<void> {
    const enemy = battle.enemy
    if (!enemy || dmg <= 0) return
    enemy.hp -= dmg
    battle.totalDamage += dmg
    addFloat(`-${dmg}`, kind)
    audio.play(kind === 'skill' ? 'skill' : 'combo', Math.min(battle.combo, 8))

    // 蓄力打断：蓄力期间累计承受伤害达到阈值即打断（Boss 蓄力失败并吃反噬）
    if (enemy.charging) {
      enemy.charging.taken += dmg
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
        damagePlayer(enemy.phaseBlastDamage)
      }
    }
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
    addFloat(`${enemy.display} 回复 ${healed}`, 'heal')
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
      addFloat(`-${st.damage} (${kind === 'burn' ? '灼烧' : '中毒'})`, 'damage')
      st.turns--
      if (st.turns <= 0) {
        if (kind === 'burn') battle.playerBurn = null
        else battle.playerPoison = null
      }
      if (battle.playerHP <= 0) died = true
    }
    return died
  }

  /** 敌人对玩家造成伤害（护盾优先抵扣，REQ-HERO-103） */
  function damagePlayer(dmg: number): void {
    let rest = dmg
    if (battle.playerShield > 0) {
      const absorbed = Math.min(battle.playerShield, rest)
      battle.playerShield -= absorbed
      rest -= absorbed
      if (absorbed > 0) addFloat(`护盾抵挡 ${absorbed}`, 'info')
    }
    if (rest > 0) {
      battle.playerHP = Math.max(0, battle.playerHP - rest)
      addFloat(`-${rest}`, 'damage')
      doShake()
      audio.play('hit')
    }
  }

  function healPlayer(amount: number, reason?: string): void {
    if (battle.playerHP <= 0) return
    const healed = Math.min(PLAYER_MAX_HP - battle.playerHP, amount)
    battle.playerHP += healed
    if (healed > 0) {
      addFloat(`+${healed}${reason ? ` (${reason})` : ''}`, 'heal')
      audio.play('heal')
    }
  }

  function gainShield(amount: number): void {
    battle.playerShield += amount
    addFloat(`护盾 +${amount}`, 'info')
  }

  /** 释放主战英雄技能（技能石触发，REQ-HERO-002） */
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
    await sleep(150) // 让特写先入场

    const firePassive = supports.value.some((h) => h.passiveId === 'fireSkillUp')
    const heartOfFlame = hasRelic('relic_heart_of_flame')
    const desperate = hasRelic('relic_desperate_counter') && battle.playerHP < PLAYER_MAX_HP * 0.3
    const dmg = calcSkillDamage(skill.damage, hero.element, {
      firePassive,
      heartOfFlame,
      desperate
    })
    // 遗物/被动协同生效时飘字说明加成来源（REQ-FEEL-004）
    if (hero.element === 'fire' && heartOfFlame) {
      addFloat('火焰之心：火技能伤害 +30%', 'info')
    }
    if (hero.element === 'fire' && firePassive) {
      addFloat('炎龙骑士支援：火技能伤害 +15%', 'info')
    }
    if (desperate) {
      addFloat('绝境反击：全部伤害 +50%', 'info')
    }
    if (dmg > 0) await dealDamageToEnemy(dmg, 'skill')
    if (skill.heal) healPlayer(skill.heal)
    if (skill.shield) gainShield(skill.shield)
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
      // 寒冰之触遗物：冻结 +1 回合
      const bonus = hasRelic('relic_ice_touch') ? 1 : 0
      battle.enemy.frozen += skill.freeze + bonus
      addFloat('敌人被冻结！', 'info')
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
    battle.combo = 0

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
      const preview = GameBoard.expandBombTargets(board.grid, seeds)
      for (const p of preview.clear) {
        const cell = board.grid[p.row][p.col]
        if (cell) cell.popping = true
      }
      await sleep(ANIM.pop)

      const { cleared, specialsTriggered } = board.commitClear(seeds, groups)

      // 宝石伤害：仅普通宝石计数（技能石走技能结算）
      const gems = cleared.filter((c) => !c.special)
      if (gems.length > 0) {
        const dmg = calcWaveDamage(
          gems,
          battle.combo,
          {
            gemPower: battle.level!.gemPower,
            leaderElement: leader.value.element,
            sameBonusElement: sameBonusElement.value,
            gemMasteryBonus: hasRelic('relic_gem_mastery') ? 2 : 0,
            desperate: hasRelic('relic_desperate_counter') && battle.playerHP < PLAYER_MAX_HP * 0.3
          },
          hasRelic('relic_chain_reaction')
        )
        if (dmg > 0) await dealDamageToEnemy(dmg, battle.combo >= 3 ? 'crit' : 'damage')
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

      // 自然共鸣遗物：每消除 5 个木宝石回复 3 生命
      const woodCount = gems.filter((g) => g.element === 'wood').length
      battle.woodGemCleared += woodCount
      while (battle.woodGemCleared >= 5 && hasRelic('relic_nature_resonance')) {
        battle.woodGemCleared -= 5
        healPlayer(3, '自然共鸣')
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

    // 森林德鲁伊支援被动：每回合结束回复 3 生命
    if (supports.value.some((h) => h.passiveId === 'healPerTurn')) {
      healPlayer(3)
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
      await dealDamageToEnemy(enemy.burn.damage, 'damage')
      enemy.burn.turns--
      if (enemy.burn.turns <= 0) enemy.burn = null
    }
    if (enemy.poison) {
      await dealDamageToEnemy(enemy.poison.damage, 'damage')
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
      damagePlayer(charge.damage)
      await sleep(200)
      return null
    }

    // ② 行动轮换（Boss / 精英）
    if (enemy.pattern.length > 0) {
      const action = enemy.pattern[enemy.patternIndex % enemy.pattern.length]
      enemy.patternIndex = (enemy.patternIndex + 1) % enemy.pattern.length
      addFloat(`${enemy.display}「${action.name}」`, 'info')
      let chargeWindow: number | null = null
      switch (action.kind) {
        case 'attack':
          damagePlayer(enemy.attack)
          break
        case 'freezeBoard': {
          const count = applyFreezeBoard(action.size, action.turns)
          addFloat(`冻结了 ${count} 颗宝石！`, 'info')
          if (action.damage) damagePlayer(action.damage)
          break
        }
        case 'poison':
          damagePlayer(action.damage)
          if (battle.playerHP > 0) applyPlayerDot('poison', action.poison)
          break
        case 'burn':
          damagePlayer(action.damage)
          if (battle.playerHP > 0) applyPlayerDot('burn', action.burn)
          break
        case 'drain':
          damagePlayer(action.damage)
          healEnemy(action.heal)
          break
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
        break
      }
      case 'poisonAttack': {
        damagePlayer(enemy.attack)
        if (battle.playerHP > 0) {
          applyPlayerDot('poison', { damage: enemy.skill.damage, turns: enemy.skill.turns })
        }
        break
      }
      default:
        damagePlayer(enemy.attack)
    }
    await sleep(200)
    return null
  }

  // ================================================================
  // 波次与遗物（REQ-RELIC-002/004）
  // ================================================================

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
      const pool = RELICS.filter((r) => !battle.relics.includes(r.id))
      relicOffers.value = sampleN(pool, RELIC_CHOICES).map((r) => r.id)
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
    cutIn,
    shakeScreen,
    flashWhite,
    enemyWarn,
    relicOffers,
    // 派生
    leader,
    supports,
    sameBonusElement,
    hasBattleSnapshot,
    guideText,
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
    saveSnapshot
  }
})
