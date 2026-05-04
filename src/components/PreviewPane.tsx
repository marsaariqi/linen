import { useEffect, useRef, useState, useCallback } from 'react'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import markedKatex from 'marked-katex-extension'
import hljs from 'highlight.js'
import mermaid from 'mermaid'
import { useTabStore } from '../store/useTabStore'
import { Lock, Unlock } from 'lucide-react'
import WysiwygPane from './WysiwygPane'
import ExternalLinkDialog from './ExternalLinkDialog'

const languageMap: Record<string, string> = {
  'javascript': 'js', 'js': 'js', 'jsx': 'js',
  'typescript': 'ts', 'ts': 'ts', 'tsx': 'ts',
  'text': 'txt', 'plaintext': 'txt', 'txt': 'txt',
  'sh': 'bash', 'shell': 'bash', 'bash': 'bash',
  'py': 'python', 'python': 'python',
  'rb': 'ruby', 'ruby': 'ruby',
  'rs': 'rust', 'rust': 'rust',
  'md': 'markdown', 'markdown': 'markdown',
  'yml': 'yaml', 'yaml': 'yaml',
}

function normalizeCodeLanguage(lang: string | undefined): string {
  if (!lang) return 'txt'
  const lower = lang.toLowerCase()
  return languageMap[lower] || lang
}

marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    if (lang === 'mermaid') return code
    const normalized = normalizeCodeLanguage(lang)
    const language = hljs.getLanguage(normalized) ? normalized : 'plaintext'
    return hljs.highlight(code, { language }).value
  }
}))

marked.use(markedKatex({
  throwOnError: false
}))

marked.use({
  renderer: {
    code({ text, lang }) {
      const isMermaid = lang === 'mermaid'
      const normalized = normalizeCodeLanguage(lang)
      const className = isMermaid ? 'language-mermaid' : `hljs language-${normalized}`
      return `<pre><code class="${className}">${text}</code></pre>`
    }
  }
})

interface Props {
  content: string
  tabId: string
  resolvedTheme: 'light' | 'dark'
}

let previewSyncBlocked = false
let previewSyncTimer: ReturnType<typeof setTimeout> | null = null

