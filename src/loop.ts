export const FIXED_STEP = 1 / 60
export const MAX_GAP = 0.25

export function createLoop(update: (frame: number) => void) {
  let previous: number | undefined
  let accumulated = 0
  let frame = 0
  return {
    get frame() { return frame },
    resetClock() { previous = undefined; accumulated = 0 },
    tick(seconds: number) {
      if (previous !== undefined) accumulated += Math.min(MAX_GAP, Math.max(0, seconds - previous))
      previous = seconds
      while (accumulated + 1e-10 >= FIXED_STEP) {
        update(frame++)
        accumulated = Math.max(0, accumulated - FIXED_STEP)
      }
    },
  }
}
