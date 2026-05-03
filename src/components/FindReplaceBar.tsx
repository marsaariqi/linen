import { useState, useCallback, useEffect, useRef } from 'react'
import { useTabStore } from '../store/useTabStore'
import { Search, ChevronDown, ChevronUp, X, Replace, CaseSensitive, WholeWord } from 'lucide-react'
import { cn } from '../lib/utils'

interface Props {
  onClose: () => void
  readOnly?: boolean
}

export default function FindReplaceBar({ onClose, readOnly }: Props) {
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [matchWholeWord, setMatchWholeWord] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [matches, setMatches] = useState<number[]>([])
  const [currentIdx, setCurrentIdx] = useState(-1)
  const findInputRef = useRef<HTMLInputElement>(null)

  const clearHighlights = useCallback(() => {
    window.dispatchEvent(new CustomEvent('find-clear'))
  }, [])

  useEffect(() => {
    findInputRef.current?.focus()
    return () => { clearHighlights() }
  }, [clearHighlights])

  const navigateToMatch = useCallback((offset: number, length: number, occurrence: number) => {
    window.dispatchEvent(new CustomEvent('find-navigate', { detail: { offset, length, occurrence } }))
    // Re-focus after handlers (window.find() may steal focus synchronously)
    setTimeout(() => findInputRef.current?.focus(), 0)
  }, [])

  const dispatchHighlights = useCallback((result: number[], termLength: number) => {
    window.dispatchEvent(new CustomEvent('find-highlights', { detail: { matches: result.map((idx: number) => ({ from: idx, to: idx + termLength })) } }))
  }, [])

  const doSearch = useCallback((text: string, caseSensitive: boolean, wholeWord: boolean) => {
    const content = useTabStore.getState().tabs.find(t => t.isActive)?.content ?? ''
    if (!text) { setMatches([]); setCurrentIdx(-1); clearHighlights(); return }
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = wholeWord ? `\\b${escaped}\\b` : escaped
    const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi')
    const result: number[] = []
    let m: RegExpExecArray | null
    while ((m = regex.exec(content)) !== null) result.push(m.index)
    setMatches(result)
    const idx = result.length > 0 ? 0 : -1
    setCurrentIdx(idx)
    dispatchHighlights(result, text.length)
    if (idx >= 0) navigateToMatch(result[0]!, text.length, 0)
  }, [navigateToMatch, dispatchHighlights, clearHighlights])

  const goNext = useCallback(() => {
    if (matches.length === 0) return
    const next = (currentIdx + 1) % matches.length
    setCurrentIdx(next)
    navigateToMatch(matches[next]!, findText.length, next)
  }, [matches, currentIdx, findText.length, navigateToMatch])

  const goPrev = useCallback(() => {
    if (matches.length === 0) return
    const prev = (currentIdx - 1 + matches.length) % matches.length
    setCurrentIdx(prev)
    navigateToMatch(matches[prev]!, findText.length, prev)
  }, [matches, currentIdx, findText.length, navigateToMatch])

  const handleFindChange = (val: string) => {
    setFindText(val)
    if (!val) { setMatches([]); setCurrentIdx(-1); clearHighlights(); return }
    doSearch(val, matchCase, matchWholeWord)
  }

  const handleReplace = useCallback(() => {
    const store = useTabStore.getState()
    const tab = store.tabs.find(t => t.isActive)
    if (!tab || currentIdx < 0) return
    const idx = matches[currentIdx]!
    const newContent = tab.content.slice(0, idx) + replaceText + tab.content.slice(idx + findText.length)
    store.updateTabContent(tab.id, newContent)
    const diff = replaceText.length - findText.length
    const newMatches = matches.map((m, i) => i === currentIdx ? m : (m > idx ? m + diff : m))
      .filter((_, i) => i !== currentIdx || replaceText.length > 0)
    setMatches(newMatches)
    const nextIdx = currentIdx < newMatches.length ? currentIdx : Math.max(0, newMatches.length - 1)
    setCurrentIdx(nextIdx)
    if (newMatches.length > 0) dispatchHighlights(newMatches, findText.length)
    else clearHighlights()
    if (nextIdx >= 0 && findText.length > 0) navigateToMatch(newMatches[nextIdx]!, findText.length, nextIdx)
  }, [matches, currentIdx, findText, replaceText, navigateToMatch, dispatchHighlights, clearHighlights])

  const handleReplaceAll = useCallback(() => {
    const store = useTabStore.getState()
    const tab = store.tabs.find(t => t.isActive)
    if (!tab || !findText) return
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = matchWholeWord ? `\\b${escaped}\\b` : escaped
    const regex = new RegExp(pattern, matchCase ? 'g' : 'gi')
    store.updateTabContent(tab.id, tab.content.replace(regex, replaceText))
    setMatches([]); setCurrentIdx(-1); clearHighlights()
  }, [findText, replaceText, matchCase, matchWholeWord, clearHighlights])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) goPrev()
        else if (showReplace && matches.length > 0 && currentIdx >= 0) handleReplace()
        else goNext()
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); findInputRef.current?.focus(); findInputRef.current?.select() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, goNext, goPrev, handleReplace, showReplace, matches, currentIdx])

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur shrink-0 py-2 px-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="flex items-center bg-muted/50 rounded-md border border-border px-2 gap-1.5 min-w-[200px] max-w-[400px] flex-1">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input ref={findInputRef} type="text" value={findText} onChange={e => handleFindChange(e.target.value)} placeholder="Find" className="bg-transparent border-none outline-none text-sm py-1 w-full text-foreground placeholder:text-muted-foreground/50" />
            <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
              {matches.length > 0 ? `${currentIdx + 1} / ${matches.length}` : findText ? '0' : ''}
            </span>
          </div>
          <button onClick={goPrev} disabled={matches.length === 0} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 shrink-0" title="Previous (Shift+Enter)"><ChevronUp size={16} /></button>
          <button onClick={goNext} disabled={matches.length === 0} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 shrink-0" title="Next (Enter)"><ChevronDown size={16} /></button>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => { setMatchCase(!matchCase); doSearch(findText, !matchCase, matchWholeWord) }} className={cn('p-1 rounded', matchCase ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')} title="Match Case"><CaseSensitive size={14} /></button>
            <button onClick={() => { setMatchWholeWord(!matchWholeWord); doSearch(findText, matchCase, !matchWholeWord) }} className={cn('p-1 rounded', matchWholeWord ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')} title="Match Whole Word"><WholeWord size={14} /></button>
          </div>
          {!readOnly && (
            <button onClick={() => setShowReplace(!showReplace)} className={cn('p-1 rounded shrink-0', showReplace ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')} title="Toggle Replace"><Replace size={16} /></button>
          )}

        </div>


        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 ml-auto" title="Close (Esc)"><X size={16} /></button>
      </div>

      {showReplace && (
        <div className="flex items-center gap-1.5 mt-2">
          <input type="text" value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace" className="bg-muted/50 border border-border rounded-md px-2 py-1 text-sm w-40 outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/50" />
          <button onClick={handleReplace} disabled={currentIdx < 0} className="px-2.5 py-1 text-xs font-medium rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-30">Replace</button>
          <button onClick={handleReplaceAll} disabled={matches.length === 0} className="px-2.5 py-1 text-xs font-medium rounded bg-muted text-muted-foreground border border-border hover:bg-muted/80 disabled:opacity-30">Replace All</button>
        </div>
      )}
    </div>
  )
}
