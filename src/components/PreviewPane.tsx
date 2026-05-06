import { useEffect, useRef, useState, useCallback } from 'react'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import markedKatex from 'marked-katex-extension'
import { gfmHeadingId } from 'marked-gfm-heading-id'
import footnote from 'marked-footnote'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import mermaid from 'mermaid'
import { useTabStore } from '../store/useTabStore'
import { Lock, Unlock, FileDown, Printer, Link as LinkIcon, Unlink } from 'lucide-react'
import WysiwygPane from './WysiwygPane'
import ExternalLinkDialog from './ExternalLinkDialog'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
// @ts-ignore
import html2pdf from 'html2pdf.js'

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

marked.use(gfmHeadingId())
marked.use(footnote())

marked.use({
  extensions: [
    {
      name: 'sub',
      level: 'inline',
      start(src) { return src.indexOf('~') },
      tokenizer(src) {
        const cap = /^~(?=[^\s~])([\s\S]*?[^\s~])~(?=[^~]|$)/.exec(src)
        if (cap) {
          return {
            type: 'sub',
            raw: cap[0],
            text: cap[1],
            tokens: this.lexer.inlineTokens(cap[1])
          }
        }
      },
      renderer(token) {
        return `<sub>${this.parser.parseInline(token.tokens || [])}</sub>`
      }
    },
    {
      name: 'sup',
      level: 'inline',
      start(src) { return src.indexOf('^') },
      tokenizer(src) {
        const cap = /^\^(?=[^\s^])([\s\S]*?[^\s^])\^(?=[^^]|$)/.exec(src)
        if (cap) {
          return {
            type: 'sup',
            raw: cap[0],
            text: cap[1],
            tokens: this.lexer.inlineTokens(cap[1])
          }
        }
      },
      renderer(token) {
        return `<sup>${this.parser.parseInline(token.tokens || [])}</sup>`
      }
    },
    {
      name: 'del',
      level: 'inline',
      start(src) { return src.indexOf('~~') },
      tokenizer(src) {
        const cap = /^~~(?=[^\s~])([\s\S]*?[^\s~])~~(?=[^~]|$)/.exec(src)
        if (cap) {
          return {
            type: 'del',
            raw: cap[0],
            text: cap[1],
            tokens: this.lexer.inlineTokens(cap[1])
          }
        }
      },
      renderer(token) {
        return `<del>${this.parser.parseInline(token.tokens || [])}</del>`
      }
    }
  ],
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
  resolvedTheme: 'light' | 'dark' | 'cat'
}

let previewSyncBlocked = false
let previewSyncTimer: ReturnType<typeof setTimeout> | null = null

export default function PreviewPane({ content, tabId, resolvedTheme }: Props) {
  const viewRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { updateTabContent, setPreviewEditMode, tabs, settings, updateSettings } = useTabStore()
  const [isEditable, setIsEditable] = useState(false)
  const [linkDialogUrl, setLinkDialogUrl] = useState<string | null>(null)
  const [exportSuccessPath, setExportSuccessPath] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showHtmlWarning, setShowHtmlWarning] = useState(false)
  const isDark = resolvedTheme === 'dark' || resolvedTheme === 'cat'
  const contentRef = useRef(content)

  const currentTab = tabs.find(t => t.id === tabId)
  const defaultFileName = currentTab?.title ? currentTab.title.replace(/\.[^/.]+$/, "") : 'export'

  const hasHtmlTags = (text: string) => /<[a-zA-Z/][^>]*>/.test(text)

  const requestEditMode = useCallback(() => {
    if (hasHtmlTags(contentRef.current)) {
      setShowHtmlWarning(true)
    } else {
      setIsEditable(true)
    }
  }, [])

  const getCleanedHTML = () => {
    if (!viewRef.current) return ''
    const clone = viewRef.current.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.katex-mathml').forEach(el => el.remove())
    let htmlStr = clone.innerHTML

    // Replace CSS variables with hardcoded safe hex values
    htmlStr = htmlStr.replace(/var\(--background\)/g, '#ffffff')
    htmlStr = htmlStr.replace(/var\(--foreground\)/g, '#000000')
    htmlStr = htmlStr.replace(/var\(--card\)/g, '#ffffff')
    htmlStr = htmlStr.replace(/var\(--card-foreground\)/g, '#000000')
    htmlStr = htmlStr.replace(/var\(--popover\)/g, '#ffffff')
    htmlStr = htmlStr.replace(/var\(--popover-foreground\)/g, '#000000')
    htmlStr = htmlStr.replace(/var\(--primary\)/g, '#000000')
    htmlStr = htmlStr.replace(/var\(--primary-foreground\)/g, '#ffffff')
    htmlStr = htmlStr.replace(/var\(--secondary\)/g, '#f4f4f4')
    htmlStr = htmlStr.replace(/var\(--secondary-foreground\)/g, '#000000')
    htmlStr = htmlStr.replace(/var\(--muted\)/g, '#f4f4f4')
    htmlStr = htmlStr.replace(/var\(--muted-foreground\)/g, '#666666')
    htmlStr = htmlStr.replace(/var\(--accent\)/g, '#f4f4f4')
    htmlStr = htmlStr.replace(/var\(--accent-foreground\)/g, '#000000')
    htmlStr = htmlStr.replace(/var\(--destructive\)/g, '#ff0000')
    htmlStr = htmlStr.replace(/var\(--border\)/g, '#dddddd')
    htmlStr = htmlStr.replace(/var\(--[a-zA-Z0-9-]+\)/g, 'currentColor')
    htmlStr = htmlStr.replace(/oklab\([^)]+\)/g, '#ffffff').replace(/oklch\([^)]+\)/g, '#ffffff')

    return htmlStr
  }

  const handleExportPDF = async () => {
    // Show a brief loading state to ensure layout updates are applied
    setIsExporting(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    try {
      window.print()
    } catch (err) {
      console.error("Print failed", err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportHTML = async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'HTML', extensions: ['html'] }],
        defaultPath: `${defaultFileName}.html`
      })
      if (filePath && viewRef.current) {
        setIsExporting(true)
        await new Promise(resolve => setTimeout(resolve, 100))

        const cleanHtml = getCleanedHTML()
        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${defaultFileName}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/katex.min.css" crossorigin="anonymous">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<style>
  body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 2rem; color: #24292e; background: #fff; }
  pre { background: #f6f8fa; padding: 1rem; border-radius: 8px; overflow-x: auto; border: 1px solid #e1e4e8; }
  code { font-family: ui-monospace, monospace; background: rgba(175,184,193,0.2); padding: 0.2rem 0.4rem; border-radius: 4px; }
  pre code { background: transparent; padding: 0; }
  blockquote { border-left: 4px solid #dfe2e5; margin-left: 0; padding-left: 1rem; color: #666; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
  th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
  th { background-color: #f9f9f9; }
  img { max-width: 100%; height: auto; border-radius: 4px; }
  .mermaid { text-align: center; margin: 2rem 0; }
  h1, h2, h3 { border-bottom: 1px solid #eee; padding-bottom: 0.3rem; }
</style>
</head>
<body>
${cleanHtml}
</body>
</html>`
        await writeTextFile(filePath, html)
        setIsExporting(false)
        setExportSuccessPath(filePath)
      }
    } catch (err) {
      console.error("Export to HTML failed", err)
      setIsExporting(false)
    }
  }

  const handleOpenExportFolder = async () => {
    if (exportSuccessPath) {
      try {
        const { revealItemInDir } = await import('@tauri-apps/plugin-opener')
        await revealItemInDir(exportSuccessPath)
      } catch (err) {
        console.error("Failed to open export folder", err)
      }
    }
    setExportSuccessPath(null)
  }

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
      theme: (isDark && !isExporting) ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif',
    })
  }, [isDark, isExporting])

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
          let sanitizedContent = DOMPurify.sanitize(htmlContent, {
            USE_PROFILES: { html: true, mathMl: true, svg: true },
            ADD_ATTR: ['class', 'style', 'target']
          })

          // Replace default footnote emoji with Lucide icon
          const lucideBackIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-corner-up-left inline-block ml-1 opacity-70 hover:opacity-100 transition-opacity translate-y-[2px]"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>`
          sanitizedContent = sanitizedContent.replace(/&#8617;&#xFE0E;/g, lucideBackIcon).replace(/↩︎?/g, lucideBackIcon)

          viewRef.current.innerHTML = sanitizedContent

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
  }, [content, isEditable, isDark, isExporting])

  // Handle anchor clicks (footnotes, headers, external links)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const onClick = async (e: MouseEvent) => {
      // Find the closest anchor tag
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href') || ''

      // Case 1: External Links
      if (href.startsWith('http://') || href.startsWith('https://')) {
        e.preventDefault()
        e.stopPropagation()
        setLinkDialogUrl(href)
        return
      } 

      // Case 2: Internal Anchors (Footnotes, Table of Contents, Back-links)
      if (href.startsWith('#')) {
        e.preventDefault()
        e.stopPropagation()
        
        const id = decodeURIComponent(href.slice(1))
        
        // Strategy: Try exact ID, then try finding an anchor with that name attribute
        let element = viewRef.current?.querySelector(`[id="${id}"]`) as HTMLElement | null
        if (!element) {
          element = viewRef.current?.querySelector(`a[name="${id}"]`) as HTMLElement | null
        }
        
        if (element && scrollContainerRef.current && viewRef.current) {
          const scroller = scrollContainerRef.current
          const content = viewRef.current
          
          // Use getBoundingClientRect for accuracy relative to the viewport
          const targetRect = element.getBoundingClientRect()
          const contentRect = content.getBoundingClientRect()
          
          // relativeTop is the distance from the top of the content container to the element
          const relativeTop = targetRect.top - contentRect.top
          
          scroller.scrollTo({
            top: relativeTop - 20, // Padding
            behavior: 'smooth'
          })
          
          // Optionally focus for accessibility
          element.focus({ preventScroll: true })
        }
        return
      }
    }

    // Capture phase listener to get ahead of any other handlers
    container.addEventListener('click', onClick, true)
    return () => container.removeEventListener('click', onClick, true)
  }, [content, isEditable])

  useEffect(() => {
    const handleScrollToHeading = (e: Event) => {
      const event = e as CustomEvent<{ text: string; level: number }>
      const { text, level } = event.detail
      const container = isEditable
        ? document.querySelector('.ProseMirror')
        : viewRef.current
      const scroller = scrollContainerRef.current
      
      if (container && scroller) {
        const tag = `H${level}`
        const headings = Array.from(container.querySelectorAll(tag))
        const target = headings.find(h => h.textContent?.trim() === text.trim())
        
        if (target) {
          window.isExternalScrollSync = true
          
          // Use manual calculation to avoid browser-level "jump to focus/view"
          const targetRect = target.getBoundingClientRect()
          const containerRect = scroller.getBoundingClientRect()
          const relativeTop = targetRect.top - containerRect.top + scroller.scrollTop
          
          scroller.scrollTo({
            top: relativeTop - 20, // Small padding
            behavior: 'smooth'
          })
          
          setTimeout(() => { window.isExternalScrollSync = false }, 500)
        }
      }
    }

    const handleSyncScroll = (e: Event) => {
      const event = e as CustomEvent<{ source: string; percentage: number }>
      if (event.detail.source === 'preview' || window.isExternalScrollSync || !useTabStore.getState().settings.syncScroll) return
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
    <div id="preview-pane-root" className="h-full w-full flex flex-col">
      <div className="preview-pane-toolbar flex items-center gap-3 px-3 py-1 bg-muted/20 border-b border-border shrink-0 select-none sticky top-0 z-10">
        <div className="flex items-center gap-2 shrink-0">
          <div className={`w-2 h-2 rounded-full ${isEditable ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {isEditable ? 'Edit' : 'Preview'}
          </span>
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth py-0.5">
          {settings.viewMode === 'split' && (
            <>
              <button
                onClick={() => updateSettings({ syncScroll: !settings.syncScroll })}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1.5 border shrink-0 ${
                  settings.syncScroll 
                    ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' 
                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                }`}
                title={settings.syncScroll ? "Disable Sync Scroll" : "Enable Sync Scroll"}
              >
                {settings.syncScroll ? <LinkIcon size={12} /> : <Unlink size={12} />}
                Sync Scroll
              </button>
              <div className="w-px h-4 bg-border mx-1 shrink-0"></div>
            </>
          )}
          {!isEditable && (
            <>
              <button
                onClick={handleExportHTML}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1.5 border bg-muted text-muted-foreground border-border hover:bg-muted/80 shrink-0"
                title="Export HTML"
              >
                <FileDown size={12} />
                Export HTML
              </button>
              <button
                onClick={handleExportPDF}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1.5 border bg-muted text-muted-foreground border-border hover:bg-muted/80 shrink-0"
                title="Export PDF"
              >
                <Printer size={12} />
                Export PDF
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">Ctrl+E</span>
          <button
            onClick={() => isEditable ? setIsEditable(false) : requestEditMode()}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1.5 border shrink-0 ${
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
        <div id="preview-scroll-container" className="h-full w-full overflow-y-auto flex-1" ref={scrollContainerRef} onScroll={onScroll}>
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
      {isExporting && (
        <div className="loading-overlay fixed top-10 bottom-0 left-0 right-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl p-8 flex flex-col items-center justify-center gap-4 animate-in zoom-in-95 duration-150">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-muted-foreground">Preparing document for print...</p>
          </div>
        </div>
      )}
      {exportSuccessPath && (
        <div className="export-success-modal fixed top-10 bottom-0 left-0 right-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150" onClick={() => setExportSuccessPath(null)}>
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/10 rounded-full text-green-500">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <h3 className="text-lg font-semibold tracking-tight">Export Successful</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Successfully saved to:
              </p>
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border text-sm font-mono text-foreground/80 overflow-x-auto whitespace-nowrap scrollbar-thin">
                {exportSuccessPath}
              </div>
            </div>
            <div className="bg-muted/30 p-4 px-6 flex justify-end gap-3 border-t border-border">
              <button onClick={() => setExportSuccessPath(null)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors cursor-pointer border border-border">
                Close
              </button>
              <button onClick={handleOpenExportFolder} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors shadow-sm cursor-pointer">
                Open Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
