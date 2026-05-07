import type { TabData } from '../store/useTabStore'
import { PanelLeftClose, List } from 'lucide-react'

interface Props {
  tab?: TabData
  onClose: () => void
}

export default function Sidebar({ tab, onClose }: Props) {
  // Very simple markdown heading parser
  const getHeadings = () => {
    if (!tab) return []
    const headings = []
    const regex = /^(#{1,6})\s+(.*)$/gm
    let match
    while ((match = regex.exec(tab.content)) !== null) {
      headings.push({
        level: match[1].length,
        text: match[2]
      })
    }
    return headings
  }

  const headings = getHeadings()

  return (
    <div className="flex flex-col h-full overflow-hidden select-none bg-muted/20 border-r border-border/50">
      <div className="h-10 px-4 border-b border-border bg-background/50 backdrop-blur-sm font-semibold text-[11px] uppercase tracking-[0.1em] text-muted-foreground flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <List size={14} className="text-primary/60" />
          Outline
        </div>
        <button 
          onClick={onClose} 
          className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-all" 
          title="Close Sidebar"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar space-y-0.5">
        {!tab ? (
          <div className="text-[13px] text-muted-foreground/60 italic p-4 text-center mt-4">
            No active document.
          </div>
        ) : headings.length === 0 ? (
          <div className="text-[13px] text-muted-foreground/60 italic p-4 text-center">
            No headings found in this document.
          </div>
        ) : (
          headings.map((h, i) => (
            <div 
              key={i} 
              onClick={() => window.dispatchEvent(new CustomEvent('scroll-to-heading', { detail: { text: h.text, level: h.level } }))}
              className="text-[13px] py-1.5 px-3 hover:bg-muted text-foreground/70 hover:text-foreground cursor-pointer rounded-md truncate transition-all border border-transparent hover:border-border/50"
              style={{ paddingLeft: `${(h.level - 1) * 12 + 12}px` }}
              title={h.text}
            >
              {h.text}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
