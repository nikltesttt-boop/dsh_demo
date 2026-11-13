import SnakeGame from './snake/SnakeGame'

const highlights = [
  {
    title: 'Vite 构建',
    description: '基于 Vite 7 的开发服务器与生产构建，启动快、配置少。',
  },
  {
    title: 'React 19',
    description: '使用 React 19 + TypeScript 编写页面组件，类型检查随构建一起运行。',
  },
  {
    title: '贪吃蛇游戏',
    description: '页面内置可直接上手的网页版贪吃蛇：方向键 / WASD 操作，得分实时统计。',
  },
]

export function App() {
  return (
    <div className="page">
      <header className="hero">
        <p className="badge">Web 项目框架</p>
        <h1>贪吃蛇</h1>
        <p className="subtitle">
          网页版贪吃蛇：方向键或 WASD 控制方向，吃到食物即可得分，速度会随得分逐渐加快。
        </p>
      </header>

      <main>
        <SnakeGame />

        <section className="cards" aria-label="项目能力">
          {highlights.map((item) => (
            <article className="card" key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </article>
          ))}
        </section>

        <section className="quickstart" aria-label="快速开始">
          <h2>快速开始</h2>
          <ol>
            <li>
              安装依赖：<code>npm install</code>
            </li>
            <li>
              启动开发服务器：<code>npm run dev</code>
            </li>
            <li>
              构建生产版本：<code>npm run build</code>
            </li>
          </ol>
        </section>
      </main>

      <footer className="footer">
        <p>dsh_demo · 由自动化代理搭建的项目框架</p>
      </footer>
    </div>
  )
}

export default App
