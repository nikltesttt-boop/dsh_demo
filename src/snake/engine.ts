/**
 * 贪吃蛇游戏的纯逻辑实现。
 *
 * 这里不依赖 React 或浏览器 API，所有状态变更都由纯函数返回新的状态，
 * 方便单独测试核心规则（移动、进食、碰撞、计分）。
 */

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Point {
  x: number
  y: number
}

export type GameStatus = 'idle' | 'running' | 'paused' | 'over' | 'won'

export interface GameState {
  /** 横向格子数 */
  cols: number
  /** 纵向格子数 */
  rows: number
  /** 蛇身坐标，蛇头在第一位 */
  snake: Point[]
  /** 食物坐标 */
  food: Point
  /** 当前移动方向 */
  direction: Direction
  /** 玩家连续按键时排队等待生效的方向（每步最多消费一个） */
  queuedDirections: Direction[]
  /** 当前得分 */
  score: number
  /** 已吃到的食物数量，用于计算速度等级 */
  foodEaten: number
  status: GameStatus
}

export type RandomSource = () => number

export const DEFAULT_COLS = 20
export const DEFAULT_ROWS = 20
export const POINTS_PER_FOOD = 10
/** 初始每步间隔（毫秒） */
export const BASE_TICK_MS = 150
/** 速度上限：每步最短间隔（毫秒） */
export const MIN_TICK_MS = 70
/** 每吃到一个食物减少的间隔（毫秒） */
export const TICK_STEP_MS = 4
/** 蛇的初始长度 */
export const INITIAL_LENGTH = 3

const VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export function isOpposite(a: Direction, b: Direction): boolean {
  return VECTORS[a].x === -VECTORS[b].x && VECTORS[a].y === -VECTORS[b].y
}

export function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}

/** 根据已吃食物数量计算每步间隔，速度随得分提高并设有下限。 */
export function tickInterval(foodEaten: number): number {
  return Math.max(MIN_TICK_MS, BASE_TICK_MS - foodEaten * TICK_STEP_MS)
}

/** 速度等级（从 1 开始），仅用于界面展示。 */
export function speedLevel(foodEaten: number): number {
  return Math.floor((BASE_TICK_MS - tickInterval(foodEaten)) / 20) + 1
}

function cellKey(point: Point, cols: number): number {
  return point.y * cols + point.x
}

/**
 * 在所有空格中随机挑一个位置放置食物；棋盘被蛇占满时返回 null。
 * 使用传入的随机源，便于测试时得到确定结果。
 */
export function pickFood(
  cols: number,
  rows: number,
  snake: Point[],
  rng: RandomSource,
): Point | null {
  const occupied = new Set(snake.map((segment) => cellKey(segment, cols)))
  const free: Point[] = []
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!occupied.has(cellKey({ x, y }, cols))) {
        free.push({ x, y })
      }
    }
  }
  if (free.length === 0) {
    return null
  }
  const index = Math.min(free.length - 1, Math.floor(rng() * free.length))
  return free[index]
}

export interface CreateGameOptions {
  cols?: number
  rows?: number
  rng?: RandomSource
}

/** 创建一局处于 idle 状态的新游戏。 */
export function createGame(options: CreateGameOptions = {}): GameState {
  const cols = options.cols ?? DEFAULT_COLS
  const rows = options.rows ?? DEFAULT_ROWS
  const rng = options.rng ?? Math.random

  const headY = Math.floor(rows / 2)
  const headX = Math.min(cols - 1, Math.max(INITIAL_LENGTH - 1, Math.floor(cols / 2)))
  const snake: Point[] = []
  for (let i = 0; i < INITIAL_LENGTH; i += 1) {
    snake.push({ x: headX - i, y: headY })
  }

  return {
    cols,
    rows,
    snake,
    food: pickFood(cols, rows, snake, rng) ?? { x: -1, y: -1 },
    direction: 'right',
    queuedDirections: [],
    score: 0,
    foodEaten: 0,
    status: 'idle',
  }
}

/** 开始游戏：idle 状态下进入运行，其它状态保持不变。 */
export function startGame(state: GameState): GameState {
  if (state.status !== 'idle') {
    return state
  }
  return { ...state, status: 'running' }
}

/** 在运行与暂停之间切换；结束状态下不做任何事。 */
export function togglePause(state: GameState): GameState {
  if (state.status === 'running') {
    return { ...state, status: 'paused' }
  }
  if (state.status === 'paused') {
    return { ...state, status: 'running' }
  }
  return state
}

/**
 * 记录玩家输入的方向。与当前方向相反或重复的输入会被忽略，
 * 连续输入不同方向时按顺序排队，避免一帧内的误操作导致自杀。
 */
export function queueDirection(state: GameState, direction: Direction): GameState {
  if (state.status === 'over' || state.status === 'won') {
    return state
  }
  const last = state.queuedDirections[state.queuedDirections.length - 1] ?? state.direction
  if (direction === last || isOpposite(direction, last)) {
    return state
  }
  if (state.status === 'idle') {
    // 尚未开始移动：第一个方向直接生效，但也允许继续排队。
    return { ...state, direction, queuedDirections: [] }
  }
  const queuedDirections = [...state.queuedDirections, direction].slice(-2)
  return { ...state, queuedDirections }
}

/**
 * 推进一个时间步。只有 running 状态会真正移动蛇。
 * 撞墙或撞到自己时状态变为 over。
 */
export function step(state: GameState, rng: RandomSource = Math.random): GameState {
  if (state.status !== 'running') {
    return state
  }

  const [nextQueued, ...restQueued] = state.queuedDirections
  const direction = nextQueued ?? state.direction
  const vector = VECTORS[direction]
  const head = state.snake[0]
  const nextHead: Point = { x: head.x + vector.x, y: head.y + vector.y }

  const hitWall =
    nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= state.cols || nextHead.y >= state.rows
  if (hitWall) {
    return { ...state, direction, queuedDirections: restQueued, status: 'over' }
  }

  const eating = pointsEqual(nextHead, state.food)
  // 不吃食物时尾巴会移开，因此移动到当前尾巴位置是安全的。
  const body = eating ? state.snake : state.snake.slice(0, -1)
  const hitSelf = body.some((segment) => pointsEqual(segment, nextHead))
  if (hitSelf) {
    return { ...state, direction, queuedDirections: restQueued, status: 'over' }
  }

  const snake = eating ? [nextHead, ...state.snake] : [nextHead, ...state.snake.slice(0, -1)]

  if (!eating) {
    return { ...state, snake, direction, queuedDirections: restQueued }
  }

  const food = pickFood(state.cols, state.rows, snake, rng)
  const foodEaten = state.foodEaten + 1
  return {
    ...state,
    snake,
    direction,
    queuedDirections: restQueued,
    food: food ?? nextHead,
    foodEaten,
    score: state.score + POINTS_PER_FOOD,
    status: food === null ? 'won' : 'running',
  }
}
