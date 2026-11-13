import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  createGame,
  queueDirection,
  speedLevel,
  startGame,
  step,
  tickInterval,
  togglePause,
  type Direction,
  type GameState,
} from './engine'
import './snake.css'

/** 每个格子的逻辑像素尺寸，画布会按显示宽度等比缩放。 */
const CELL = 20

const BEST_SCORE_KEY = 'snake.bestScore'

const DIRECTION_KEYS: Record<string, Direction> = {
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

const PALETTE = {
  board: '#0f172a',
  grid: 'rgba(148, 163, 184, 0.14)',
  head: '#4ade80',
  body: '#22c55e',
  bodyEdge: '#16a34a',
  food: '#f43f5e',
  foodHighlight: '#fda4af',
}

function readBestScore(): number {
  try {
    const stored = window.localStorage.getItem(BEST_SCORE_KEY)
    const value = stored === null ? Number.NaN : Number(stored)
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, size, size, radius)
  } else {
    ctx.rect(x, y, size, size)
  }
}

function drawBoard(ctx: CanvasRenderingContext2D, state: GameState) {
  const { cols, rows, snake, food } = state
  const width = cols * CELL
  const height = rows * CELL

  ctx.clearRect(0, 0, width, height)

  ctx.fillStyle = PALETTE.board
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = PALETTE.grid
  ctx.lineWidth = 1
  for (let x = 1; x < cols; x += 1) {
    ctx.beginPath()
    ctx.moveTo(x * CELL + 0.5, 0)
    ctx.lineTo(x * CELL + 0.5, height)
    ctx.stroke()
  }
  for (let y = 1; y < rows; y += 1) {
    ctx.beginPath()
    ctx.moveTo(0, y * CELL + 0.5)
    ctx.lineTo(width, y * CELL + 0.5)
    ctx.stroke()
  }

  if (food.x >= 0 && food.y >= 0) {
    const padding = CELL * 0.2
    ctx.fillStyle = PALETTE.food
    drawRoundedRect(ctx, food.x * CELL + padding, food.y * CELL + padding, CELL - padding * 2, CELL)
    ctx.fill()
    ctx.fillStyle = PALETTE.foodHighlight
    ctx.beginPath()
    ctx.arc(food.x * CELL + CELL * 0.38, food.y * CELL + CELL * 0.36, CELL * 0.1, 0, Math.PI * 2)
    ctx.fill()
  }

  snake.forEach((segment, index) => {
    const inset = index === 0 ? 1 : 1.5
    const size = CELL - inset * 2
    const x = segment.x * CELL + inset
    const y = segment.y * CELL + inset
    ctx.fillStyle = index === 0 ? PALETTE.head : PALETTE.body
    drawRoundedRect(ctx, x, y, size, index === 0 ? 6 : 5)
    ctx.fill()

    if (index > 0) {
      ctx.strokeStyle = PALETTE.bodyEdge
      ctx.lineWidth = 1
      drawRoundedRect(ctx, x + 0.5, y + 0.5, size - 1, 5)
      ctx.stroke()
    }
  })

  const head = snake[0]
  if (head) {
    ctx.fillStyle = PALETTE.board
    const offset = CELL * 0.3
    const radius = CELL * 0.09
    const eyes: Array<[number, number]> = [
      [head.x * CELL + offset, head.y * CELL + offset],
      [head.x * CELL + CELL - offset, head.y * CELL + offset],
    ]
    eyes.forEach(([cx, cy]) => {
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()
    })
  }
}

