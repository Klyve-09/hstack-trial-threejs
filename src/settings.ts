export interface Settings {
  background: string
  shadows: boolean
  grid: boolean
}

export interface SettingsStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const SETTINGS_KEY = 'quiet-forms.settings.v1'
export const defaultSettings: Readonly<Settings> = {
  background: '#e8edf2',
  shadows: true,
  grid: false,
}

export function loadSettings(storage: SettingsStorage): Settings {
  try {
    const value: unknown = JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return { ...defaultSettings }
    const saved = value as Partial<Settings>
    return {
      background: typeof saved.background === 'string' && /^#[0-9a-f]{6}$/i.test(saved.background)
        ? saved.background : defaultSettings.background,
      shadows: typeof saved.shadows === 'boolean' ? saved.shadows : defaultSettings.shadows,
      grid: typeof saved.grid === 'boolean' ? saved.grid : defaultSettings.grid,
    }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(storage: SettingsStorage, settings: Settings): boolean {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}
