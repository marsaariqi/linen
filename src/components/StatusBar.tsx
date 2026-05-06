import type { TabData } from '../store/useTabStore'
import { Info, FileCode } from 'lucide-react'

interface Props {
  tab?: TabData
}

export default function StatusBar({ tab }: Props) {
  const words = tab ? tab.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0
  const lines = tab ? tab.content.split('\n').length : 0

  return (
    <div className="flex items-center justify-between px-4 h-7 text-[11px] bg-background border-t border-border text-muted-foreground select-none shrink-0 font-medium no-print">
      <div className="flex items-center gap-6 no-print">
        <div className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-default no-print">
          <Info size={12} className="text-primary/60" />
          <span>{words} Words</span>
        </div>
        <div className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-default no-print">
          <FileCode size={12} className="text-primary/60" />
          <span>{lines} Lines</span>
        </div>
      </div>
      <div className="flex items-center gap-2 max-w-[50%] no-print">
        <span className="truncate opacity-60 hover:opacity-100 transition-opacity cursor-default no-print">
          {tab?.filePath || 'Unsaved Document'}
        </span>
      </div>
    </div>
  )
}
