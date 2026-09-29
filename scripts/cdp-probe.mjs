/**
 * CDP 布局探针（仅开发期使用）
 *
 * 用 Chrome DevTools Protocol 读取页面真实布局数据，避免靠截图像素猜测。
 * Node 22 自带 WebSocket，无需额外依赖。
 *
 * 用法：
 *   node scripts/cdp-probe.mjs <url> [width] [height]
 */
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const url = process.argv[2] ?? 'http://127.0.0.1:8123/.preview/index.html?level=2'
const width = Number(process.argv[3] ?? 390)
const height = Number(process.argv[4] ?? 844)

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9333

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--window-size=${width},${height}`,
    `--user-data-dir=${process.env.TEMP}/cdp-probe-${Date.now()}`,
    'about:blank'
  ],
  { stdio: 'ignore' }
)

let ws
try {
  // 等待调试端口就绪
  let targets
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      targets = await res.json()
      if (targets.some((t) => t.type === 'page')) break
    } catch {
      /* 端口还没起来 */
    }
    await delay(250)
  }
  const page = targets.find((t) => t.type === 'page')
  if (!page) throw new Error('未找到 page target')

  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((ok, no) => {
    ws.onopen = ok
    ws.onerror = no
  })

  let msgId = 0
  const pending = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++msgId
      pending.set(id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
    })

  await send('Page.enable')
  await send('Runtime.enable')
  // 减弱动效：跳过入场过渡，保证截图落在稳定帧（与 App.vue 的 reduced-motion 分支一致）
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  })
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: true
  })
  await send('Page.navigate', { url })
  await delay(2500)

  const expr = `(() => {
    const out = { viewport: [innerWidth, innerHeight], dpr: devicePixelRatio }
    const box = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
               scrollW: el.scrollWidth, scrollH: el.scrollHeight }
    }
    out.app = box('.app-root')
    out.stage = box('.battle-stage')
    out.stageHud = box('.hud-row')
    out.stageMeta = box('.meta-row')
    out.stageScene = box('.scene')
    out.boardWrap = box('.board-wrap')
    out.board = box('.board')
    out.gem0 = box('.board .gem')
    out.tipLayer = box('.tip-layer')
    out.bottomPanel = box('.bottom-panel')
    out.gemGrid = box('.gem-grid')
    out.gemCard = box('.gem-card')
    out.tabBar = box('.tab-bar')
    out.tabContent = box('.tab-content')
    out.docScrollW = document.documentElement.scrollWidth
    out.bodyScrollW = document.body.scrollWidth
    out.heroSide = box('.side-hero')
    out.enemySide = box('.side-enemy')
    out.heroSprite = box('.side-hero .sprite')
    out.enemySprite = box('.side-enemy .sprite')
    out.heroPlate = box('.plate-hero')
    out.enemyPlate = box('.plate-enemy')
    out.heroHp = box('.plate-hero .p-bar')
    out.enemyHp = box('.plate-enemy .p-bar')
    out.timerWrap = box('.timer-wrap')
    out.lunge = {
      hero: getComputedStyle(document.querySelector('.battle-stage')).getPropertyValue('--lunge-hero').trim(),
      enemy: getComputedStyle(document.querySelector('.battle-stage')).getPropertyValue('--lunge-enemy').trim()
    }
    out.skillPanel = box('.skill-panel')
    out.heroSwitch = box('.hero-switch')
    out.heroChip0 = box('.hero-chip')
    out.skillCard = box('.skill-card')
    out.detailMask = box('.detail-mask')
    out.detailCard = box('.detail-card')
    out.overflows = [...document.querySelectorAll('.app-root *')]
      .filter((el) => el.getBoundingClientRect().right > innerWidth + 0.5)
      .slice(0, 8)
      .map((el) => ({ cls: el.className.toString().slice(0, 60), right: +el.getBoundingClientRect().right.toFixed(1) }))
    return JSON.stringify(out, null, 2)
  })()`

  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
  console.log(r.result?.result?.value ?? JSON.stringify(r, null, 2))

  // 与测量同源截图：避免 CLI --screenshot 的视口与 --window-size 不一致
  const shotPath = process.argv[5]
  if (shotPath) {
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    const { writeFileSync } = await import('node:fs')
    writeFileSync(shotPath, Buffer.from(shot.result.data, 'base64'))
    console.log(`[shot] ${shotPath}`)
  }
} finally {
  try {
    ws?.close()
  } catch {
    /* ignore */
  }
  chrome.kill()
}
