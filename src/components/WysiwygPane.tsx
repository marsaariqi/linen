import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Image } from '@tiptap/extension-image'
import { Subscript as TiptapSubscript } from '@tiptap/extension-subscript'
import { Superscript as TiptapSuperscript } from '@tiptap/extension-superscript'
import { Markdown } from 'tiptap-markdown'
import { MathExtension, InlineMathNode } from 'tiptap-math-extension'
import { common, createLowlight } from 'lowlight'
import { useTabStore } from '../store/useTabStore'
import type { Editor } from '@tiptap/core'
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Quote, Undo2, Redo2, Heading1, Heading2, Heading3,
  Table2, Minus, Link, Code2, X, Check,
  Subscript as SubscriptIcon, Superscript as SuperscriptIcon
} from 'lucide-react'

// @ts-expect-error no types available
import mdSub from 'markdown-it-sub'
// @ts-expect-error no types available
import mdSup from 'markdown-it-sup'

const CustomSubscript = TiptapSubscript.extend({
  addStorage() {
    return {
      markdown: {
        serialize: { open: '~', close: '~', expelEnclosedWhitespace: true },
        parse: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setup(markdownit: any) {
            markdownit.use(mdSub)
          },
        },
      },
    }
  },
})

const CustomSuperscript = TiptapSuperscript.extend({
  addStorage() {
    return {
      markdown: {
        serialize: { open: '^', close: '^', expelEnclosedWhitespace: true },
        parse: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setup(markdownit: any) {
            markdownit.use(mdSup)
          },
        },
      },
    }
  },
})

const CustomInlineMathNode = InlineMathNode.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        serialize(state: any, node: any) {
          const latex = node.attrs.latex || ''
          if (node.attrs.display === 'yes') {
            state.write(`$$${latex}$$`)
          } else {
            state.write(`$${latex}$`)
          }
        },
        parse: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setup(markdownit: any) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            markdownit.inline.ruler.before('escape', 'latex', (state: any, silent: any) => {
              const src = state.src
              const pos = state.pos

              if (src.slice(pos, pos + 2) === '$$') {
                const end = src.indexOf('$$', pos + 2)
                if (end !== -1) {
                  if (!silent) {
                    const token = state.push('inlineMath', 'span', 0)
                    token.attrs = [
                      ['data-latex', src.slice(pos + 2, end)],
                      ['data-display', 'yes'],
                      ['data-type', 'inlineMath']
                    ]
                  }
                  state.pos = end + 2
                  return true
                }
              }

              if (src[pos] === '$') {
                if (src[pos + 1] === ' ' || src[pos + 1] === '$') return false
                const end = src.indexOf('$', pos + 1)
                if (end !== -1 && src[end - 1] !== ' ') {
                  if (!silent) {
                    const token = state.push('inlineMath', 'span', 0)
                    token.attrs = [
                      ['data-latex', src.slice(pos + 1, end)],
                      ['data-display', 'no'],
                      ['data-type', 'inlineMath']
                    ]
                  }
                  state.pos = end + 1
                  return true
                }
              }
              return false
            })
          }
        }
      }
    }
  }
})

const CustomMathExtension = MathExtension.extend({
  addExtensions() {
    return [CustomInlineMathNode]
  }
})

const lowlight = createLowlight(common)

interface Props {
  content: string
  onContentChange: (markdown: string) => void
}

function ToolbarButton({ onClick, active, icon: Icon, title }: {
  onClick: () => void; active: boolean; icon: React.ComponentType<{ size: number }>; title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors flex items-center justify-center ${
        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      <Icon size={16} />
    </button>
  )
}

function LinkDialog({ onSubmit, onCancel }: { onSubmit: (url: string) => void, onCancel: () => void }) {
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150" onMouseDown={onCancel}>
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-in zoom-in-95 duration-150" onMouseDown={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <Link size={24} />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Insert Link</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Enter the URL you want to link to:
          </p>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSubmit(url); if (e.key === 'Escape') onCancel(); }}
            placeholder="https://example.com"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
          />
        </div>
        <div className="bg-muted/30 p-4 px-6 flex justify-end gap-3 border-t border-border">
          <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors cursor-pointer">
            <X size={14} />
            Cancel
          </button>
          <button onClick={() => onSubmit(url)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors shadow-sm cursor-pointer">
            <Check size={14} />
            Insert Link
          </button>
        </div>
      </div>
    </div>
  )
}

