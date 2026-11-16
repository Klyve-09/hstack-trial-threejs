import { describe, expect, it } from 'vitest'
import { initialState, step, SPEED, BOUND } from './motion'
import { createLoop, FIXED_STEP } from './loop'
import { createReplay, parseReplay, createPlayback, setAction } from './replay'

describe('fixed-step drift (position tolerance: 1e-9 units)', () => {
  it('moves speed * N * dt', () => {
    const state = initialState()
    for (let i = 0; i < 60; i++) step(state, new Set(), FIXED_STEP)
    expect(state.position.x).toBeCloseTo(SPEED * 60 * FIXED_STEP, 9)
    expect(state.position.z).toBeCloseTo(0, 9)
  })
  it('has the same result at 60 Hz, 144 Hz and irregular frame times', () => {
    const run = (times: number[]) => {
      const state = initialState()
      const loop = createLoop(() => step(state, new Set(), FIXED_STEP))
      loop.tick(0)
      for (const time of times) loop.tick(time)
      expect(loop.frame).toBe(120)
      return state.position
    }
    const regular = (hz: number) => Array.from({ length: hz * 2 }, (_, i) => (i + 1) / hz)
    const reference = run(regular(60))
    for (const times of [regular(144), [0.013, 0.21, 0.3, ...Array.from({ length: 17 }, (_, i) => 0.4 + i / 10)]]) {
      const result = run(times)
      expect(result.x).toBeCloseTo(reference.x, 9)
      expect(result.z).toBeCloseTo(reference.z, 9)
    }
  })
  it('clamps gaps and resets the clock on resume', () => {
    const loop = createLoop(() => {})
    loop.tick(0); loop.tick(20)
    expect(loop.frame).toBe(15)
    loop.resetClock(); loop.tick(100)
    expect(loop.frame).toBe(15)
    loop.tick(100 + FIXED_STEP)
    expect(loop.frame).toBe(16)
  })
  it('changes direction through actions and bounces inside bounds', () => {
    const state = initialState()
    step(state, new Set(['up']), FIXED_STEP)
    expect(state.position.z).toBeCloseTo(-SPEED * FIXED_STEP, 9)
    expect(state.position.x).toBeCloseTo(0, 9)
    const bounce = initialState()
    bounce.position.x = BOUND - SPEED * FIXED_STEP / 2
    step(bounce, new Set(), FIXED_STEP)
    expect(bounce.position.x).toBeCloseTo(BOUND - SPEED * FIXED_STEP / 2, 9)
    expect(bounce.direction.x).toBe(-1)
    for (let i = 0; i < 3000; i++) {
      step(state, new Set(['right']), FIXED_STEP)
      expect(Math.abs(state.position.x)).toBeLessThanOrEqual(BOUND)
      expect(Math.abs(state.position.z)).toBeLessThanOrEqual(BOUND)
    }
  })
})

it('records and replays identical per-frame positions through the same deterministic step path', () => {
  const file = createReplay(640, 480)
  const state = initialState()
  const held = new Set<import('./input').Action>()
  const positions = [{ ...state.position }]
  for (let frame = 0; frame < 180; frame++) {
    if (frame === 20) setAction(held, 'down', true, frame, file)
    if (frame === 90) setAction(held, 'down', false, frame, file)
    step(state, held, FIXED_STEP)
    positions.push({ ...state.position })
  }
  file.endFrame = 180
  const replay = createPlayback(parseReplay(JSON.stringify(file)))
  expect(replay.state.position.x).toBeCloseTo(positions[0].x, 9)
  expect(replay.state.position.z).toBeCloseTo(positions[0].z, 9)
  for (let frame = 1; frame <= file.endFrame; frame++) {
    replay.advance()
    expect(replay.state.position.x).toBeCloseTo(positions[frame].x, 9)
    expect(replay.state.position.z).toBeCloseTo(positions[frame].z, 9)
  }
  expect(replay.done).toBe(true)
})

it('rejects malformed replay files', () => {
  const valid = { ...createReplay(640, 480), endFrame: 60 }
  expect(parseReplay(JSON.stringify(valid))).toEqual(valid)
  for (const change of [{ version: 2 }, { scene: 'other' }, { fixedStep: 0 }, { resolution: { width: -1, height: 2 } }, { inputs: [{ frame: -1, action: 'left', pressed: true }] }, { inputs: [{ frame: 0, action: 'ArrowLeft', pressed: true }] }, { inputs: [{ frame: 0, action: 'left', pressed: 1 }] }, { captureFrames: [61] }, { endFrame: 1801 }, { captureFrames: [20, 10] }, { inputs: [{ frame: 20, action: 'up', pressed: true }, { frame: 10, action: 'up', pressed: false }] }, { inputs: null }]) {
    expect(() => parseReplay(JSON.stringify({ ...valid, ...change }))).toThrow()
  }
  expect(() => parseReplay('{')).toThrow()
})
