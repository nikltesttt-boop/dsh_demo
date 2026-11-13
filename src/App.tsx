import { useState } from 'react'

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
    title: '首页可查看',
    description: 'npm run dev 后打开首页即可看到当前页面，作为后续功能的起点。',
  },
]

export function App() {
  const [currentTime, setCurrentTime] = useState<string | null>(null)

  const showCurrentTime = () => {
    setCurrentTime(new Date().toLocaleString())
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="badge">Web 项目框架</p>
        <h1>DSH Demo</h1>
        <p className="subtitle">
          一个新的前端项目脚手架已经跑起来，这里就是首页。
        </p>
        <div className="time-control">
          <button type="button" className="time-button" onClick={showCurrentTime}>
            显示当前时间
          </button>
          <p className="time-display" role="status" aria-live="polite">
            {currentTime === null ? '点击按钮查看当前时间' : `当前时间：${currentTime}`}
          </p>
        </div>
      </header>

      <main>
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