function TableSelector({ onSelect, onCancel }: { onSelect: (rows: number, cols: number) => void, onCancel: () => void }) {
  const [hovered, setHovered] = useState({ r: 0, c: 0 })
  const [alignRight, setAlignRight] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const maxRows = 10
  const maxCols = 10

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      if (rect.right > window.innerWidth - 20) {
        setAlignRight(true)
      }
    }
    const handleDocClick = () => onCancel()
    document.addEventListener('mousedown', handleDocClick)
    return () => document.removeEventListener('mousedown', handleDocClick)
  }, [onCancel])

  return (
    <div 
      ref={ref}
      className={`absolute top-full mt-1 bg-card border border-border rounded-lg shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 ${alignRight ? 'right-0' : 'left-0'}`}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="text-xs text-muted-foreground font-medium mb-2 text-center select-none">
        {hovered.r > 0 && hovered.c > 0 ? `${hovered.c} x ${hovered.r} Table` : 'Insert Table'}
      </div>
      <div className="flex flex-col gap-1" onMouseLeave={() => setHovered({ r: 0, c: 0 })}>
        {Array.from({ length: maxRows }).map((_, r) => (
          <div key={r} className="flex gap-1">
            {Array.from({ length: maxCols }).map((_, c) => {
              const isHighlighted = r < hovered.r && c < hovered.c
              return (
                <div
                  key={c}
                  onMouseEnter={() => setHovered({ r: r + 1, c: c + 1 })}
                  onClick={() => onSelect(r + 1, c + 1)}
                  className={`w-4 h-4 border rounded-[1px] cursor-pointer transition-colors ${
                    isHighlighted ? 'bg-primary/40 border-primary' : 'border-border bg-muted/30'
                  }`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showTableSelector, setShowTableSelector] = useState(false)

  const handleLinkSubmit = (url: string) => {
    if (url) editor.chain().focus().setLink({ href: url }).run()
    setShowLinkDialog(false)
  }

  const handleTableSelect = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    setShowTableSelector(false)
  }

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border bg-background shrink-0 flex-wrap relative">
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false} icon={Undo2} title="Undo" />
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false} icon={Redo2} title="Redo" />
      <div className="w-px h-5 bg-border mx-1" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={Heading1} title="Heading 1" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={Heading2} title="Heading 2" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} icon={Heading3} title="Heading 3" />
      <div className="w-px h-5 bg-border mx-1" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={Bold} title="Bold (Ctrl+B)" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={Italic} title="Italic (Ctrl+I)" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon={Strikethrough} title="Strikethrough" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} icon={SubscriptIcon} title="Subscript" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} icon={SuperscriptIcon} title="Superscript" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} icon={Code} title="Inline Code" />
      <div className="w-px h-5 bg-border mx-1" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={List} title="Bullet List" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={ListOrdered} title="Numbered List" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} icon={Quote} title="Blockquote" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} icon={Code2} title="Code Block" />
      <div className="w-px h-5 bg-border mx-1" />
      <ToolbarButton onClick={() => setShowLinkDialog(true)} active={editor.isActive('link')} icon={Link} title="Link" />
      <div className="relative">
        <ToolbarButton onClick={() => setShowTableSelector(!showTableSelector)} active={showTableSelector} icon={Table2} title="Table" />
        {showTableSelector && (
          <TableSelector onSelect={handleTableSelect} onCancel={() => setShowTableSelector(false)} />
        )}
      </div>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} icon={Minus} title="Horizontal Rule" />

      {showLinkDialog && (
        <LinkDialog onSubmit={handleLinkSubmit} onCancel={() => setShowLinkDialog(false)} />
      )}
    </div>
  )
}

