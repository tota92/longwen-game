# 龙纹消消棋 — 项目长期约定

## 技术栈与环境
- Vue 3.4 + TypeScript + Vite 5 + Pinia 2，竖屏 H5（三消 + 英雄技能 + 关卡战斗 + 轻 Roguelite）。
- **本机沙箱会拦截 esbuild 原生二进制**：`npm run build`（vite）与 `npm test`（tsx）都会报
  `TransformError: The service was stopped`。开发期用自建通道代替：
  - `npm run check:build` — rollup + @vue/compiler-sfc 打包并跑冒烟测试
  - `npm run preview:build` — 生成 `.preview/`，配合 `python -m http.server 8123`
  - `npm run check:visual` — 8 视口 × 2 Tab 布局校验（需 8123 在跑）
  - `npm run check:battle` — 真实指针事件驱动的战斗反馈验收
  - `npx vue-tsc --noEmit` — 类型检查（不受 esbuild 影响，正常可用）

## 数值锚点（改数值前必读）
- **1 回合标准输出 = 10 伤害**。所有伤害调整必须回到这个锚点。
- 宝石伤害 `calcWaveDamage` 只吃：关卡 `gemPower`、主战同元素加成、连击、遗物。
  **宝石熟练度等级（Lv1~5）纯展示，不参与伤害结算**。
- 技能等级 = 1 + 强化该技能的遗物数（`SKILL_LEVEL_MAX = 1 + MAX_RELICS`），不新增养成轴。
- 技能无冷却（由四消/五消技能石即时触发），UI 用「触发条件 + 棋盘技能石存量」表达可用状态。

## 布局约定（改界面必读）
- 棋盘尺寸靠 `.board-wrap { container-type: size }` + `.board { width: min(100%, 94vw, 100cqh) }`，
  **不要**退回 `100dvh - 魔法常数` 的写法（安全区/地址栏/横屏都会对不准）。
- 布局常量集中在 `BattleView.vue` 的 `.battle-view` 变量里：
  `--bottom-total: 128px`（技能页不被裁切的下限）、`--tip-h: 58px`（提示条预留带）。
- 战斗舞台用 `align-items: start`（两侧立绘框等高 → 名字/血条齐平），`.center-col` 单独 `align-self: end`。
- 手机横屏由 `App.vue` 的 `.rotate-guard` 守卫（`@media (orientation: landscape) and (max-height: 520px)`）。

## Vue SFC 编译注意
- **Vue 3.4 的 `compileTemplate` 不再支持 `scopeId` 选项**。自建构建里注入 scoped 属性必须用
  `compilerOptions.nodeTransforms` 手动 push `data-v-xxx`。
- **`.panel` 带 `backdrop-filter`，会给 `position: fixed` 后代创建包含块**。
  全屏浮层一律 `<Teleport to="body">`，否则会被困在父容器里。

## 代码风格
- 注释写「为什么这么设计」，不写「这行在做什么」。数值常量必须注明来源或推导。
- 组件消费 CSS 变量（`:root` 设计令牌），不硬编码颜色/间距。
