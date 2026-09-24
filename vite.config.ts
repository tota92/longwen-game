import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Vite 配置：Vue3 SFC + 路径别名 + 移动端 H5 优化
export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true, // 允许局域网真机调试
    port: 5173
  },
  build: {
    target: 'es2015', // 兼容主流移动浏览器
    cssCodeSplit: true,
    minify: 'esbuild'
  }
})
