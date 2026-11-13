# dsh_demo

Demo repository for the DeepSeek superagent.
Open an issue and comment `@nikltesttt-boop <request>` to give the agent a task.

## Web 项目框架

仓库包含一个基于 [Vite](https://vite.dev/) + React 19 + TypeScript 的 Web 前端框架，
启动开发服务器后打开首页即可看到项目页面。

### 环境要求

- Node.js 20.19+ 或 22.12+（当前使用 Node 24）

### 常用命令

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器，默认 http://localhost:5173
npm run build    # 类型检查 + 生产构建，输出到 dist/
npm run preview  # 预览生产构建，默认 http://localhost:4173
npm run typecheck
```

### 目录结构

```
├── index.html          # 页面入口
├── src/
│   ├── main.tsx        # 应用挂载入口
│   ├── App.tsx         # 首页组件
│   └── index.css       # 全局样式
├── vite.config.ts
└── tsconfig.json
```
