/**
 * 数值审计（平衡性回归工具）
 *
 * 用**真实的棋盘引擎与伤害公式**（GameBoard / calcWaveDamage / calcSkillDamage /
 * createEnemyState）做回合制蒙特卡洛，回答三个问题：
 *   1. 每关通关剩血 / 死亡率 —— 难度是否落在方案目标区间内（OPT-G2/G3）
 *   2. 贪婪（最优交换）vs 随机 —— "玩得好"是否有回报（OPT-G1）
 *   3. 换主战英雄的差异 —— 元素克制是否形成配队决策（OPT-G1）
 *
 * 用法：
 *   npx tsx scripts/balance-audit.ts            # 默认每关 20 局
 *   npx tsx scripts/balance-audit.ts 40         # 自定义局数
 *
 * 说明：模拟器是"完美 AI"（枚举全部交换、按最大伤害落子、恒定手速），
 * 真人会更慢更易失误，因此真机表现应比下表更紧张——用它做**相对比较与回归**，
 * 不要把它当绝对难度标尺。
 */
import { GameBoard } from '../src/core/board'
import {
  advanceEnemyPhase,
  calcSkillDamage,
  calcWaveDamage,
  createEnemyState,
  elementCounterOf,
  enemyDead,
  tryEnrage
} from '../src/core/battle'
import { LEVELS } from '../src/config/levels'
import { getEnemy } from '../src/config/enemies'
import { getHero, HEROES } from '../src/config/heroes'
import { RELICS } from '../src/config/relics'
import {
  BOARD_SIZE,
  chapterAtkMult,
  chapterHpMult,
  DRAGON_EVENT_CHANCE,
  GEM_CRIT_CHANCE,
  GEM_CRIT_MULT,
  PASSIVE_HEAL_PER_TURN,
  skillChapterScale,
  SWAP_HP_COST,
  WEAK_MULT_HUNTER
} from '../src/config/constants'
import { applyDragonEventToBoard, rollDragonEvent } from '../src/core/events'
import type { ElementType, EnemyState, Pos } from '../src/types'

const MAX_TURNS = 200
const PLAYER_MAX_HP = 100

/** 遗物选取优先级（模拟"有策略的玩家"：优先输出型） */
const RELIC_PRIORITY = [
  'relic_weak_hunter',
  'relic_chain_reaction',
  'relic_gem_mastery',
  'relic_arcane_echo',
  'relic_heart_of_flame',
  'relic_ice_touch',
  'relic_bomb_frenzy',
  'relic_nature_resonance',
  'relic_lucky_dice',
  'relic_element_resonance',
  'relic_desperate_counter',
  'relic_iron_wall'
]

interface SimResult {
  turns: number
  damageTaken: number
  hpLeft: number
  playerDead: boolean
  skillTaps: number
  fours: number
  /** 龙脉异象触发次数（V3） */
  events: number
}

/* ------------------------------------------------------------------ */
/* 模拟器                                                              */
/* ------------------------------------------------------------------ */

