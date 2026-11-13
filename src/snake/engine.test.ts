/**
 * 贪吃蛇核心逻辑的单元测试。
 *
 * 直接运行：node --test src/snake/engine.test.ts
 * 无需额外测试框架，Node 24 可以直接执行 TypeScript。
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BASE_TICK_MS,
  INITIAL_LENGTH,
  MIN_TICK_MS,
  POINTS_PER_FOOD,
  createGame,
  isOpposite,
  pickFood,
  pointsEqual,
  queueDirection,
  speedLevel,
  startGame,
  step,
  tickInterval,
  togglePause,
  type GameState,
  type Point,
} from './engine.ts'

/** 构造一个测试用的小棋盘，固定随机源让食物位置可预测。 */
function game(overrides: Partial<GameState> = {}): GameState {
  const base = createGame({ cols: 8, rows: 6, rng: () => 0 })
  return { ...base, ...overrides }
}

test('createGame 生成居中的蛇和合法的食物', () => {
  const state = createGame({ cols: 20, rows: 20, rng: () => 0.5 })
  assert.equal(state.snake.length, INITIAL_LENGTH)
  assert.equal(state.status, 'idle')
  assert.equal(state.score, 0)
  assert.equal(state.direction, 'right')
  const head = state.snake[0]
  for (const segment of state.snake) {
    assert.ok(segment.x >= 0 && segment.x < state.cols)
    assert.ok(segment.y >= 0 && segment.y < state.rows)
    assert.ok(!pointsEqual(segment, state.food), '食物不能出现在蛇身上')
  }
  assert.ok(state.snake.every((segment) => segment.y === head.y), '初始蛇身应水平排列')
})

test('startGame 只从 idle 进入 running', () => {
  const started = startGame(game())
  assert.equal(started.status, 'running')
  assert.equal(startGame(started).status, 'running')
  assert.equal(startGame({ ...started, status: 'over' }).status, 'over')
})

test('togglePause 在 running 与 paused 之间切换', () => {
  const running = { ...game(), status: 'running' } as GameState
  assert.equal(togglePause(running).status, 'paused')
  assert.equal(togglePause(togglePause(running)).status, 'running')
  assert.equal(togglePause({ ...running, status: 'over' }).status, 'over')
})

test('只有 running 状态会移动', () => {
  const idle = game()
  assert.deepEqual(step(idle).snake, idle.snake)
  const over = { ...idle, status: 'over' } as GameState
  assert.deepEqual(step(over).snake, over.snake)
})

test('蛇沿当前方向前进并保持长度', () => {
  const running = { ...game(), status: 'running' } as GameState
  const next = step(running)
  const head = running.snake[0]
  assert.deepEqual(next.snake[0], { x: head.x + 1, y: head.y })
  assert.equal(next.snake.length, running.snake.length)
  assert.deepEqual(next.snake[next.snake.length - 1], running.snake[running.snake.length - 2])
})

test('吃到食物时长度和得分增加并生成新食物', () => {
  const running = { ...game(), status: 'running' } as GameState
  const head = running.snake[0]
  const withFood = { ...running, food: { x: head.x + 1, y: head.y } } as GameState
  const next = step(withFood, () => 0)
  assert.equal(next.snake.length, withFood.snake.length + 1)
  assert.equal(next.score, POINTS_PER_FOOD)
  assert.equal(next.foodEaten, 1)
  assert.ok(!pointsEqual(next.food, { x: head.x + 1, y: head.y }), '新食物不能停留在已被吃掉的位置')
  assert.ok(next.snake.some((segment) => pointsEqual(segment, next.food)) === false)
})

test('撞墙判定为结束', () => {
  const running = {
    ...game(),
    status: 'running',
    snake: [{ x: 7, y: 3 }, { x: 6, y: 3 }, { x: 5, y: 3 }],
    direction: 'right',
  } as GameState
  assert.equal(step(running).status, 'over')
})

