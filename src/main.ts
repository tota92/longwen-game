/**
 * 应用入口：创建 Vue 实例，挂载 Pinia，注册全局错误处理
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { audio } from '@/utils/audio'

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