export default function WysiwygPane({ content, onContentChange }: Props) {
  const lastEmitted = useRef(content)
  const isInternal = useRef(false)
  const [, forceTick] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const justSetContent = useRef(false)
  const lastEditTime = useRef(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      CustomSubscript,
      CustomSuperscript,
      Markdown.configure({
        transformPastedText: true,
        transformCopiedText: true,
      }),
      CustomMathExtension.configure({ evaluation: false }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert cat:prose-invert max-w-none focus:outline-none p-8 md:p-12 pb-40 mx-auto min-h-full',
        spellcheck: 'false',
      },
    },
    onUpdate: ({ editor: ed }: { editor: Editor }) => {
      if (isInternal.current) return
      const storage = ed.storage as unknown as { markdown?: { getMarkdown?: () => string } }
      const md = storage.markdown?.getMarkdown?.() ?? ed.getText()
      const preserved = md.replace(/\\&lt;/g, '<').replace(/\\&gt;/g, '>')
      lastEmitted.current = preserved
      justSetContent.current = true
      lastEditTime.current = Date.now()
      requestAnimationFrame(() => { justSetContent.current = false })
      onContentChange(preserved)
    },
    immediatelyRender: true,
  }, [])

  useEffect(() => {
    if (!editor) return
    const tick = () => forceTick(n => n + 1)
    editor.on('selectionUpdate', tick)
    return () => {
      editor.off('selectionUpdate', tick)
    }
  }, [editor])

  // Handle image paste (screenshots, copied images)
  useEffect(() => {
    if (!editor) return
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const hasImage = Array.from(items).some(item => item.type.startsWith('image/'))
      if (!hasImage) return
      // If clipboard has HTML (e.g. from a web page), let tiptap-markdown transformPastedText handle it
      const hasHtml = Array.from(items).some(item => item.type === 'text/html')
      if (hasHtml) return
      // Pure image paste (e.g. screenshot) — handle ourselves
      e.preventDefault()
      e.stopPropagation()
      const imgItem = Array.from(items).find(item => item.type.startsWith('image/'))
      if (!imgItem) return
      const file = imgItem.getAsFile()
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const url = reader.result as string
        editor.chain().focus().setImage({ src: url }).run()
      }
      reader.readAsDataURL(file)
    }
    editor.view.dom.addEventListener('paste', handlePaste)
    return () => editor.view.dom.removeEventListener('paste', handlePaste)
  }, [editor])

  useEffect(() => {
    if (!editor || content === lastEmitted.current) return
    isInternal.current = true
    editor.commands.setContent(content, { emitUpdate: false })
    lastEmitted.current = content
    justSetContent.current = true
    requestAnimationFrame(() => { justSetContent.current = false })
    requestAnimationFrame(() => { isInternal.current = false })
  }, [content, editor])

  useEffect(() => {
    if (!editor) return
    const handleFindNavigate = (e: Event) => {
      const event = e as CustomEvent<{ offset: number; length: number; occurrence: number }>
      const body = editor.view.dom
      if (!body) return
      const content = useTabStore.getState().tabs.find(t => t.isActive)?.content ?? ''
      const searchText = content.slice(event.detail.offset, event.detail.offset + event.detail.length)
      if (!searchText) return
      // Clear old highlights
      body.querySelectorAll('span.find-match-highlight').forEach(el => {
        el.replaceWith(document.createTextNode(el.textContent || ''))
      })
      body.normalize()
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
      const body = editor.view.dom
      if (!body) return
      body.querySelectorAll('span.find-match-highlight').forEach(el => {
        el.replaceWith(document.createTextNode(el.textContent || ''))
      })
      body.normalize()
      if (event.detail.matches.length === 0) return
      const content = useTabStore.getState().tabs.find(t => t.isActive)?.content ?? ''
      const searchText = content.slice(event.detail.matches[0].from, event.detail.matches[0].to)
      if (!searchText) return
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
      const nodes: Text[] = []
      let node: Text | null
      while ((node = walker.nextNode() as Text | null)) nodes.push(node)
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
      const body = editor.view.dom
      if (body) {
        body.querySelectorAll('span.find-match-highlight').forEach(el => {
          el.replaceWith(document.createTextNode(el.textContent || ''))
        })
        body.normalize()
      }
    }

    window.addEventListener('find-navigate', handleFindNavigate)
    window.addEventListener('find-highlights', handleFindHighlights as EventListener)
    window.addEventListener('find-clear', handleFindClear)
    return () => {
      window.removeEventListener('find-navigate', handleFindNavigate)
      window.removeEventListener('find-highlights', handleFindHighlights as EventListener)
      window.removeEventListener('find-clear', handleFindClear)
    }
  }, [editor])

  // Scroll sync with source editor
  useEffect(() => {
    let blocked = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const recentlyEdited = () => Date.now() - lastEditTime.current < 250

    const handleSyncScroll = (e: Event) => {
      const event = e as CustomEvent<{ source: string; percentage: number }>
      if (event.detail.source === 'preview' || blocked || window.isExternalScrollSync || recentlyEdited() || !useTabStore.getState().settings.syncScroll) return
      const scroller = scrollContainerRef.current
      if (scroller) {
        blocked = true
        if (timer) clearTimeout(timer)
        scroller.scrollTop = event.detail.percentage * (scroller.scrollHeight - scroller.clientHeight)
        timer = setTimeout(() => { blocked = false }, 50)
      }
    }

    const onScroll = () => {
      if (blocked || justSetContent.current || window.isExternalScrollSync || recentlyEdited() || !useTabStore.getState().settings.syncScroll) return
      const scroller = scrollContainerRef.current
      if (scroller) {
        const percentage = scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight || 1)
        window.dispatchEvent(new CustomEvent('sync-scroll', { detail: { source: 'preview', percentage } }))
      }
    }

    const scroller = scrollContainerRef.current
    scroller?.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('sync-scroll', handleSyncScroll)

    return () => {
      scroller?.removeEventListener('scroll', onScroll)
      window.removeEventListener('sync-scroll', handleSyncScroll)
    }
  }, [])

  if (!editor) return null

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col">
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
