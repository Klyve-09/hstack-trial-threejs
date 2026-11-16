export const actionMap = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
} as const
export type Action = typeof actionMap[keyof typeof actionMap]
export const actions: readonly Action[] = Object.values(actionMap)
