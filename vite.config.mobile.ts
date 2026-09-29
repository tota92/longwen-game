/**
 * 移动端单文件（Single-File HTML）构建配置 —— `npm run build-mobile`
 *
 * 与常规 vite.config.ts 的区别：
 *   - publicDir 关闭：public/ 下的图标与立绘不复制为独立文件，
 *     改由 mobile:asset-inliner 扫描为 Data URI 内联表（见 scripts/mobile/）；
 *   - 产物格式 IIFE + classic script：内联后不依赖 ES Module，
 *     微信 X5 / 旧 WebView 等环境同样可运行；
 *   - JS / CSS 全部内联进 HTML，最终只产出 release/<文件名>.html 一个文件。
 *
 * 输出目录与文件名通过环境变量由 scripts/build-mobile.mjs 注入
 * （MOBILE_OUT_DIR / MOBILE_FILE_NAME / MOBILE_NO_MINIFY）。
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { assetInliner } from './scripts/mobile/asset-inliner'
import { mobilePwa } from './scripts/mobile/pwa'
import { singleFile } from './scripts/mobile/single-file'

/** 相对项目根目录的绝对路径 */
const resolvePath = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    mobilePwa({
      name: '龙纹消消棋',
      themeColor: '#1a1025',
      description: '三消 + 英雄技能 + 关卡战斗的 H5 竖屏游戏，单文件离线即玩',
      emblemFile: resolvePath('./public/icons/ui/ui_emblem.png')
    }),
    assetInliner({ publicDir: resolvePath('./public') }),
    singleFile({ fileName: process.env.MOBILE_FILE_NAME || 'longwen-match3.html' })
  ],
  base: './',
  // 单文件产物不携带独立资源文件：public/ 由 assetInliner 全量转为 Data URI
  publicDir: false,
  resolve: {
    alias: {
      '@': resolvePath('./src')
    }
  },
  build: {
    outDir: process.env.MOBILE_OUT_DIR || 'release',
    emptyOutDir: true,
    target: 'es2015', // 兼容主流移动浏览器
    minify: process.env.MOBILE_NO_MINIFY ? false : 'esbuild',
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 512 * 1024 * 1024, // 兜底：任何被 import 的资源同样转 Data URI
    reportCompressedSize: false,
    chunkSizeWarningLimit: 4096, // 单文件包体天然偏大，无需 chunk 警告
    rollupOptions: {
      output: {
        // 单文件场景没有模块加载环境：IIFE 一次性执行完毕，兼容面最广
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
})
