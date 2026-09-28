/**
 * 多视口视觉校验（仅开发期使用）
 *
 * 一次 Chrome 会话内遍历多个视口，输出每个视口的关键盒模型 + 截图，
 * 用来验收响应式布局：棋盘是否溢出、提示条是否压住棋盘、面板是否被裁切。
 *
 * 用法：node scripts/visual-check.mjs [baseUrl]
 */
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { writeFileSync, mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:8123/.preview/index.html'
const OUT = '.preview/shots'
mkdirSync(OUT, { recursive: true })

/** 待校验的视口与状态 */
const CASES = [
  { name: 'iphone14', w: 390, h: 844 },
  { name: 'se', w: 375, h: 667 },
  { name: 'small-android', w: 360, h: 640 },
  { name: 'iphone-plus', w: 414, h: 896 },
  { name: 'landscape', w: 844, h: 390 },
  { name: 'tablet', w: 1024, h: 768 },
  { name: 'desktop', w: 1280, h: 800 },
  { name: 'desktop-short', w: 1440, h: 640 }
]

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9334

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${process.env.TEMP}/vc-${Date.now()}`,
    'about:blank'
  ],
  { stdio: 'ignore' }
)

const MEASURE = `(() => {
  const box = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
             scrollH: el.scrollHeight, clientH: el.clientHeight }
  }
  const b = box('.board'), t = box('.tip-layer'), w = box('.board-wrap')
  const tc = box('.tab-content')
  const guard = document.querySelector('.rotate-guard')
  return JSON.stringify({
    vw: innerWidth, vh: innerHeight,
    // 横屏守卫生效时游戏本体不渲染，棋盘指标无意义
    guard: guard ? getComputedStyle(guard).display !== 'none' : false,
    wrap: w, board: b, tip: t, tabContent: tc,
    // 棋盘是否严格正方形
    square: b ? Math.abs(b.w - b.h) < 0.8 : null,
    // 棋盘底边 - 提示条顶边：>0 表示提示条压住棋盘
    tipOverlap: b && t ? +(b.y + b.h - t.y).toFixed(1) : null,
    // 棋盘是否完全落在视口内
    boardInView: b ? b.x >= -0.5 && b.x + b.w <= innerWidth + 0.5 && b.y >= -0.5 && b.y + b.h <= innerHeight + 0.5 : null,
    // Tab 内容是否被容器裁切。
    // 容忍 2px：leader-dot 等装饰元素用负偏移挂在卡片外沿，会撑大 scrollHeight，
    // 但它们仍在 .bottom-panel 的 padding box 内，不会被 overflow:hidden 裁掉。
    tabClipped: tc ? tc.scrollH > tc.clientH + 2 : null,
    overflowCount: [...document.querySelectorAll('.app-root *')]
      .filter((el) => el.getBoundingClientRect().right > innerWidth + 0.5).length
  })
})()`

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
  const page = targets.find((t) => t.type === 'page')
  ws = new WebSocket(page.webSocketDebuggerUrl)
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

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  })

  const results = []
  for (const c of CASES) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: c.w,
      height: c.h,
      deviceScaleFactor: 2,
      mobile: c.w < 860
    })
    // 两个 Tab 都要验：技能页内容比宝石页高，是最容易被裁切的一页
    for (const tab of ['gem', 'skill']) {
      await send('Page.navigate', { url: `${BASE}?level=2&tab=${tab}` })
      // 轮询等待棋盘挂载（首帧可能还在切屏过渡里）
      let m = null
      for (let i = 0; i < 30; i++) {
        await delay(250)
        const r = await send('Runtime.evaluate', { expression: MEASURE, returnByValue: true })
        m = JSON.parse(r.result.result.value)
        if (m.board || m.guard) break
      }
      results.push({ name: tab === 'gem' ? c.name : `${c.name}/skill`, ...m })

      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      writeFileSync(`${OUT}/vc_${c.name}${tab === 'skill' ? '_skill' : ''}.png`, Buffer.from(shot.result.data, 'base64'))
    }
  }

  const pad = (s, n) => String(s).padEnd(n)
  console.log(
    pad('case', 15) + pad('viewport', 11) + pad('board', 13) + pad('sq', 5) + pad('inView', 8) +
      pad('tipOverlap', 12) + pad('tabClip', 9) + 'ovf'
  )
  for (const r of results) {
    if (r.guard) {
      console.log(pad(r.name, 15) + pad(`${r.vw}x${r.vh}`, 11) + '— 横屏守卫生效，游戏本体不渲染 —')
      continue
    }
    console.log(
      pad(r.name, 15) +
        pad(`${r.vw}x${r.vh}`, 11) +
        pad(`${r.board.w}x${r.board.h}`, 13) +
        pad(r.square, 5) +
        pad(r.boardInView, 8) +
        pad(r.tipOverlap, 12) +
        pad(r.tabClipped, 9) +
        r.overflowCount
    )
  }
  const bad = results.filter((r) => {
    if (r.guard) return false
    // 棋盘塌陷（宽或高小于 120px）说明布局空间不足
    if (!r.board || r.board.w < 120 || r.board.h < 120) return true
    return !r.square || !r.boardInView || r.tipOverlap > 0 || r.tabClipped || r.overflowCount > 0
  })
  console.log(bad.length ? `\n❌ ${bad.length} 个视口存在问题: ${bad.map((b) => b.name).join(', ')}` : '\n✅ 全部视口通过')
} finally {
  try {
    ws?.close()
  } catch {
    /* ignore */
  }
  chrome.kill()
}
