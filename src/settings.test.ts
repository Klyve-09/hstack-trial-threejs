import { describe, expect, it } from 'vitest'
import { defaultSettings, loadSettings, saveSettings, SETTINGS_KEY } from './settings'
import type { SettingsStorage } from './settings'

function memoryStorage(initial: string | null = null): SettingsStorage {
  const data = new Map<string, string>(initial === null ? [] : [[SETTINGS_KEY, initial]])
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value) } }
}

describe('settings', () => {
  it('provides independent defaults for missing and malformed data', () => {
    const loaded = loadSettings(memoryStorage())
    loaded.grid = true
    expect(defaultSettings.grid).toBe(false)
    for (const value of ['broken', 'null', '[]', '42']) {
      expect(loadSettings(memoryStorage(value))).toEqual(defaultSettings)
    }
  })
  it('restores valid fields and rejects invalid field types and colors', () => {
    expect(loadSettings(memoryStorage('{"background":"red","shadows":false,"grid":"yes"}')))
      .toEqual({ ...defaultSettings, shadows: false })
  })
  it('round trips preferences using the versioned key', () => {
    const storage = memoryStorage()
    const settings = { background: '#Ab12Ef', shadows: false, grid: true }
    expect(saveSettings(storage, settings)).toBe(true)
    expect(storage.getItem(SETTINGS_KEY)).not.toBeNull()
    expect(loadSettings(storage)).toEqual(settings)
  })
  it('handles unavailable or full storage without throwing', () => {
    const storage = { getItem: () => { throw new Error('Unavailable') }, setItem: () => { throw new Error('Full') } }
    expect(loadSettings(storage)).toEqual(defaultSettings)
    expect(saveSettings(storage, { ...defaultSettings })).toBe(false)
  })
})