export function SnakeGame() {
  const [state, setState] = useState<GameState>(() => createGame())
  const [bestScore, setBestScore] = useState<number>(() => readBestScore())
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const interval = tickInterval(state.foodEaten)
  const level = speedLevel(state.foodEaten)

  useEffect(() => {
    if (state.status !== 'running') {
      return
    }
    const id = window.setInterval(() => {
      setState((previous) => step(previous))
    }, interval)
    return () => window.clearInterval(id)
  }, [state.status, interval])

  // 开发模式下把当前状态挂到 window，便于端到端脚本读取棋盘并驱动游戏。
  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as unknown as { __snakeGame?: GameState }).__snakeGame = state
    }
  }, [state])

  useEffect(() => {
    if (state.score <= bestScore) {
      return
    }
    setBestScore(state.score)
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(state.score))
    } catch {
      // 忽略隐私模式等场景下的存储失败，最高分只保留在内存中。
    }
  }, [state.score, bestScore])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    const dpr = window.devicePixelRatio || 1
    const width = state.cols * CELL
    const height = state.rows * CELL
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawBoard(ctx, state)
  }, [state])

  const changeDirection = useCallback((direction: Direction) => {
    setState((previous) => {
      const resumed = previous.status === 'paused' ? togglePause(previous) : previous
      const turned = queueDirection(resumed, direction)
      return resumed.status === 'idle' ? startGame(turned) : turned
    })
  }, [])

  const handlePrimaryAction = useCallback(() => {
    setState((previous) => {
      if (previous.status === 'over' || previous.status === 'won') {
        return startGame(createGame())
      }
      if (previous.status === 'idle') {
        return startGame(previous)
      }
      return togglePause(previous)
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return
      }
      const direction = DIRECTION_KEYS[event.key.toLowerCase()]
      if (direction) {
        event.preventDefault()
        changeDirection(direction)
        return
      }
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault()
        handlePrimaryAction()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [changeDirection, handlePrimaryAction])

  const overlay = useMemo(() => {
    switch (state.status) {
      case 'idle':
        return { title: '准备好了吗？', hint: '按方向键 / WASD 或点击“开始游戏”开始' }
      case 'paused':
        return { title: '已暂停', hint: '按空格或点击“继续”恢复游戏' }
      case 'over':
        return { title: '游戏结束', hint: `本局得分 ${state.score}，点击“再来一局”重试` }
      case 'won':
        return { title: '通关啦！', hint: `蛇填满了整个棋盘，得分 ${state.score}` }
      default:
        return null
    }
  }, [state.status, state.score])

  const primaryLabel =
    state.status === 'idle'
      ? '开始游戏'
      : state.status === 'running'
        ? '暂停'
        : state.status === 'paused'
          ? '继续'
          : '再来一局'

  return (
    <section className="snake" aria-label="贪吃蛇游戏">
      <div className="snake__stats">
        <div className="stat">
          <span className="stat__label">得分</span>
          <span className="stat__value" data-testid="score">
            {state.score}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">最高分</span>
          <span className="stat__value">{bestScore}</span>
        </div>
        <div className="stat">
          <span className="stat__label">速度</span>
          <span className="stat__value">Lv.{level}</span>
        </div>
      </div>

      <div className="snake__board">
        <canvas
          ref={canvasRef}
          className="snake__canvas"
          style={{ aspectRatio: `${state.cols} / ${state.rows}` }}
          role="img"
          aria-label={`贪吃蛇棋盘，蛇长 ${state.snake.length}，得分 ${state.score}`}
        />
        {overlay && (
          <div className="snake__overlay" data-testid="overlay">
            <p className="snake__overlay-title">{overlay.title}</p>
            <p className="snake__overlay-hint">{overlay.hint}</p>
          </div>
        )}
      </div>

      <div className="snake__actions">
        <button type="button" className="button button--primary" onClick={handlePrimaryAction}>
          {primaryLabel}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => setState(startGame(createGame()))}
          disabled={state.status === 'idle'}
        >
          重新开始
        </button>
      </div>

      <div className="snake__dpad" aria-label="方向控制">
        <button type="button" className="button dpad dpad--up" onClick={() => changeDirection('up')}>
          ↑
        </button>
        <button
          type="button"
          className="button dpad dpad--left"
          onClick={() => changeDirection('left')}
        >
          ←
        </button>
        <button
          type="button"
          className="button dpad dpad--down"
          onClick={() => changeDirection('down')}
        >
          ↓
        </button>
        <button
          type="button"
          className="button dpad dpad--right"
          onClick={() => changeDirection('right')}
        >
          →
        </button>
      </div>

      <p className="snake__help">
        方向键或 WASD 控制方向，空格键开始 / 暂停。每吃到一个食物得 10 分，速度会逐渐加快。
      </p>
    </section>
  )
}

export default SnakeGame
