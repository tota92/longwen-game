/**
 * 多视口视觉校验（仅开发期使用）
 *
 * 一次 Chrome 会话内遍历多个视口，输出每个视口的关键盒模型 + 截图，
 * 用来验收响应式布局：棋盘是否铺满剩余空间、提示浮层是否只覆盖棋盘而不改变棋盘、
 * 面板是否被裁切。
 *
 * 棋盘契约：边长 = min(容器内容框宽, 容器内容框高)，即剩余空间内最大的正方形；
 * 提示契约：浮层完全落在棋盘之内（覆盖棋盘），且摘掉浮层后棋盘矩形不变。
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

  // 铺满度 = 棋盘边长 / 剩余空间里能放下的最大正方形边长（1.000 为刚好铺满）
  let fill = null
  let boardStable = null
  const wrapEl = document.querySelector('.board-wrap')
  if (wrapEl && b) {
    const cs = getComputedStyle(wrapEl)
    const contentW = wrapEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const contentH = wrapEl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    fill = +(b.w / Math.min(contentW, contentH)).toFixed(3)

    // 提示浮层不得影响棋盘：把浮层从渲染树摘掉后，棋盘矩形必须一模一样
    const layer = document.querySelector('.tip-layer')
    if (layer) {
      const prev = layer.style.display
      layer.style.display = 'none'
      const after = document.querySelector('.board').getBoundingClientRect()
      boardStable =
        Math.abs(after.x - b.x) < 0.5 && Math.abs(after.y - b.y) < 0.5 &&
        Math.abs(after.width - b.w) < 0.5 && Math.abs(after.height - b.h) < 0.5
      layer.style.display = prev
    }
  }

  const layerEl = document.querySelector('.tip-layer')
  const barEl = document.querySelector('.tip-bar')

  // 洗牌抖动只挂在棋盘本体上：提示浮层不跟着歪（浮层不是棋盘的一部分）
  // 注意：scoped SFC 会给 @keyframes 加作用域后缀（shuffle-anim-<hash>），所以用前缀匹配
  let shuffleOnBoardOnly = null
  if (wrapEl) {
    wrapEl.classList.add('shuffling')
    shuffleOnBoardOnly =
      getComputedStyle(document.querySelector('.board')).animationName.startsWith('shuffle-anim') &&
      (!layerEl || getComputedStyle(layerEl).animationName === 'none')
    wrapEl.classList.remove('shuffling')
  }
  // 真·命中测试：从提示条正中取样，穿透后必须落在棋盘（或被关闭按钮接住），
  // 证明浮层没有挡住宝石的落子/滑动
  let tipHitBoard = null
  if (barEl && b) {
    const r = barEl.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + Math.min(14, r.width / 2), r.top + r.height / 2)
    tipHitBoard = !!hit && (hit.closest('.tip-close') !== null || hit.closest('.board') !== null)
  }

  // 棋盘上不允许有常驻的可点控件：任何盖在棋格上的按钮都会抢掉落子点击。
  // 提示条自己的关闭按钮随提示一起出现/消失，单独放行。
  const boardBoxEl = document.querySelector('.board-box')
  const boardBlockers = boardBoxEl
    ? [...boardBoxEl.querySelectorAll('*')]
        .filter((el) => !el.closest('.board') && !el.closest('.tip-close'))
        .filter((el) => getComputedStyle(el).pointerEvents !== 'none')
        .map((el) => el.className.toString())
    : []
  return JSON.stringify({
    vw: innerWidth, vh: innerHeight,
    // 横屏守卫生效时游戏本体不渲染，棋盘指标无意义
    guard: guard ? getComputedStyle(guard).display !== 'none' : false,
    wrap: w, board: b, tip: t, tabContent: tc,
    // 棋盘是否严格正方形
    square: b ? Math.abs(b.w - b.h) < 0.8 : null,
    fill,
    boardStable,
    // 提示浮层必须完整落在棋盘之内（浮在棋盘之上，而非另占一块地方）
    tipInBoard: b && t
      ? t.x >= b.x - 0.5 && t.y >= b.y - 0.5 &&
        t.x + t.w <= b.x + b.w + 0.5 && t.y + t.h <= b.y + b.h + 0.5
      : null,
    // 不拦截棋盘操作：浮层与提示条本体都必须是 pointer-events:none
    tipPointerNone: layerEl ? getComputedStyle(layerEl).pointerEvents === 'none' : null,
    tipBarPointerNone: barEl ? getComputedStyle(barEl).pointerEvents === 'none' : null,
    tipHitBoard,
    shuffleOnBoardOnly,
    // 棋盘内除「提示关闭按钮」外不应有任何可点元素（常驻控件会挡住底行宝石）
    boardBlockers,
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
    pad('case', 15) + pad('viewport', 11) + pad('board', 13) + pad('sq', 5) + pad('fill', 7) +
      pad('inView', 8) + pad('stable', 8) + pad('tipIn', 7) + pad('tipPE', 7) +
      pad('hitThru', 9) + pad('shuffle', 9) + pad('blocks', 8) + pad('tabClip', 9) + 'ovf'
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
        pad(r.fill, 7) +
        pad(r.boardInView, 8) +
        pad(r.boardStable, 8) +
        pad(r.tipInBoard, 7) +
        pad(r.tipPointerNone && r.tipBarPointerNone, 7) +
        pad(r.tipHitBoard === null ? '—' : r.tipHitBoard, 9) +
        pad(r.shuffleOnBoardOnly, 9) +
        pad(r.boardBlockers.length, 8) +
        pad(r.tabClipped, 9) +
        r.overflowCount
    )
  }
  const bad = results.filter((r) => {
    if (r.guard) return false
    // 棋盘塌陷（宽或高小于 120px）说明布局空间不足
    if (!r.board || r.board.w < 120 || r.board.h < 120) return true
    return (
      !r.square ||
      !r.boardInView ||
      // 铺满度：1.000 为刚好铺满剩余空间；小于 1 是留白，大于 1 是溢出
      r.fill === null || r.fill < 0.99 || r.fill > 1.001 ||
      // 提示浮层既不能改变棋盘，也不能跑到棋盘之外，更不能拦截操作
      !r.boardStable ||
      !r.tipInBoard ||
      !r.tipPointerNone ||
      !r.tipBarPointerNone ||
      r.tipHitBoard === false ||
      // 洗牌抖动仍只作用于棋盘本体
      !r.shuffleOnBoardOnly ||
      // 棋盘上不得有常驻控件（提示关闭按钮随提示出现，已单独放行）
      !Array.isArray(r.boardBlockers) ||
      r.boardBlockers.length > 0 ||
      r.tabClipped ||
      r.overflowCount > 0
    )
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
