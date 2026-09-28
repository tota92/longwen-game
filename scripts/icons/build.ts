/**
 * 图标构建脚本
 *
 * 流程：SVG（256 逻辑尺寸）→ 512 渲染 → 256 降采样（lanczos3）→ 带透明通道 PNG
 * 产物（按用途分组归档到子目录）：
 *   public/icons/<分组>/<id>.png  256×256 透明 PNG（运行时按 BASE_URL 引用）
 *   public/icons/manifest.json    清单（含分组、用途、相对路径，供文档与校验使用）
 *   src/config/iconIds.ts         自动生成的类型安全 ID 清单（全项目唯一事实来源）
 *   scripts/icons/_sheet.png      接触表（拼版预览，供视觉审查）
 *
 * 校验：尺寸必须为 256×256、必须含 alpha 通道、必须存在完全透明像素、单文件体积上限
 * 运行：npx tsx scripts/icons/build.ts
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CATALOG, GROUP_LABELS } from './catalog/index'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const OUT_DIR = path.join(ROOT, 'public/icons')
const SHEET_PATH = path.join(HERE, '_sheet.png')
const IDS_TS_PATH = path.join(ROOT, 'src/config/iconIds.ts')

/** 分组名 → 归档子目录（与 src/utils/icons.ts 的映射保持一致） */
const GROUP_DIRS: Record<string, string> = {
  element: 'elements',
  overlay: 'overlays',
  hero: 'heroes',
  skill: 'skills',
  relic: 'relics',
  enemy: 'enemies',
  status: 'status',
  node: 'nodes',
  ui: 'ui',
  result: 'results'
}

/** 单文件体积上限（KB）：256×256 透明 PNG 的合理范围 */
const MAX_KB = 80
/** 接触表列数 */
const SHEET_COLS = 8
const SHEET_CELL = 128
const SHEET_PAD = 14

interface BuiltIcon {
  id: string
  name: string
  group: string
  dir: string
  usage: string
  bytes: number
}

const errors: string[] = []
const built: BuiltIcon[] = []

async function renderIcon(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg))
    .resize(256, 256, { kernel: 'lanczos3', fit: 'fill' })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()
}

async function verifyPng(id: string, buf: Buffer): Promise<void> {
  const meta = await sharp(buf).metadata()
  if (meta.width !== 256 || meta.height !== 256) {
    errors.push(`${id}: 尺寸应为 256×256，实际 ${meta.width}×${meta.height}`)
  }
  if (!meta.hasAlpha) errors.push(`${id}: 缺少 alpha 通道`)
  const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let minAlpha = 255
  for (let i = 3; i < data.length; i += 4) if (data[i] < minAlpha) minAlpha = data[i]
  if (minAlpha > 0) errors.push(`${id}: 无完全透明像素（可能未正确留白边）`)
  const kb = buf.length / 1024
  if (kb > MAX_KB) errors.push(`${id}: 体积 ${kb.toFixed(1)}KB 超过 ${MAX_KB}KB 上限`)
}

