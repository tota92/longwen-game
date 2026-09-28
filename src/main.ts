/**
 * 应用入口：创建 Vue 实例，挂载 Pinia，注册全局错误处理
 *
 * 全局样式按功能归档于 src/assets/style/，按级联顺序引入：
 *   tokens → base → components → effects → guards
 * 组件私有样式仍保留在各 SFC 的 scoped 块中（Vue 最佳实践）。
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { audio } from '@/utils/audio'

import '@/assets/style/tokens.css'
import '@/assets/style/base.css'
import '@/assets/style/components.css'
import '@/assets/style/effects.css'
import '@/assets/style/guards.css'

const app = createApp(App)
app.use(createPinia())

// 全局错误处理：单机 H5 游戏策略——记录但不阻塞流程，避免白屏
app.config.errorHandler = (err, _instance, info) => {
  console.error('[global-error]', info, err)
}

// 首次用户交互激活 Web Audio（移动端浏览器策略要求）
window.addEventListener(
  'pointerdown',
  () => audio.unlock(),
  { once: true, capture: true }
)

app.mount('#app')