export default function PreviewPane({ content, tabId, resolvedTheme }: Props) {
  const viewRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { updateTabContent, setPreviewEditMode } = useTabStore()
  const [isEditable, setIsEditable] = useState(false)
  const [linkDialogUrl, setLinkDialogUrl] = useState<string | null>(null)
  const [showHtmlWarning, setShowHtmlWarning] = useState(false)
  const isDark = resolvedTheme === 'dark'
  const contentRef = useRef(content)

  const hasHtmlTags = (text: string) => /<[a-zA-Z/][^>]*>/.test(text)

  const requestEditMode = useCallback(() => {
    if (hasHtmlTags(contentRef.current)) {
      setShowHtmlWarning(true)
    } else {
      setIsEditable(true)
    }
  }, [])

  useEffect(() => {
    contentRef.current = content
  }, [content])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        if (isEditable) {
          setIsEditable(false)
        } else {
          requestEditMode()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditable, requestEditMode])

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif',
    })
  }, [isDark])

  // Sync edit mode to store (for find bar replace button visibility)
  useEffect(() => {
    setPreviewEditMode(isEditable)
  }, [isEditable, setPreviewEditMode])

  useEffect(() => {
    if (isEditable || !viewRef.current) return
    const renderPreview = async () => {
      try {
        const htmlContent = await marked.parse(content)
        if (viewRef.current) {
          viewRef.current.innerHTML = htmlContent

          const mermaidDivs = viewRef.current.querySelectorAll('code.language-mermaid')
          for (let i = 0; i < mermaidDivs.length; i++) {
            const el = mermaidDivs[i]
            const code = el.textContent || ''
            const parent = el.parentElement
            if (parent && parent.tagName === 'PRE') {
              const wrapper = document.createElement('div')
              wrapper.className = 'mermaid flex justify-center my-6 overflow-x-auto bg-muted/30 rounded-xl p-6 border border-border shadow-sm'
              wrapper.id = `mermaid-${Date.now()}-${i}`
              parent.replaceWith(wrapper)

              try {
                const { svg } = await mermaid.render(wrapper.id + '-svg', code)
                wrapper.innerHTML = svg
              } catch (err) {
                console.error("Mermaid render error", err)
                wrapper.innerHTML = `<div class="text-destructive bg-destructive/5 p-4 rounded-lg border border-destructive/20 text-xs font-mono whitespace-pre-wrap">${err}</div>`
              }
            }
          }
        }
      } catch (err) {
        console.error("Markdown parse error", err)
      }
    }
    renderPreview()
  }, [content, isEditable])

  // Handle external link clicks
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const onClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href') || ''
      if (href.startsWith('http://') || href.startsWith('https://')) {
        e.preventDefault()
        setLinkDialogUrl(href)
      }
    }
    container.addEventListener('click', onClick)
    return () => container.removeEventListener('click', onClick)
  }, [content])

  useEffect(() => {
    const handleScrollToHeading = (e: Event) => {
      const event = e as CustomEvent<{ text: string; level: number }>
      const { text, level } = event.detail
      const container = isEditable
        ? document.querySelector('.ProseMirror')
        : viewRef.current
      if (container) {
        const tag = `H${level}`
        const headings = Array.from(container.querySelectorAll(tag))
        const target = headings.find(h => h.textContent?.trim() === text.trim())
        if (target) {
          window.isExternalScrollSync = true
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          setTimeout(() => { window.isExternalScrollSync = false }, 500)
        }
      }
    }

    const handleSyncScroll = (e: Event) => {
      const event = e as CustomEvent<{ source: string; percentage: number }>
      if (event.detail.source === 'preview' || window.isExternalScrollSync) return
      const scroller = scrollContainerRef.current
      if (scroller) {
        previewSyncBlocked = true
        if (previewSyncTimer) clearTimeout(previewSyncTimer)
        scroller.scrollTop = event.detail.percentage * (scroller.scrollHeight - scroller.clientHeight)
        previewSyncTimer = setTimeout(() => { previewSyncBlocked = false }, 50)
      }
    }

    const handleFindNavigate = (e: Event) => {
      const event = e as CustomEvent<{ offset: number; length: number; occurrence: number }>
      if (isEditable || !viewRef.current) return
      const body = viewRef.current
      // Clear old highlights
      body.querySelectorAll('span.find-match-highlight').forEach(el => {
        el.replaceWith(document.createTextNode(el.textContent || ''))
      })
      body.normalize()
      // Walk text nodes to find the Nth occurrence and navigate to it
      const searchText = contentRef.current.slice(event.detail.offset, event.detail.offset + event.detail.length)
      if (!searchText) return
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
      const nodes: Text[] = []
      let node: Text | null
      while ((node = walker.nextNode() as Text | null)) nodes.push(node)
      let count = 0
      const targetOcc = event.detail.occurrence ?? 0
      for (const n of nodes) {
        const t = n.textContent || ''
        let idx = -1
        while ((idx = t.indexOf(searchText, idx + 1)) !== -1) {
          if (count === targetOcc) {
            const span = document.createElement('span')
            span.className = 'find-match-highlight'
            span.textContent = searchText
            const parent = n.parentNode
            if (parent) {
              void n.splitText(idx + searchText.length)
              const matchNode = n.splitText(idx)
              parent.replaceChild(span, matchNode)
            }
            span.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
          }
          count++
        }
      }
    }

    const handleFindHighlights = (e: Event) => {
      const event = e as CustomEvent<{ matches: Array<{ from: number; to: number }> }>
      if (isEditable || !viewRef.current) return
      const body = viewRef.current
      body.querySelectorAll('span.find-match-highlight').forEach(el => {
        el.replaceWith(document.createTextNode(el.textContent || ''))
      })
      body.normalize()
      if (event.detail.matches.length === 0) return
      const searchText = contentRef.current.slice(event.detail.matches[0].from, event.detail.matches[0].to)
      if (!searchText) return
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
      const nodes: Text[] = []
      let node: Text | null
      while ((node = walker.nextNode() as Text | null)) nodes.push(node)
      // Walk backwards so we don't invalidate remaining positions
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i]
        const t = n.textContent || ''
        let idx = t.length
        while (true) {
          idx = t.lastIndexOf(searchText, idx - 1)
          if (idx < 0) break
          const span = document.createElement('span')
          span.className = 'find-match-highlight'
          span.textContent = searchText
          const parent = n.parentNode
          if (parent) {
            void n.splitText(idx + searchText.length)
            const matchNode = n.splitText(idx)
            parent.replaceChild(span, matchNode)
          }
        }
      }
    }

    const handleFindClear = () => {
      if (viewRef.current) {
        viewRef.current.querySelectorAll('span.find-match-highlight').forEach(el => {
          el.replaceWith(document.createTextNode(el.textContent || ''))
        })
        viewRef.current.normalize()
      }
      window.getSelection()?.removeAllRanges()
    }

    window.addEventListener('scroll-to-heading', handleScrollToHeading)
    window.addEventListener('sync-scroll', handleSyncScroll)
    window.addEventListener('find-navigate', handleFindNavigate)
    window.addEventListener('find-highlights', handleFindHighlights as EventListener)
    window.addEventListener('find-clear', handleFindClear)
    return () => {
      window.removeEventListener('scroll-to-heading', handleScrollToHeading)
      window.removeEventListener('sync-scroll', handleSyncScroll)
      window.removeEventListener('find-navigate', handleFindNavigate)
      window.removeEventListener('find-highlights', handleFindHighlights as EventListener)
      window.removeEventListener('find-clear', handleFindClear)
    }
  }, [isEditable])

  const onScroll = () => {
    if (previewSyncBlocked || window.isExternalScrollSync) return
    const scroller = scrollContainerRef.current
    if (scroller) {
      const percentage = scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight || 1)
      window.dispatchEvent(new CustomEvent('sync-scroll', { detail: { source: 'preview', percentage } }))
    }
  }

  const handleWysiwygChange = (md: string) => {
    updateTabContent(tabId, md)
  }

  const handleOpenLink = async () => {
    if (!linkDialogUrl) return
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(linkDialogUrl)
    } catch {
      window.open(linkDialogUrl, '_blank')
    }
    setLinkDialogUrl(null)
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-1 bg-muted/20 border-b border-border shrink-0 select-none sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isEditable ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {isEditable ? 'Edit' : 'Preview'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/50">Ctrl+E</span>
          <button
          onClick={() => isEditable ? setIsEditable(false) : requestEditMode()}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1.5 border ${
            isEditable
              ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
              : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
          }`}
          title={isEditable ? "Lock preview (Ctrl+E)" : "Unlock to edit (Ctrl+E)"}
        >
          {isEditable ? <Unlock size={12} /> : <Lock size={12} />}
           {isEditable ? 'Lock' : 'Edit'}
          </button>
        </div>
      </div>
      {isEditable ? (
        <WysiwygPane content={content} onContentChange={handleWysiwygChange} />
      ) : (
        <div className="h-full w-full overflow-y-auto flex-1" ref={scrollContainerRef} onScroll={onScroll}>
          <div
            ref={viewRef}
            className="prose dark:prose-invert cat:prose-invert max-w-none p-8 md:p-12 pb-40 markdown-body mx-auto"
          />
        </div>
      )}
      {linkDialogUrl && (
        <ExternalLinkDialog url={linkDialogUrl} onConfirm={handleOpenLink} onCancel={() => setLinkDialogUrl(null)} />
      )}
      {showHtmlWarning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150" onClick={() => setShowHtmlWarning(false)}>
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-500/10 rounded-full text-amber-500">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <h3 className="text-lg font-semibold tracking-tight">HTML Content Detected</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This document contains raw HTML tags. Editing in WYSIWYG mode may alter or remove them. You can stay in source view or split view to safely preserve your HTML.
              </p>
            </div>
            <div className="bg-muted/30 p-4 px-6 flex justify-end gap-3 border-t border-border">
              <button onClick={() => setShowHtmlWarning(false)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={() => { setShowHtmlWarning(false) }} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors cursor-pointer border border-border">
                Stay in Source
              </button>
              <button onClick={() => { setShowHtmlWarning(false); setIsEditable(true) }} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:opacity-90 transition-colors shadow-sm cursor-pointer">
                Edit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