/** 生成接触表：拼版预览便于一次性审查全系列风格一致性 */
async function buildSheet(): Promise<void> {
  const cols = SHEET_COLS
  const rows = Math.ceil(CATALOG.length / cols)
  const cell = SHEET_CELL + SHEET_PAD
  const width = cols * cell + SHEET_PAD
  const height = rows * cell + SHEET_PAD
  const composites: sharp.OverlayOptions[] = []

  for (let i = 0; i < CATALOG.length; i++) {
    const def = CATALOG[i]
    const png = await renderIcon(def.svg)
    // 棋盘/UI 类图标置于深色格上，检验在游戏底色中的可读性
    const checker =
      (Math.floor(i / cols) + (i % cols)) % 2 === 0
        ? { r: 26, g: 18, b: 41, alpha: 1 }
        : { r: 16, g: 10, b: 26, alpha: 1 }
    const thumb = await sharp(png).resize(SHEET_CELL, SHEET_CELL, { kernel: 'lanczos3' }).png().toBuffer()
    const tile = await sharp({
      create: {
        width: SHEET_CELL,
        height: SHEET_CELL,
        channels: 4,
        background: checker
      }
    })
      .composite([{ input: thumb, gravity: 'center' }])
      .png()
      .toBuffer()
    composites.push({
      input: tile,
      left: SHEET_PAD + (i % cols) * cell,
      top: SHEET_PAD + Math.floor(i / cols) * cell
    })
  }

  await sharp({
    create: { width, height, channels: 4, background: { r: 8, g: 5, b: 14, alpha: 1 } }
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(SHEET_PATH)
}

/** 生成类型安全的图标 ID 清单（供 src 引用，避免字符串拼写错误与清单漂移） */
async function writeIdRegistry(): Promise<void> {
  const byGroup = new Map<string, string[]>()
  for (const def of CATALOG) {
    if (!byGroup.has(def.group)) byGroup.set(def.group, [])
    byGroup.get(def.group)!.push(def.id)
  }
  const lines: string[] = [
    '/**',
    ' * 图标 ID 清单（自动生成，请勿手动修改）',
    ' * 生成脚本：scripts/icons/build.ts（图标源：scripts/icons/catalog/*）',
    ` * 共 ${CATALOG.length} 枚 256×256 透明 PNG，按用途归档于 public/icons/<分组>/ 子目录`,
    ' */',
    ''
  ]
  for (const [group, ids] of byGroup) {
    const label = GROUP_LABELS[group] ?? group
    lines.push(`/** ${label} */`)
    lines.push(`export const ${group.toUpperCase()}_ICON_IDS = [`)
    ids.forEach((id) => lines.push(`  '${id}',`))
    lines.push('] as const')
    lines.push('')
  }
  lines.push('/** 全部图标 ID 联合类型 */')
  lines.push(
    `export type IconId =\n  | ` +
      CATALOG.map((d) => `'${d.id}'`).join('\n  | ')
  )
  lines.push('')
  lines.push('/** 全部图标 ID（用于预加载与遍历） */')
  lines.push('export const ALL_ICON_IDS: IconId[] = [')
  lines.push(...CATALOG.map((d) => `  '${d.id}',`))
  lines.push(']')
  lines.push('')
  lines.push('/** 棋盘元素与技能石标记：需在进入战斗前预加载 */')
  lines.push(
    "export const BOARD_ICON_IDS: IconId[] = [...ELEMENT_ICON_IDS, ...OVERLAY_ICON_IDS]"
  )
  lines.push('')
  await writeFile(IDS_TS_PATH, lines.join('\n'))
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true })
  // 预创建全部分组子目录（即使某组暂为空也保持目录结构完整）
  await Promise.all(
    Object.values(GROUP_DIRS).map((dir) => mkdir(path.join(OUT_DIR, dir), { recursive: true }))
  )

  // 唯一性校验 + 分组目录校验
  const seen = new Set<string>()
  for (const def of CATALOG) {
    if (seen.has(def.id)) errors.push(`重复的图标 ID：${def.id}`)
    seen.add(def.id)
    if (!GROUP_DIRS[def.group]) errors.push(`未知分组「${def.group}」（图标 ${def.id}）：缺少归档子目录映射`)
  }

  for (const def of CATALOG) {
    const png = await renderIcon(def.svg)
    await verifyPng(def.id, png)
    const dir = GROUP_DIRS[def.group] ?? ''
    await writeFile(path.join(OUT_DIR, dir, `${def.id}.png`), png)
    built.push({
      id: def.id,
      name: def.name,
      group: def.group,
      dir,
      usage: def.usage,
      bytes: png.length
    })
  }

  await writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(
      {
        size: 256,
        format: 'png',
        alpha: true,
        style: '魔幻纹章风格：金质符文环 + 深紫底盘 + 元素光晕',
        count: built.length,
        /* 归档结构：icons/<用途子目录>/<id>.png，子目录见各条目的 dir 字段 */
        layout: 'grouped-subdirs',
        dirs: GROUP_DIRS,
        icons: built
      },
      null,
      2
    )
  )

  await buildSheet()
  await writeIdRegistry()

  const totalKb = built.reduce((s, b) => s + b.bytes, 0) / 1024
  const maxKb = Math.max(...built.map((b) => b.bytes)) / 1024
  console.log(`\n构建完成：${built.length} 枚图标`)
  console.log(`总体积：${totalKb.toFixed(1)}KB（平均 ${(totalKb / built.length).toFixed(1)}KB，最大 ${maxKb.toFixed(1)}KB）`)
  const byGroup = new Map<string, number>()
  for (const b of built) byGroup.set(b.group, (byGroup.get(b.group) ?? 0) + 1)
  console.log(
    '分组：' +
      [...byGroup.entries()].map(([g, n]) => `${GROUP_LABELS[g] ?? g}×${n}`).join('  ')
  )
  console.log(`产物目录：public/icons/<分组>/  接触表：scripts/icons/_sheet.png`)
  console.log(`类型清单：src/config/iconIds.ts`)

  if (errors.length > 0) {
    console.error(`\n校验失败 ${errors.length} 项：`)
    errors.forEach((e) => console.error(`  ✗ ${e}`))
    process.exit(1)
  }
  console.log('校验通过：尺寸 256×256 / alpha 通道 / 透明像素 / 体积上限\n')
}

await main()