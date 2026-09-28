/**
 * 关键图标细节复核：以原始 256 尺寸拼版，检查细节与材质在目标分辨率下的表现
 * 运行：npx tsx scripts/icons/inspect.ts [iconId ...]
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const ids = process.argv.slice(2)
const targets = ids.length > 0 ? ids : ['el_fire', 'el_light', 'hero_flame_knight', 'skill_flame_slash']

const CELL = 256
const PAD = 10
const cols = Math.min(targets.length, 4)
const rows = Math.ceil(targets.length / cols)

const composites: sharp.OverlayOptions[] = []
for (let i = 0; i < targets.length; i++) {
  const png = path.join(ROOT, 'public/icons', `${targets[i]}.png`)
  const tile = await sharp({
    create: { width: CELL, height: CELL, channels: 4, background: { r: 22, g: 14, b: 36, alpha: 1 } }
  })
    .composite([{ input: png, gravity: 'center' }])
    .png()
    .toBuffer()
  composites.push({
    input: tile,
    left: PAD + (i % cols) * (CELL + PAD),
    top: PAD + Math.floor(i / cols) * (CELL + PAD)
  })
}

const out = path.join(HERE, '_inspect.png')
await sharp({
  create: {
    width: cols * (CELL + PAD) + PAD,
    height: rows * (CELL + PAD) + PAD,
    channels: 4,
    background: { r: 10, g: 6, b: 16, alpha: 1 }
  }
})
  .composite(composites)
  .png()
  .toFile(out)
console.log(`已输出 ${out}（顺序：${targets.join(', ')}）`)