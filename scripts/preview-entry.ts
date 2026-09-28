/**
 * 浏览器预览入口（仅开发期使用，不参与正式构建）
 *
 * 与 src/main.ts 的唯一区别：挂载后直接进入指定关卡，
 * 便于在浏览器里截图核对战斗展示区 / 宝石区 / 技能区的真实渲染效果。
 *
 * URL 参数：
 *   ?level=N      直接进入第 N 关（默认 2）
 *   ?tab=skill    信息区切到「技能」页
 *   ?detail=gem   自动展开第一张宝石详情
 *   ?detail=skill 自动展开第一个技能详情
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '../src/App.vue'
import { useGameStore } from '../src/stores/game'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

const store = useGameStore()
const params = new URLSearchParams(location.search)

const rawLevel = Number(params.get('level') ?? 2)
const level = Number.isFinite(rawLevel) && rawLevel >= 1 ? Math.floor(rawLevel) : 2
store.startLevel(level)

const tab = params.get('tab')
if (tab === 'skill' || tab === 'gem') store.setBottomTab(tab)

// 详情浮层属于组件内部状态，用一次真实点击把它打开，保证截到的是真实交互结果
const detail = params.get('detail')
if (detail === 'gem' || detail === 'skill') {
  const selector = detail === 'gem' ? '.gem-card' : '.skill-card'
  window.setTimeout(() => document.querySelector<HTMLElement>(selector)?.click(), 700)
}
