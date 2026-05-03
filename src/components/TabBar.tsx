import { useTabStore } from '../store/useTabStore'
import { X, Plus, FileText, FolderOpen, AlertCircle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '../lib/utils'

export default function TabBar() {
  const { tabs, setActiveTab, closeTab, addTab, closeAll, closeOthers, revealInExplorer, saveTab } = useTabStore()
  const [showMenu, setShowMenu] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [pendingClose, setPendingClose] = useState<{ id: string, type: 'single' | 'others' | 'all' } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY
    }
  }

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setMenuPos({ x: e.clientX, y: e.clientY })
    setShowMenu(id)
  }

  const tryCloseTab = (id: string) => {
    const closed = closeTab(id)
    if (!closed) {
      setPendingClose({ id, type: 'single' })
    }
  }

  const tryCloseOthers = (id: string) => {
    const closed = closeOthers(id)
    if (!closed) {
      setPendingClose({ id, type: 'others' })
    }
  }

  const tryCloseAll = () => {
    const closed = closeAll()
    if (!closed) {
      setPendingClose({ id: '', type: 'all' })
    }
  }

  const handleDiscard = () => {
    if (!pendingClose) return
    if (pendingClose.type === 'single') closeTab(pendingClose.id, true)
    else if (pendingClose.type === 'others') closeOthers(pendingClose.id, true)
    else if (pendingClose.type === 'all') closeAll(true)
    setPendingClose(null)
  }

  const handleSave = async () => {
    if (!pendingClose) return
    let success = true
    if (pendingClose.type === 'single') {
      success = await saveTab(pendingClose.id)
      if (success) closeTab(pendingClose.id, true)
    } else {
      // For others/all, we just prompt to save each dirty one
      const dirtyTabs = tabs.filter(t =>
        (pendingClose.type === 'all' || t.id !== pendingClose.id) && t.isDirty === 1
      )
      for (const tab of dirtyTabs) {
        await saveTab(tab.id)
      }
      if (pendingClose.type === 'others') closeOthers(pendingClose.id, true)
      else closeAll(true)
    }
    if (success) setPendingClose(null)
  }

  return (
    <div className="flex items-center flex-1 overflow-hidden h-full">
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex items-center flex-1 overflow-x-auto no-scrollbar h-full select-none"
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            className={cn(
              "group flex items-center gap-2 px-4 py-2 min-w-[140px] max-w-[220px] cursor-pointer transition-all text-[13px] h-full relative shrink-0 border-r border-border/50",
              tab.isActive
                ? "bg-background text-foreground shadow-[inset_0_2px_0_0_hsl(var(--primary))]"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <FileText size={14} className={cn("shrink-0", tab.isActive ? "text-primary" : "text-muted-foreground/60")} />
            <span className="truncate flex-1 font-medium">
              {tab.title}
            </span>
            {tab.isDirty === 1 && (
              <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                tryCloseTab(tab.id);
              }}
              className={cn(
                "p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all ml-1",
                tab.isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        <button
          onClick={() => addTab()}
          className="p-2 mx-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all shrink-0"
          title="New Tab"
        >
          <Plus size={16} />
        </button>
      </div>

      {showMenu && (
        <div
          ref={menuRef}
          className="fixed bg-popover text-popover-foreground border border-border rounded-lg shadow-xl z-[100] py-1.5 min-w-[180px] animate-in fade-in zoom-in duration-100"
          style={{ top: menuPos.y, left: menuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { tryCloseTab(showMenu); setShowMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
          >
            <X size={14} />
            Close Tab
          </button>
          <button
            onClick={() => { tryCloseOthers(showMenu); setShowMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Close Others
          </button>
          <button
            onClick={() => { tryCloseAll(); setShowMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Close All
          </button>
          <div className="h-px bg-border my-1" />
          <button
            onClick={() => { revealInExplorer(showMenu); setShowMenu(null); }}
            disabled={!tabs.find(t => t.id === showMenu)?.filePath}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <FolderOpen size={14} />
            Reveal in Explorer
          </button>
        </div>
      )}

      {pendingClose && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-destructive/10 rounded-full text-destructive">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">Unsaved Changes</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You have unsaved changes in your document. If you close now, these changes will be permanently lost.
              </p>
            </div>
            <div className="bg-muted/30 p-4 px-6 flex justify-end gap-3 border-t border-border">
              <button
                onClick={() => setPendingClose(null)}
                className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscard}
                className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
