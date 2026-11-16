import { actions } from './input'
import type { Action } from './input'
import { FIXED_STEP } from './loop'
import { initialState, step } from './motion'

export interface ReplayInput { frame: number; action: Action; pressed: boolean }
export interface Replay {
  version: 1
  scene: 'quiet-forms'
  resolution: { width: number; height: number }
  fixedStep: number
  inputs: ReplayInput[]
  captureFrames: number[]
  endFrame: number
}
export const MAX_FRAMES = 1800
export const MAX_WIDTH = 3840
export const MAX_HEIGHT = 2160
export function createReplay(width: number, height: number): Replay {
  return { version: 1, scene: 'quiet-forms', resolution: { width, height }, fixedStep: FIXED_STEP, inputs: [], captureFrames: [0], endFrame: 0 }
}
export function setAction(held: Set<Action>, action: Action, pressed: boolean, frame: number, recording?: Replay) {
  if (held.has(action) === pressed) return
  if (pressed) held.add(action)
  else held.delete(action)
  recording?.inputs.push({ frame, action, pressed })
}
export function parseReplay(json: string): Replay {
  const value = JSON.parse(json)
  const integer = (n: unknown, max: number) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max
  if (!value || value.version !== 1 || value.scene !== 'quiet-forms' || value.fixedStep !== FIXED_STEP ||
      !value.resolution || !integer(value.resolution.width, MAX_WIDTH) || value.resolution.width === 0 ||
      !integer(value.resolution.height, MAX_HEIGHT) || value.resolution.height === 0 ||
      !integer(value.endFrame, MAX_FRAMES) || !Array.isArray(value.inputs) || !Array.isArray(value.captureFrames)) throw new Error('Invalid replay header')
  let previous = -1
  for (const input of value.inputs) {
    if (!input || !integer(input.frame, value.endFrame) || input.frame < previous || !actions.includes(input.action) || typeof input.pressed !== 'boolean') throw new Error('Invalid replay input')
    previous = input.frame
  }
  previous = -1
  for (const frame of value.captureFrames) {
    if (!integer(frame, value.endFrame) || frame <= previous) throw new Error('Invalid capture frame')
    previous = frame
  }
  return value as Replay
}
export function createPlayback(file: Replay) {
  const state = initialState()
  const held = new Set<Action>()
  let frame = 0
  let cursor = 0
  return {
    state,
    get frame() { return frame },
    get done() { return frame >= file.endFrame },
    advance() {
      if (frame >= file.endFrame) return
      while (cursor < file.inputs.length && file.inputs[cursor].frame === frame) {
        const input = file.inputs[cursor++]
        setAction(held, input.action, input.pressed, frame)
      }
      step(state, held, file.fixedStep)
      frame++
    },
  }
}
