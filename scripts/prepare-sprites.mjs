/**
 * 角色立绘后处理脚本
 *
 * 将 AI 生成的原始立绘（1024×1536，含大量透明留白）处理为可直接上屏的资源：
 *   1. trim   —— 按 alpha 通道裁掉四周透明留白，让立绘紧贴内容边界，
 *                上屏时宽高比才是角色真实比例，不会被留白挤压
 *   2. resize —— 收敛到 640px 高（展示区约 140px，2x/3x 屏下仍有余量）
 *   3. 规范化命名 —— 输出为 hero_*.png / enemy_*.png，与配置表 iconId 对齐
 *
 * 用法：node scripts/prepare-sprites.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const DIR = path.resolve('public/sprites')

/** 关键词 → 规范文件名（原始文件名含中文描述，按关键词匹配更稳） */
const RULES = [
  ['炎龙', 'hero_flame_knight.png'],
  ['女性冰霜', 'hero_frost_witch.png'],
  ['森林德鲁', 'hero_forest_druid.png'],
  ['凝胶史莱', 'enemy_slime.png'],
  ['熔岩火焰蜥蜴', 'enemy_fire_lizard.png'],
  ['冰霜幽灵', 'enemy_frost_ghost.png'],
  ['年幼的小龙', 'enemy_dragon_whelp.png'],
  ['远古巨龙', 'enemy_ancient_dragon.png']
]

/** 目标高度（px）：展示区立绘约 140px，2x 屏需要 280px，640 留足余量 */
const TARGET_H = 640

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.png') && !/^(hero|enemy)_/.test(f))

if (files.length === 0) {
  console.log('[sprites] 没有待处理的原始立绘，跳过')
  process.exit(0)
}

let done = 0
for (const [keyword, outName] of RULES) {
  const src = files.find((f) => f.includes(keyword))
  if (!src) {
    console.warn(`[sprites] 未找到匹配「${keyword}」的原始文件`)
    continue
  }

  const out = await sharp(path.join(DIR, src))
    .trim({ threshold: 1 })
    .resize({ height: TARGET_H, fit: 'inside', withoutEnlargement: false })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(path.join(DIR, outName))

  const meta = await sharp(path.join(DIR, outName)).metadata()
  console.log(
    `[sprites] ${outName.padEnd(28)} ${out.width}×${out.height}  alpha=${meta.hasAlpha}  ${(out.size / 1024).toFixed(0)}KB`
  )
  done++
}

// 清理原始文件，避免打包进 public 白白增大体积
for (const f of files) fs.unlinkSync(path.join(DIR, f))

const total = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.png'))
  .reduce((s, f) => s + fs.statSync(path.join(DIR, f)).size, 0)
console.log(`[sprites] 完成 ${done} 张，目录总计 ${(total / 1024 / 1024).toFixed(2)}MB`)