export function simulateLevel(
  levelId: number,
  leaderId: string,
  opts: { policy: 'greedy' | 'random'; tapSkills: boolean }
): SimResult {
  const level = LEVELS.find((l) => l.id === levelId)!
  const leader = getHero(leaderId)
  const supports = HEROES.filter((h) => h.id !== leaderId)
  const healPerTurn = supports.some((h) => h.passiveId === 'healPerTurn') ? PASSIVE_HEAL_PER_TURN : 0
  const freezePassive = supports.some((h) => h.passiveId === 'freezeUp') ? 1 : 0
  const chapterScale = skillChapterScale(level.gemPower)

  const board = new GameBoard({})
  let hp = PLAYER_MAX_HP
  let shield = 0
  let playerBurn: { damage: number; turns: number } | null = null
  let enemyShield = 0
  const relics = new Set<string>()
  const res: SimResult = { turns: 0, damageTaken: 0, hpLeft: 0, playerDead: false, skillTaps: 0, fours: 0, events: 0 }

  let enemy: EnemyState | null = null
  let cfg = getEnemy('enemy_slime')
  let patternIdx = 0
  let charging: { damage: number; interrupt: number; recoil: number; taken: number } | null = null
  let waveIdx = 0
  let woodCleared = 0

  const armorNow = (): number => (enemy ? enemy.armor[enemy.phase - 1] ?? 0 : 0)
  const counterNow = () => elementCounterOf(enemy ? cfg : null, relics.has('relic_weak_hunter'))
  const fireBonus = (): number =>
    (relics.has('relic_heart_of_flame') ? 0.25 : 0) +
    (supports.some((h) => h.passiveId === 'fireSkillUp') ? 0.1 : 0)

  const spawn = (i: number): void => {
    const w = level.waves[i]
    enemy = createEnemyState(w, {
      hpMult: chapterHpMult(level.gemPower),
      atkMult: chapterAtkMult(level.chapter)
    })
    cfg = getEnemy(w.enemyId)
    patternIdx = 0
    charging = null
    enemyShield = 0
  }
  if (level.waves.length > 0) spawn(0)

  const applyToPlayer = (dmg: number): void => {
    let rest = dmg
    if (shield > 0) {
      const a = Math.min(shield, rest)
      shield -= a
      rest -= a
    }
    if (rest > 0) {
      hp -= rest
      res.damageTaken += rest
    }
  }

  const damageEnemy = (raw: number): void => {
    if (!enemy || raw <= 0) return
    // 寒冰之触：冻结目标 +15%
    let dmg = relics.has('relic_ice_touch') && enemy.frozen > 0 ? Math.floor(raw * 1.15) : raw
    if (enemyShield > 0) {
      const a = Math.min(enemyShield, dmg)
      enemyShield -= a
      dmg -= a
    }
    if (dmg <= 0) return
    enemy.hp -= dmg
    if (charging) {
      charging.taken += dmg
      if (charging.taken >= charging.interrupt) {
        enemy.hp -= charging.recoil
        charging = null
      }
    }
    if (advanceEnemyPhase(enemy)) {
      if (enemy.phaseBlastDamage > 0) applyToPlayer(enemy.phaseBlastDamage)
    }
    tryEnrage(enemy)
  }

  const useSkill = (isUlt: boolean): void => {
    const hero = leader
    const sk = isUlt ? hero.skill5 : hero.skill4
    if (sk.damage > 0) {
      const dmg = calcSkillDamage(sk.damage, hero.element, {
        firePassive: supports.some((h) => h.passiveId === 'fireSkillUp'),
        heartOfFlame: relics.has('relic_heart_of_flame'),
        counter: counterNow(),
        armor: armorNow(),
        arcaneEcho: relics.has('relic_arcane_echo'),
        chapterScale
      })
      damageEnemy(dmg)
    }
    if (sk.burn && enemy) enemy.burn = { ...sk.burn }
    if (sk.freeze && enemy) {
      enemy.frozen += sk.freeze + (relics.has('relic_ice_touch') ? 1 : 0) + freezePassive
    }
    if (sk.heal) hp = Math.min(PLAYER_MAX_HP, hp + sk.heal)
    if (sk.clearDebuff) playerBurn = null
  }

  const resolveCascade = (): void => {
    let combo = 0
    for (;;) {
      const groups = board.findMatches()
      if (groups.length === 0) break
      combo++
      for (const g of groups) if (g.length >= 4) res.fours++
      const bombRadius = relics.has('relic_bomb_frenzy') ? 2 : 1
      const { cleared, specialsTriggered } = board.commitClear(
        groups.flatMap((g) => g.cells),
        groups,
        { bombRadius }
      )
      const gems = cleared.filter((c) => !c.special)
      if (gems.length > 0) {
        let dmg = calcWaveDamage(
          gems,
          combo,
          {
            gemPower: level.gemPower,
            leaderElement: leader.element,
            sameBonusElement: null,
            counter: counterNow(),
            armor: armorNow(),
            fireBonus: fireBonus(),
            arcanePenalty: relics.has('relic_arcane_echo'),
            bigMatchBonus: relics.has('relic_gem_mastery') && groups.some((g) => g.length >= 4),
            bombBonus:
              relics.has('relic_bomb_frenzy') && specialsTriggered.some((s) => s.special === 'bomb'),
            desperate: relics.has('relic_desperate_counter') && hp < PLAYER_MAX_HP * 0.3
          },
          relics.has('relic_chain_reaction')
        )
        // 龙纹暴击（V3）：与 store 同概率同步长
        if (dmg > 0 && enemy && !enemyDead(enemy) && Math.random() < GEM_CRIT_CHANCE) {
          dmg = Math.round(dmg * GEM_CRIT_MULT)
        }
        damageEnemy(dmg)
      }
      for (const s of specialsTriggered) useSkill(s.special === 'ultimate')
      // 自然共鸣：每 5 木宝石 +3 护盾（上限 20）
      woodCleared += gems.filter((g) => g.element === 'wood').length
      while (woodCleared >= 5 && relics.has('relic_nature_resonance')) {
        woodCleared -= 5
        const room = Math.max(0, 20 - shield)
        shield += Math.min(room, 3)
      }
      if (enemy && enemyDead(enemy)) break
      board.applyGravity()
    }
  }

  for (let t = 0; t < MAX_TURNS; t++) {
    if (!enemy || hp <= 0) break
    if (enemyDead(enemy)) {
      if (waveIdx + 1 >= level.waves.length) break
      // 波间遗物三选一：按优先级取一个未持有遗物
      if (relics.size < 3) {
        const pool = RELIC_PRIORITY.filter((id) => !relics.has(id) && RELICS.some((r) => r.id === id))
        if (pool[0]) relics.add(pool[0])
      }
      waveIdx++
      spawn(waveIdx)
    }
    res.turns++

    // 技能石主动触发：有终极石优先，否则小技能石
    let acted = false
    if (opts.tapSkills) {
      const stones: Pos[] = []
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const cell = board.grid[r][c]
          if (cell && cell.special && cell.frozen === 0) stones.push({ row: r, col: c })
        }
      }
      if (stones.length > 0) {
        const pos = stones.find((p) => board.cellAt(p)?.special === 'ultimate') ?? stones[0]
        useSkill(board.cellAt(pos)?.special === 'ultimate')
        board.commitClear([pos], [])
        board.applyGravity()
        res.skillTaps++
        acted = true
      }
    }

    if (!acted) {
      const swaps: [Pos, Pos][] = []
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          for (const [dr, dc] of [
            [0, 1],
            [1, 0]
          ]) {
            const a = { row: r, col: c }
            const b = { row: r + dr, col: c + dc }
            if (!board.canSwap(a, b)) continue
            board.swap(a, b)
            const ok = board.findMatches().length > 0
            board.swap(a, b)
            if (ok) swaps.push([a, b])
          }
        }
      }
      if (swaps.length === 0) {
        board.shuffle()
        continue
      }
      let chosen: [Pos, Pos] = swaps[0]
      if (opts.policy === 'greedy') {
        let best = -1
        for (const sw of swaps) {
          board.swap(sw[0], sw[1])
          const groups = board.findMatches()
          let score = 0
          const counter = counterNow()
          for (const g of groups) {
            for (const p of g.cells) {
              const cell = board.cellAt(p)
              if (!cell || cell.special) continue
              let power = level.gemPower
              if (cell.element === leader.element) power *= 1.2
              if (cell.element === counter.weak) power *= counter.weakMult
              else if (cell.element === counter.resist) power *= 0.5
              if (cell.element === 'fire') power *= 1 + fireBonus()
              score += power
            }
          }
          board.swap(sw[0], sw[1])
          if (score > best) {
            best = score
            chosen = sw
          }
        }
      } else {
        chosen = swaps[Math.floor(Math.random() * swaps.length)]
      }
      board.swap(chosen[0], chosen[1])
      resolveCascade()
    }

    // 龙脉代价（V3）：每次有效棋盘操作直接扣血（无视护盾；死局洗牌未操作不扣）
    hp -= SWAP_HP_COST
    res.damageTaken += SWAP_HP_COST

    if (enemy && enemyDead(enemy)) {
      if (waveIdx + 1 >= level.waves.length) break
      continue
    }

    // ---- 回合结束：被动回血 → 玩家 DOT → 敌人阶段 ----
    if (healPerTurn && hp > 0) hp = Math.min(PLAYER_MAX_HP, hp + healPerTurn)
    if (playerBurn) {
      hp -= playerBurn.damage
      res.damageTaken += playerBurn.damage
      playerBurn.turns--
      if (playerBurn.turns <= 0) playerBurn = null
    }
    if (hp <= 0) {
      res.playerDead = true
      break
    }

    if (enemy && !enemyDead(enemy)) {
      // 敌人 DOT
      if (enemy.burn) {
        damageEnemy(enemy.burn.damage)
        enemy.burn.turns--
        if (enemy.burn.turns <= 0) enemy.burn = null
      }
      if (enemy.poison) {
        damageEnemy(enemy.poison.damage)
        enemy.poison.turns--
        if (enemy.poison.turns <= 0) enemy.poison = null
      }
      if (enemy && !enemyDead(enemy)) {
        if (enemy.frozen > 0) {
          enemy.frozen--
        } else if (enemy.stunned > 0) {
          enemy.stunned--
        } else {
          enemy.countdown--
          if (enemy.countdown <= 0) {
            let nextCd: number | null = null
            const acts =
              enemy.pattern.length > 0
                ? enemy.pattern
                : ([{ kind: 'attack', name: '攻击' }] as typeof enemy.pattern)
            if (charging) {
              applyToPlayer(charging.damage)
              charging = null
            } else {
              const act = acts[patternIdx % acts.length]
              patternIdx = (patternIdx + 1) % acts.length
              switch (act.kind) {
                case 'attack':
                  applyToPlayer(enemy.attack)
                  break
                case 'freezeBoard': {
                  const r = Math.floor(Math.random() * (BOARD_SIZE - act.size + 1))
                  const c = Math.floor(Math.random() * (BOARD_SIZE - act.size + 1))
                  for (let dr = 0; dr < act.size; dr++) {
                    for (let dc = 0; dc < act.size; dc++) {
                      const cell = board.grid[r + dr]?.[c + dc]
                      if (cell) cell.frozen = act.turns
                    }
                  }
                  if (act.damage) applyToPlayer(act.damage)
                  break
                }
                case 'burn':
                  applyToPlayer(act.damage)
                  if (hp > 0) {
                    playerBurn = {
                      damage: (playerBurn?.damage ?? 0) + act.burn.damage,
                      turns: Math.max(playerBurn?.turns ?? 0, act.burn.turns)
                    }
                  }
                  break
                case 'corrupt': {
                  applyToPlayer(act.damage ?? enemy.attack)
                  let n = act.count
                  let guard = 0
                  while (n > 0 && guard++ < act.count * 30) {
                    const r = Math.floor(Math.random() * BOARD_SIZE)
                    const c = Math.floor(Math.random() * BOARD_SIZE)
                    const cell = board.grid[r]?.[c]
                    if (!cell || cell.frozen > 0 || cell.special || cell.element === cfg.element) continue
                    cell.element = cfg.element
                    n--
                  }
                  break
                }
                case 'shield':
                  enemyShield += act.amount
                  break
                case 'charge':
                  charging = { damage: act.releaseDamage, interrupt: act.interrupt, recoil: act.recoil ?? 0, taken: 0 }
                  nextCd = act.window ?? null
                  break
              }
            }
            enemy.countdown = nextCd ?? enemy.baseCountdown
          }
        }
      }
    }
    for (const row of board.grid) for (const cell of row) if (cell && cell.frozen > 0) cell.frozen--

    // 龙脉异象（V3）：与 store 同源的事件池与落实逻辑；反噬致死由下方 hp<=0 判定捕获
    if (enemy && !enemyDead(enemy) && hp > 0 && Math.random() < DRAGON_EVENT_CHANCE) {
      res.events++
      const ev = rollDragonEvent()
      switch (ev.kind) {
        case 'dragon_echo':
          hp = Math.min(PLAYER_MAX_HP, hp + ev.hp!)
          break
        case 'scale_guard':
          shield += ev.shield!
          break
        case 'dragon_backlash':
          hp -= ev.hp!
          res.damageTaken += ev.hp!
          break
        default:
          applyDragonEventToBoard(board, ev)
      }
    }

    if (hp <= 0) {
      res.playerDead = true
      break
    }
    if (enemy && !enemyDead(enemy) && !board.hasAnyValidSwap()) board.shuffle()
  }

  res.hpLeft = Math.max(0, hp)
  return res
}

