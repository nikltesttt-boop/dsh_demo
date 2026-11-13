# dsh_demo

Demo repository for the DeepSeek superagent.
Open an issue and comment `@nikltesttt-boop <request>` to give the agent a task.

## Web 项目框架

仓库包含一个基于 [Vite](https://vite.dev/) + React 19 + TypeScript 的 Web 前端框架，
启动开发服务器后打开首页即可看到项目页面。

### 环境要求

- Node.js 20.19+ 或 22.12+（当前使用 Node 24）
- `npm test` 直接运行 TypeScript 测试文件，需要 Node.js 22.18+ 或 24（Node 20 可运行 `npm run dev` / `npm run build`，但无法执行该测试命令）

### 常用命令

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器，默认 http://localhost:5173
npm run build    # 类型检查 + 生产构建，输出到 dist/
npm run preview  # 预览生产构建，默认 http://localhost:4173
npm run typecheck
npm test         # 运行贪吃蛇核心逻辑的单元测试
```

### 目录结构

```
├── index.html          # 页面入口
├── src/
│   ├── main.tsx        # 应用挂载入口
│   ├── App.tsx         # 首页组件
│   ├── index.css       # 全局样式
│   └── snake/          # 贪吃蛇游戏
│       ├── engine.ts       # 纯逻辑：移动、进食、碰撞、计分
│       ├── engine.test.ts  # 核心逻辑单元测试
│       ├── SnakeGame.tsx   # 画布渲染与交互组件
│       └── snake.css       # 游戏样式
├── vite.config.ts
└── tsconfig.json
```

## 贪吃蛇游戏

打开首页即可游玩：

- 方向键或 `W` `A` `S` `D` 控制方向，空格键开始 / 暂停。
- 吃到食物得 10 分，蛇身变长，移动速度随得分逐渐加快。
- 撞墙或撞到自身游戏结束，最高分保存在浏览器本地。
- 触屏设备可以使用页面上的方向按钮操作。

