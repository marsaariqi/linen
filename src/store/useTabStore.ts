import { create } from 'zustand'
import { loadSession, saveSession, flushSession } from '../lib/storage'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { basename } from '@tauri-apps/api/path'
import welcomeContent from '../Welcome.md?raw'

export interface TabData {
  id: string
  title: string
  content: string
  filePath: string | null
  isActive: boolean
  isDirty: number
}

export interface AppSettings {
  restoreLastSession: boolean
  theme: 'light' | 'dark' | 'system' | 'cat'
  viewMode: 'source' | 'split' | 'preview'
  checkForUpdates: boolean
  sourceWrap: boolean
}

export interface SessionData {
  settings: AppSettings
  openTabs: TabData[]
}

const defaultSettings: AppSettings = {
  restoreLastSession: true,
  theme: 'system',
  viewMode: 'split',
  checkForUpdates: true,
  sourceWrap: false,
}

function createBlankTab(overrides?: Partial<TabData>): TabData {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled.md',
    content: '',
    filePath: null,
    isActive: true,
    isDirty: 0,
    ...overrides
  }
}

function deactivateAll(tabs: TabData[]): TabData[] {
  return tabs.map(t => ({ ...t, isActive: false }))
}

interface TabStoreState {
  tabs: TabData[]
  settings: AppSettings
  isLoaded: boolean
  previewEditMode: boolean

  addTab: () => void
  closeTab: (id: string, force?: boolean) => boolean
  closeAll: (force?: boolean) => boolean
  closeOthers: (id: string, force?: boolean) => boolean
  updateTabContent: (id: string, content: string) => void
  setActiveTab: (id: string) => void
  updateSettings: (settings: Partial<AppSettings>) => void
  loadInitialSession: () => Promise<void>
  saveTab: (id: string) => Promise<boolean>
  openFile: () => Promise<void>
  revealInExplorer: (id: string) => Promise<void>
  setPreviewEditMode: (mode: boolean) => void
}

export const useTabStore = create<TabStoreState>((set, get) => ({
  tabs: [],
  settings: defaultSettings,
  isLoaded: false,
  previewEditMode: false,

  addTab: async () => {
    set((state) => {
      const tabs = [...deactivateAll(state.tabs), createBlankTab()]
      const settings = state.settings.viewMode === 'preview' ? { ...state.settings, viewMode: 'source' as const } : state.settings
      saveSession({ settings, openTabs: tabs })
      return { tabs, settings }
    })
  },

  openFile: async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      })
      if (!selected || typeof selected !== 'string') return

      const content = await readTextFile(selected)
      const fileName = await basename(selected)

      const existing = get().tabs.find(t => t.filePath === selected)
      if (existing) {
        get().setActiveTab(existing.id)
        return
      }

      set((state) => {
        const tabs = [...deactivateAll(state.tabs), createBlankTab({ title: fileName, content, filePath: selected, isDirty: 0 })]
        saveSession({ settings: state.settings, openTabs: tabs })
        return { tabs }
      })
    } catch (e) {
      console.error("Failed to open file", e)
    }
  },

  closeTab: (id, force = false) => {
    const tab = get().tabs.find(t => t.id === id)
    if (!tab) return true
    if (!force && tab.isDirty === 1) return false

    set((state) => {
      let tabs = state.tabs.filter(t => t.id !== id)
      if (tabs.length > 0 && state.tabs.find(t => t.id === id)?.isActive) {
        tabs[tabs.length - 1].isActive = true
      }
      if (tabs.length === 0) tabs = [createBlankTab({ title: 'Welcome.md', content: welcomeContent, isDirty: 0 })]
      saveSession({ settings: state.settings, openTabs: tabs })
      return { tabs }
    })
    return true
  },

  closeAll: (force = false) => {
    if (!force && get().tabs.some(t => t.isDirty === 1)) return false
    set((state) => {
      const tabs = [createBlankTab({ title: 'Welcome.md', content: welcomeContent, isDirty: 0 })]
      saveSession({ settings: state.settings, openTabs: tabs })
      return { tabs }
    })
    return true
  },

  closeOthers: (id, force = false) => {
    if (!force && get().tabs.some(t => t.id !== id && t.isDirty === 1)) return false
    set((state) => {
      const tabs = state.tabs.filter(t => t.id === id).map(t => ({ ...t, isActive: true }))
      saveSession({ settings: state.settings, openTabs: tabs })
      return { tabs }
    })
    return true
  },

  updateTabContent: (id, content) => {
    set((state) => {
      const tabs = state.tabs.map(t => t.id === id ? { ...t, content, isDirty: 1 } : t)
      saveSession({ settings: state.settings, openTabs: tabs })
      return { tabs }
    })
  },

  setActiveTab: (id) => {
    set((state) => {
      const tabs = state.tabs.map(t => ({ ...t, isActive: t.id === id }))
      saveSession({ settings: state.settings, openTabs: tabs })
      return { tabs }
    })
  },

  updateSettings: (newSettings) => {
    set((state) => {
      const settings = Object.assign({}, state.settings, newSettings)
      saveSession({ settings, openTabs: state.tabs })
      return { settings }
    })
  },

  saveTab: async (id) => {
    const tab = get().tabs.find(t => t.id === id)
    if (!tab) return false
    try {
      let path = tab.filePath
      if (!path) {
        path = await save({ filters: [{ name: 'Markdown', extensions: ['md'] }], defaultPath: tab.title })
      }
      if (path) {
        await writeTextFile(path, tab.content)
        const fileName = await basename(path)
        set((state) => {
          const tabs = state.tabs.map(t => t.id === id ? { ...t, filePath: path, title: fileName, isDirty: 0 } : t)
          flushSession({ settings: state.settings, openTabs: tabs })
          return { tabs }
        })
        return true
      }
    } catch (e) {
      console.error("Failed to save file", e)
    }
    return false
  },

  revealInExplorer: async (id) => {
    const tab = get().tabs.find(t => t.id === id)
    if (tab?.filePath) {
      try { await revealItemInDir(tab.filePath) } catch (e) { console.error("Failed to reveal file", e) }
    }
  },

  loadInitialSession: async () => {
    try {
      const session = await loadSession()
      if (session) {
        const tabs = session.settings?.restoreLastSession && session.openTabs?.length
          ? session.openTabs
          : [createBlankTab({ title: 'Welcome.md', content: welcomeContent, isDirty: 0 })]

        const settings = Object.assign({}, defaultSettings, session.settings)
        if ('splitView' in session.settings) {
          const legacy = session.settings as unknown as Record<string, unknown>
          if (typeof legacy.splitView === 'boolean') {
            settings.viewMode = legacy.splitView ? 'split' : 'source'
          }
          delete (settings as unknown as Record<string, unknown>).splitView
        }
        set({ settings, tabs, isLoaded: true })
      } else {
        set({ tabs: [createBlankTab({ title: 'Welcome.md', content: welcomeContent, isDirty: 0 })], isLoaded: true })
      }
    } catch {
      set({ tabs: [createBlankTab({ title: 'Welcome.md', content: welcomeContent, isDirty: 0 })], isLoaded: true })
    }
  },

  setPreviewEditMode: (mode) => set({ previewEditMode: mode }),
}))
