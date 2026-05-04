import { useState } from 'react'
import { useTabStore } from '../store/useTabStore'
import type { AppSettings } from '../store/useTabStore'
import { X, RefreshCw, FolderOpen, ExternalLink } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function SettingsPanel({ onClose }: Props) {
  const { settings, updateSettings } = useTabStore()
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateMessage, setUpdateMessage] = useState('')
  const [updateUrl, setUpdateUrl] = useState('')

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true)
    setUpdateMessage('')
    setUpdateUrl('')
    try {
      const res = await fetch('https://api.github.com/repos/marsaariqi/linen/releases/latest')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json() as { tag_name?: string; html_url?: string }
      const latest = data.tag_name?.replace(/^v/, '') ?? null
      const current = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0'
      if (latest && latest !== current) {
        setUpdateMessage(`v${latest} available (current v${current})`)
        setUpdateUrl(data.html_url ?? `https://github.com/marsaariqi/linen/releases/latest`)
      } else {
        setUpdateMessage('You are on the latest version.')
      }
    } catch {
      setUpdateMessage('Could not check for updates. Try again later.')
    }
    setCheckingUpdate(false)
  }

  const handleOpenRelease = async () => {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(updateUrl)
    } catch {
      window.open(updateUrl, '_blank')
    }
  }

  const handleOpenAppFolder = async () => {
    try {
      const { appDataDir, join } = await import('@tauri-apps/api/path')
      const { revealItemInDir } = await import('@tauri-apps/plugin-opener')
      const { exists } = await import('@tauri-apps/plugin-fs')
      const dir = await appDataDir()
      const sessionPath = await join(dir, 'session.json')
      if (await exists(sessionPath)) {
        await revealItemInDir(sessionPath)
      } else {
        await revealItemInDir(dir)
      }
    } catch (e) {
      console.error('Failed to open app folder', e)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40 shrink-0">
          <h2 className="font-semibold text-lg">Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-8">
          <div className="space-y-5">
            <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider font-semibold">Appearance & Behavior</h3>

            <div className="flex items-center justify-between">
              <div className="pr-4">
                <div className="font-medium text-sm">Theme</div>
                <div className="text-xs text-muted-foreground mt-0.5">Select the app visual theme</div>
              </div>
              <select
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as AppSettings['theme'] })}
                className="appearance-none bg-background text-foreground border border-border rounded-md pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer settings-select border-r-0"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="cat">Cat</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="pr-4">
                  <div className="font-medium text-sm">Default View Mode</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Layout for editor and preview</div>
                </div>
                <select
                  value={settings.viewMode}
                  onChange={(e) => updateSettings({ viewMode: e.target.value as AppSettings['viewMode'] })}
                  className="appearance-none bg-background text-foreground border border-border rounded-md pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer settings-select"
                >
                  <option value="source">Source Only</option>
                  <option value="split">Split View</option>
                  <option value="preview">Preview Only</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50 w-fit">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Tip:</span>
                <span className="text-xs text-muted-foreground">Press <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-sans font-medium text-foreground mx-0.5">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-sans font-medium text-foreground mx-0.5">Shift</kbd>+<kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-sans font-medium text-foreground mx-0.5">V</kbd> to cycle modes</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="pr-4">
                <div className="font-medium text-sm">Word Wrap</div>
                <div className="text-xs text-muted-foreground mt-0.5">Wrap long lines in source editor</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={settings.sourceWrap}
                  onChange={(e) => updateSettings({ sourceWrap: e.target.checked })}
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${settings.sourceWrap ? 'bg-primary' : 'bg-muted-foreground/30'} relative`}>
                  <div className={`absolute top-[2px] left-[2px] bg-background border border-border w-5 h-5 rounded-full transition-transform ${settings.sourceWrap ? 'translate-x-5' : ''}`}></div>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-5">
            <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider font-semibold">Session</h3>
            <div className="flex items-center justify-between">
              <div className="pr-4">
                <div className="font-medium text-sm">Restore Session</div>
                <div className="text-xs text-muted-foreground mt-0.5">Reopen previous tabs on launch</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={settings.restoreLastSession}
                  onChange={(e) => updateSettings({ restoreLastSession: e.target.checked })}
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${settings.restoreLastSession ? 'bg-primary' : 'bg-muted-foreground/30'} relative`}>
                  <div className={`absolute top-[2px] left-[2px] bg-background border border-border w-5 h-5 rounded-full transition-transform ${settings.restoreLastSession ? 'translate-x-5' : ''}`}></div>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-5">
            <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider font-semibold">About</h3>
            <div className="bg-muted/30 p-5 rounded-xl border border-border shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-bold text-lg text-foreground">Linen</div>
                  <div className="text-sm text-muted-foreground mt-1">A Minimalist Markdown Editor</div>
                </div>
                <div className="text-xs font-mono bg-muted border border-border px-2 py-1 rounded-md text-muted-foreground">v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0'}</div>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <button
                  onClick={handleCheckUpdate}
                  disabled={checkingUpdate}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50 text-sm font-medium cursor-pointer shadow-sm border border-border"
                >
                  <RefreshCw size={16} className={checkingUpdate ? "animate-spin" : ""} />
                  {checkingUpdate ? "Checking for updates..." : "Check for Updates"}
                </button>
                <button
                  onClick={handleOpenAppFolder}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium cursor-pointer shadow-sm border border-border"
                >
                  <FolderOpen size={16} />
                  Open App Folder
                </button>
                {updateMessage && (
                  <div className={`text-sm text-center font-medium ${updateUrl ? 'text-amber-600 dark:text-amber-400 cat:text-amber-300' : 'text-green-600 dark:text-green-400 cat:text-green-300'}`}>
                    {updateMessage}
                  </div>
                )}
                {updateUrl && (
                  <button
                    onClick={handleOpenRelease}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors text-sm font-medium cursor-pointer shadow-sm"
                  >
                    <ExternalLink size={16} />
                    Download Update
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