/* ------------------------------------------------------------------ */
/* 报告                                                                */
/* ------------------------------------------------------------------ */

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function report(runs: number): void {
  console.log(`\n=== 龙纹消消棋 数值审计（Runs=${runs}/关，主战=炎龙骑士，支援=冰巫+德鲁伊）===`)
  console.log('关卡        | 回合 | 承伤 | 剩HP | 死亡 | 技能石 | 4消 | 异象')
  for (const lv of LEVELS) {
    if (lv.tutorial === 'match') continue
    const rs = Array.from({ length: runs }, () =>
      simulateLevel(lv.id, 'hero_flame_knight', { policy: 'greedy', tapSkills: true })
    )
    console.log(
      `${String(lv.id).padStart(2)} ${lv.name.padEnd(6)} | ${String(Math.round(mean(rs.map((r) => r.turns)))).padStart(4)} | ` +
        `${String(Math.round(mean(rs.map((r) => r.damageTaken)))).padStart(4)} | ` +
        `${String(Math.round(mean(rs.map((r) => r.hpLeft)))).padStart(4)} | ` +
        `${String(rs.filter((r) => r.playerDead).length).padStart(2)}/${runs} | ` +
        `${mean(rs.map((r) => r.skillTaps)).toFixed(1).padStart(5)} | ` +
        `${mean(rs.map((r) => r.fours)).toFixed(1)} | ` +
        `${mean(rs.map((r) => r.events)).toFixed(1)}`
    )
  }

  console.log('\n--- 决策质量：贪婪 vs 随机（同关同英雄） ---')
  for (const lid of [4, 7, 10, 13, 15]) {
    const g = Array.from({ length: runs }, () => simulateLevel(lid, 'hero_flame_knight', { policy: 'greedy', tapSkills: true }))
    const r = Array.from({ length: runs }, () => simulateLevel(lid, 'hero_flame_knight', { policy: 'random', tapSkills: true }))
    const gT = mean(g.map((x) => x.turns))
    const rT = mean(r.map((x) => x.turns))
    console.log(
      `关卡${String(lid).padStart(2)}: 贪婪 ${gT.toFixed(0).padStart(3)} 回合/剩 ${mean(g.map((x) => x.hpLeft)).toFixed(0).padStart(3)}` +
        ` ｜ 随机 ${rT.toFixed(0).padStart(3)} 回合/剩 ${mean(r.map((x) => x.hpLeft)).toFixed(0).padStart(3)}` +
        ` ｜ 回合差 ${(((rT - gT) / gT) * 100).toFixed(0)}% ｜ 随机死亡 ${r.filter((x) => x.playerDead).length}/${runs}`
    )
  }

  console.log('\n--- 配队决策：1-10 换主战英雄（巨龙弱点=水） ---')
  for (const hero of HEROES) {
    const rs = Array.from({ length: runs }, () => simulateLevel(10, hero.id, { policy: 'greedy', tapSkills: true }))
    console.log(
      `${hero.name.padEnd(5)}: 回合 ${Math.round(mean(rs.map((r) => r.turns)))} ｜ 剩HP ${Math.round(mean(rs.map((r) => r.hpLeft)))} ｜ 死亡 ${rs.filter((r) => r.playerDead).length}/${runs}`
    )
  }
  console.log('')
}

if (process.argv[1] && process.argv[1].includes('balance-audit')) {
  report(Number(process.argv[2] ?? 20))
}
