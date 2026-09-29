/**
 * 战斗反馈验收（仅开发期使用）
 *
 * 目的：验证需求 1 里的"攻击特效 / 技能释放 / 伤害数值 / 血条动画"真的会触发。
 * 做法：从 DOM 还原棋盘 → 算出一个能成三连的相邻交换 → 用 CDP 派发真实指针事件点它
 * → 在动画窗口内取样，确认角色切到 attack/hurt 态、血条宽度变化、飘字出现。
 *
 * 用法：node scripts/battle-demo.mjs [url] [width] [height]
 */
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { writeFileSync, mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:8123/.preview/index.html?level=2'
const W = Number(process.argv[3] ?? 390)
const H = Number(process.argv[4] ?? 844)
const OUT = '.preview/shots'
mkdirSync(OUT, { recursive: true })

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9336

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${process.env.TEMP}/bd-${Date.now()}`,
    'about:blank'
  ],
  { stdio: 'ignore' }
)

let ws
try {
  let targets
  for (let i = 0; i < 40; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      if (targets.some((t) => t.type === 'page')) break
    } catch {
      /* 端口未就绪 */
    }
    await delay(250)
  }
  ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((ok, no) => {
    ws.onopen = ok
    ws.onerror = no
  })

  let msgId = 0
  const pending = new Map()
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m)
      pending.delete(m.id)
    }
  }
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++msgId
      pending.set(id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails))
    return r.result.result.value
  }
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.result.data, 'base64'))
  }
  const tap = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await delay(40)
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: W,
    height: H,
    deviceScaleFactor: 2,
    mobile: true
  })
  await send('Page.navigate', { url: BASE })
  for (let i = 0; i < 30; i++) {
    await delay(250)
    if (await evaluate(`!!document.querySelector('.board .gem')`)) break
  }

  // ---- 1. 从 DOM 还原棋盘 ----
  const grid = await evaluate(`(() => {
    const out = []
    for (const el of document.querySelectorAll('.board .gem')) {
      const m = /行(\\d+) 列(\\d+)/.exec(el.getAttribute('aria-label') || '')
      const em = /el-(\\w+)/.exec(el.className)
      if (!m || !em) continue
      out.push({ r: +m[1] - 1, c: +m[2] - 1, e: em[1] })
    }
    return JSON.stringify(out)
  })()`)
  const cells = JSON.parse(grid)
  const N = 8
  const at = (r, c) => cells.find((x) => x.r === r && x.c === c)
  const lineLen = (g, r, c) => {
    const e = g[r][c]
    if (!e) return 0
    let best = 1
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      let n = 1
      for (const s of [1, -1]) {
        let rr = r + dr * s
        let cc = c + dc * s
        while (rr >= 0 && rr < N && cc >= 0 && cc < N && g[rr][cc] === e) {
          n++
          rr += dr * s
          cc += dc * s
        }
      }
      best = Math.max(best, n)
    }
    return best
  }
  const base = Array.from({ length: N }, () => Array(N).fill(null))
  for (const x of cells) base[x.r][x.c] = x.e

  // ---- 2. 找一个能成三连的相邻交换 ----
  let move = null
  for (let r = 0; r < N && !move; r++) {
    for (let c = 0; c < N && !move; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr
        const c2 = c + dc
        if (r2 >= N || c2 >= N) continue
        const g = base.map((row) => row.slice())
        ;[g[r][c], g[r2][c2]] = [g[r2][c2], g[r][c]]
        if (lineLen(g, r, c) >= 3 || lineLen(g, r2, c2) >= 3) {
          move = [
            { r, c },
            { r: r2, c: c2 }
          ]
          break
        }
      }
    }
  }
  if (!move) throw new Error('没有找到可成三连的交换')
  console.log('找到可交换对:', JSON.stringify(move))

  const centerOf = async (p) =>
    JSON.parse(
      await evaluate(`(() => {
        const el = [...document.querySelectorAll('.board .gem')]
          .find(e => (e.getAttribute('aria-label')||'').includes('行${p.r + 1} 列${p.c + 1}'))
        if (!el) return 'null'
        const b = el.getBoundingClientRect()
        return JSON.stringify({ x: b.x + b.width / 2, y: b.y + b.height / 2 })
      })()`)
    )

  const before = JSON.parse(
    await evaluate(`JSON.stringify({
      turn: document.querySelector('.turn-text')?.textContent?.trim(),
      enemyHp: document.querySelector('.plate-enemy .p-fill')?.style.width,
      heroHp: document.querySelector('.plate-hero .p-fill')?.style.width
    })`)
  )
  console.log('交换前:', JSON.stringify(before))

  // ---- 3. 真实点击触发交换 ----
  const a = await centerOf(move[0])
  const b = await centerOf(move[1])
  await tap(a.x, a.y)
  await delay(60)
  await tap(b.x, b.y)

  // ---- 4. 动画窗口内取样 ----
  const frames = []
  let captured = false
  for (let i = 0; i < 22; i++) {
    // 强制来一帧合成：无头窗口在"没人看图"时可能不推进 CSS 动画，
    // 抓一帧截图（丢弃）即可让动画时间线继续走，采样才落得到前冲窗口里
    await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await delay(50)
    const f = JSON.parse(
      await evaluate(`JSON.stringify({
          t: ${i * 50},
          hero: document.querySelector('.side-hero .sprite')?.className.replace(/sprite|act-/g,'').trim(),
          enemy: document.querySelector('.side-enemy .sprite')?.className.replace(/sprite|act-/g,'').trim(),
          heroAnim: (() => {
            const a = document.querySelector('.side-hero .sprite')?.getAnimations()[0]
            return a ? (a.currentTime === null ? 'pending' : Math.round(a.currentTime)) : 'none'
          })(),
          heroShift: (() => {
            const slot = document.querySelector('.side-hero')
            const img = slot?.querySelector('.sprite')
            if (!slot || !img) return null
            return +(img.getBoundingClientRect().left - slot.getBoundingClientRect().left).toFixed(1)
          })(),
          fx: document.querySelectorAll('.fx-svg').length,
          fxKinds: [...document.querySelectorAll('.fx-svg')].map(e=>e.dataset.fx).join(','),
          floats: [...document.querySelectorAll('.dmg')].map(e=>e.textContent.trim()).slice(0,4),
          enemyHp: document.querySelector('.plate-enemy .p-fill')?.style.width,
          enemyGhost: document.querySelector('.plate-enemy .p-ghost')?.style.width,
          combo: document.querySelector('.combo-display')?.textContent?.trim() || null
        })`)
    )
    frames.push(f)
    // 抓一帧动画进行中的画面，用来肉眼核对特效/飘字/姿态
    if (!captured && f.heroShift !== null && f.heroShift > 20) {
      await shot('battle_impact')
      captured = true
    }
  }

  console.log('\n帧序列：')
  for (const f of frames) {
    console.log(
      `  +${String(f.t).padStart(4)}ms  hero=${String(f.hero).padEnd(6)} enemy=${String(f.enemy).padEnd(6)}` +
        ` 前冲=${String(f.heroShift).padStart(6)}px anim=${String(f.heroAnim).padStart(6)}ms fx=${f.fx} hp=${String(f.enemyHp).padEnd(7)}` +
        ` floats=${f.floats.join(',')} combo=${f.combo ?? ''}`
    )
  }

  await shot('battle_after_swap')
  const changed = frames.some((f) => f.hero === 'attack' || f.enemy === 'hurt' || f.enemy === 'attack')
  const hpChanged = frames.some((f) => f.enemyHp !== before.enemyHp)
  // 横板前冲：出手瞬间立绘必须真的沿横轴向前位移（而不只是原地播动画）
  const moved = frames.some((f) => f.heroShift !== null && f.heroShift > 4)
  console.log(`\n角色动作切换: ${changed ? '✅' : '❌'}   血条变化: ${hpChanged ? '✅' : '❌'}`)
  console.log(`前冲位移: ${moved ? '✅' : '❌'}`)
  console.log(`飘字出现: ${frames.some((f) => f.floats.length) ? '✅' : '❌'}`)
} finally {
  try {
    ws?.close()
  } catch {
    /* ignore */
  }
  chrome.kill()
}
