import type { SessionData } from '../store/useTabStore'
import { writeTextFile, readTextFile, mkdir, exists } from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'

const SESSION_FILENAME = 'session.json'

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pendingSession: SessionData | null = null
const DEBOUNCE_MS = 500

async function ensureDir() {
  const dir = await appDataDir()
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true })
  }
  return dir
}

async function writeSessionFile(data: SessionData) {
  const dir = await ensureDir()
  const path = await join(dir, SESSION_FILENAME)
  await writeTextFile(path, JSON.stringify(data, null, 2))
}

function fallbackLocalStorage(data: SessionData) {
  try {
    localStorage.setItem('linen_session', JSON.stringify(data))
  } catch (e) {
    console.error('LocalStorage fallback failed:', e)
  }
}

export const saveSession = (data: SessionData) => {
  pendingSession = data
  if (debounceTimer) return
  debounceTimer = setTimeout(async () => {
    debounceTimer = null
    const current = pendingSession
    pendingSession = null
    if (!current) return
    try {
      await writeSessionFile(current)
    } catch {
      fallbackLocalStorage(current)
    }
  }, DEBOUNCE_MS)
}

export const flushSession = async (data?: SessionData) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  const current = data ?? pendingSession
  pendingSession = null
  if (!current) return
  try {
    await writeSessionFile(current)
  } catch {
    fallbackLocalStorage(current)
  }
}

export const loadSession = async (): Promise<SessionData | null> => {
  try {
    const dir = await appDataDir()
    const path = await join(dir, SESSION_FILENAME)
    if (await exists(path)) {
      const content = await readTextFile(path)
      return JSON.parse(content) as SessionData
    }
    const localData = localStorage.getItem('linen_session')
    if (localData) {
      return JSON.parse(localData) as SessionData
    }
    return null
  } catch {
    try {
      const localData = localStorage.getItem('linen_session')
      if (localData) {
        return JSON.parse(localData) as SessionData
      }
    } catch (e) {
      console.error('LocalStorage fallback failed:', e)
    }
    return null
  }
}