test('撞到自己判定为结束', () => {
  const snake: Point[] = [
    { x: 3, y: 1 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 4, y: 1 },
    { x: 5, y: 1 },
  ]
  const running = {
    ...game(),
    status: 'running',
    snake,
    direction: 'right',
  } as GameState
  const next = step(running)
  assert.equal(next.status, 'over')
  assert.deepEqual(next.snake, running.snake, '结束时蛇身应保持不变')
})

test('移入尾巴当前位置不会判定为撞到自己', () => {
  const snake: Point[] = [
    { x: 3, y: 3 },
    { x: 2, y: 3 },
    { x: 1, y: 3 },
    { x: 1, y: 4 },
  ]
  const running = {
    ...game(),
    status: 'running',
    snake,
    direction: 'down',
  } as GameState
  const next = step(running)
  assert.equal(next.status, 'running')
  assert.deepEqual(next.snake[0], { x: 3, y: 4 })
})

test('queueDirection 拒绝反向和重复输入', () => {
  const running = { ...game(), status: 'running' } as GameState
  assert.equal(queueDirection(running, 'left').queuedDirections.length, 0, '不能反向')
  assert.equal(queueDirection(running, 'right').queuedDirections.length, 0, '不能重复')
  const turned = queueDirection(running, 'up')
  assert.deepEqual(turned.queuedDirections, ['up'])
  assert.equal(queueDirection(turned, 'down').queuedDirections.length, 1, '不能相对排队方向反向')
  assert.deepEqual(queueDirection(turned, 'left').queuedDirections, ['up', 'left'])
})

test('排队方向按顺序每步消费一个', () => {
  let state = { ...game(), status: 'running' } as GameState
  state = queueDirection(state, 'up')
  state = queueDirection(state, 'left')
  const first = step(state)
  assert.deepEqual(first.snake[0], { x: state.snake[0].x, y: state.snake[0].y - 1 })
  assert.deepEqual(first.queuedDirections, ['left'])
  const second = step(first)
  assert.deepEqual(second.snake[0], { x: first.snake[0].x - 1, y: first.snake[0].y })
  assert.deepEqual(second.queuedDirections, [])
})

test('idle 状态下的方向输入直接生效', () => {
  const idle = game()
  const turned = queueDirection(idle, 'up')
  assert.equal(turned.direction, 'up')
  assert.deepEqual(turned.queuedDirections, [])
})

test('结束状态下忽略方向输入', () => {
  const over = { ...game(), status: 'over' } as GameState
  assert.equal(queueDirection(over, 'up').direction, over.direction)
})

test('isOpposite 正确判断相反方向', () => {
  assert.equal(isOpposite('left', 'right'), true)
  assert.equal(isOpposite('up', 'down'), true)
  assert.equal(isOpposite('up', 'left'), false)
  assert.equal(isOpposite('right', 'right'), false)
})

test('tickInterval 随得分加快并保持下限', () => {
  assert.equal(tickInterval(0), BASE_TICK_MS)
  assert.ok(tickInterval(5) < BASE_TICK_MS)
  assert.equal(tickInterval(1000), MIN_TICK_MS)
})

test('speedLevel 随速度提高而增大', () => {
  assert.equal(speedLevel(0), 1)
  assert.ok(speedLevel(20) > speedLevel(0))
})

test('pickFood 在蛇占满棋盘时返回 null', () => {
  const full: Point[] = []
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      full.push({ x, y })
    }
  }
  assert.equal(pickFood(3, 3, full, () => 0), null)
})

test('pickFood 只返回空格子', () => {
  const snake: Point[] = [{ x: 1, y: 1 }, { x: 1, y: 2 }]
  for (let i = 0; i < 50; i += 1) {
    const rng = () => i / 50
    const point = pickFood(4, 4, snake, rng)
    assert.ok(point)
    const placed: Point = point
    assert.ok(!snake.some((segment) => pointsEqual(segment, placed)))
  }
})
