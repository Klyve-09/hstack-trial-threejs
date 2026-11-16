import type { Action } from './input'

export const SPEED = 1.2
export const BOUND = 4
export interface DriftState {
  position: { x: number; z: number }
  direction: { x: number; z: number }
}
export function initialState(): DriftState {
  return { position: { x: 0, z: 0 }, direction: { x: 1, z: 0 } }
}
export function step(state: DriftState, held: ReadonlySet<Action>, dt: number) {
  const x = Number(held.has('right')) - Number(held.has('left'))
  const z = Number(held.has('down')) - Number(held.has('up'))
  const length = Math.hypot(x, z)
  if (length) state.direction = { x: x / length, z: z / length }
  for (const axis of ['x', 'z'] as const) {
    state.position[axis] += state.direction[axis] * SPEED * dt
    if (Math.abs(state.position[axis]) > BOUND) {
      const sign = Math.sign(state.position[axis])
      state.position[axis] = sign * (2 * BOUND - Math.abs(state.position[axis]))
      state.direction[axis] = -sign * Math.abs(state.direction[axis])
    }
  }
}
