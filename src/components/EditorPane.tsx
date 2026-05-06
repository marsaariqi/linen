import { useCallback, useEffect, useRef, useMemo, memo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView, Decoration } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { githubLight } from '@uiw/codemirror-theme-github'
import { useTabStore } from '../store/useTabStore'
import type { TabData } from '../store/useTabStore'

interface Props {
  tab: TabData
  resolvedTheme: 'light' | 'dark'
  sourceWrap?: boolean
}

let editorSyncBlocked = false
let editorSyncTimer: ReturnType<typeof setTimeout> | null = null

const setFindHighlights = StateEffect.define<Array<{ from: number; to: number }>>()

const findHighlightField = StateField.define({
  create() { return Decoration.none },
  update(decos, tr) {
    const mapped = decos.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setFindHighlights)) {
        return Decoration.set(e.value.map(({ from, to }) =>
          Decoration.mark({ class: 'cm-findMatch' }).range(from, to)
        ))
      }
    }
    return mapped
  },
  provide: f => EditorView.decorations.from(f),
})

function EditorPane({ tab, resolvedTheme, sourceWrap }: Props) {
  const { updateTabContent } = useTabStore()
  const editorRef = useRef<ReactCodeMirrorRef>(null)
  const userTyping = useRef(false) // true when user edits, false when external
  const [fontSize, setFontSize] = useState(14)

  const onChange = useCallback((value: string) => {
    userTyping.current = true
    updateTabContent(tab.id, value)
  }, [tab.id, updateTabContent])

  // Sync external content changes without re-creating editor
  useEffect(() => {
    if (userTyping.current) { userTyping.current = false; return }
    const view = editorRef.current?.view
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (tab.content === currentDoc) return
    const st = view.scrollDOM.scrollTop
    view.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: tab.content },
    })
    requestAnimationFrame(() => { view.scrollDOM.scrollTop = st })
  }, [tab.content])

  useEffect(() => {
    const handleScrollToHeading = (e: Event) => {
      const event = e as CustomEvent<{ text: string; level: number }>
      const { text, level } = event.detail
      const view = editorRef.current?.view
      if (view) {
        const doc = view.state.doc
        for (let i = 1; i <= doc.lines; i++) {
          const line = doc.line(i)
          const trimmed = line.text.trim()
          const marker = '#'.repeat(level)
          if (trimmed.startsWith(marker + ' ')) {
            const headingText = trimmed.replace(/^#+\s+/, '').replace(/\s+#+$/, '').trim()
            if (headingText === text.trim()) {
              const pos = line.from
              const coords = view.coordsAtPos(pos)
              if (coords) {
                const scroller = view.scrollDOM
                const top = coords.top - scroller.getBoundingClientRect().top + scroller.scrollTop - 40
                window.isExternalScrollSync = true
                scroller.scrollTo({ top, behavior: 'smooth' })
                setTimeout(() => { window.isExternalScrollSync = false }, 500)
              }
              break
            }
          }
        }
      }
    }

    const handleSyncScroll = (e: Event) => {
      const event = e as CustomEvent<{ source: string; percentage: number }>
      if (event.detail.source === 'editor' || window.isExternalScrollSync || !useTabStore.getState().settings.syncScroll) return
      const view = editorRef.current?.view
      if (view) {
        const scroller = view.scrollDOM
        if (scroller) {
          editorSyncBlocked = true
          if (editorSyncTimer) clearTimeout(editorSyncTimer)
          scroller.scrollTop = event.detail.percentage * (scroller.scrollHeight - scroller.clientHeight)
          editorSyncTimer = setTimeout(() => { editorSyncBlocked = false }, 50)
        }
      }
    }

    const handleFindNavigate = (e: Event) => {
      const event = e as CustomEvent<{ offset: number; length: number }>
      const view = editorRef.current?.view
      if (view) {
        const { offset, length } = event.detail
        view.dispatch({
          selection: { anchor: offset, head: offset + length },
          effects: EditorView.scrollIntoView(offset, { y: 'center' }),
        })
      }
    }

    const handleFindHighlights = (e: Event) => {
      const event = e as CustomEvent<{ matches: Array<{ from: number; to: number }> }>
      const view = editorRef.current?.view
      if (view) {
        view.dispatch({ effects: setFindHighlights.of(event.detail.matches) })
      }
    }

    const handleClearFindHighlights = () => {
      const view = editorRef.current?.view
      if (view) {
        view.dispatch({ effects: setFindHighlights.of([]) })
      }
    }

    const handleWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        if (e.deltaY < 0) {
          setFontSize(prev => Math.min(prev + 1, 48))
        } else if (e.deltaY > 0) {
          setFontSize(prev => Math.max(prev - 1, 8))
        }
      }
    }

    const handleKeyZoom = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          setFontSize(prev => Math.min(prev + 1, 48))
        } else if (e.key === '-') {
          e.preventDefault()
          setFontSize(prev => Math.max(prev - 1, 8))
        } else if (e.key === '0') {
          e.preventDefault()
          setFontSize(14)
        }
      }
    }

    window.addEventListener('scroll-to-heading', handleScrollToHeading)
    window.addEventListener('sync-scroll', handleSyncScroll)
    window.addEventListener('find-navigate', handleFindNavigate)
    window.addEventListener('find-highlights', handleFindHighlights as EventListener)
    window.addEventListener('find-clear', handleClearFindHighlights)
    window.addEventListener('wheel', handleWheelZoom, { passive: false })
    window.addEventListener('keydown', handleKeyZoom)
    
    return () => {
      window.removeEventListener('scroll-to-heading', handleScrollToHeading)
      window.removeEventListener('sync-scroll', handleSyncScroll)
      window.removeEventListener('find-navigate', handleFindNavigate)
      window.removeEventListener('find-highlights', handleFindHighlights as EventListener)
      window.removeEventListener('find-clear', handleClearFindHighlights)
      window.removeEventListener('wheel', handleWheelZoom)
      window.removeEventListener('keydown', handleKeyZoom)
    }
  }, [])

  // Handle image paste in source editor
  useEffect(() => {
    const view = editorRef.current?.view
    if (!view) return
    const dom = view.dom
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const imgItem = Array.from(items).find(item => item.type.startsWith('image/'))
      if (!imgItem) return
      // If clipboard has HTML (web page), let CodeMirror's default paste handle it
      const hasHtml = Array.from(items).some(item => item.type === 'text/html')
      if (hasHtml) return
      e.preventDefault()
      e.stopPropagation()
      const file = imgItem.getAsFile()
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const url = reader.result as string
        const cv = editorRef.current?.view
        if (cv) {
          cv.dispatch(cv.state.replaceSelection(`![image](${url})`))
        }
      }
      reader.readAsDataURL(file)
    }
    dom.addEventListener('paste', handlePaste)
    return () => dom.removeEventListener('paste', handlePaste)
  }, [tab.id])

  const extensions = useMemo(() => [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    findHighlightField,
    ...(sourceWrap ? [EditorView.lineWrapping] : []),
    EditorView.theme({
      "&": {
        fontSize: `${fontSize}px`
      }
    }),
    EditorView.domEventHandlers({
      scroll: (event) => {
        if (editorSyncBlocked) return
        const scroller = event.target as HTMLElement
        const percentage = scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight || 1)
        window.dispatchEvent(new CustomEvent('sync-scroll', { detail: { source: 'editor', percentage } }))
      }
    }),
  ], [sourceWrap, fontSize])

  return (
    <div className="flex-1 overflow-auto h-full editor-container">
      <CodeMirror
        ref={editorRef}
        value={tab.content}
        height="100%"
        extensions={extensions}
        onChange={onChange}
        theme={resolvedTheme === 'dark' ? oneDark : githubLight}
        className="h-full font-mono"
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          bracketMatching: true,
          searchKeymap: false,
        }}
      />
    </div>
  )
}

export default memo(EditorPane, (prev, next) =>
  prev.tab.content === next.tab.content &&
  prev.tab.id === next.tab.id &&
  prev.resolvedTheme === next.resolvedTheme &&
  prev.sourceWrap === next.sourceWrap
)
