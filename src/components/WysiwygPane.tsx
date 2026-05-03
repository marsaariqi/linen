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
import { Markdown } from 'tiptap-markdown'
import { common, createLowlight } from 'lowlight'
import { useTabStore } from '../store/useTabStore'
import type { Editor } from '@tiptap/core'
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Quote, Undo2, Redo2, Heading1, Heading2, Heading3,
  Table2, Minus, Link, Code2
} from 'lucide-react'

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
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      <Icon size={16} />
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const url = window.prompt('Enter URL')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border bg-background shrink-0 flex-wrap">
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
      <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} icon={Code} title="Inline Code" />
      <div className="w-px h-5 bg-border mx-1" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={List} title="Bullet List" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={ListOrdered} title="Numbered List" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} icon={Quote} title="Blockquote" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} icon={Code2} title="Code Block" />
      <div className="w-px h-5 bg-border mx-1" />
      <ToolbarButton onClick={setLink} active={editor.isActive('link')} icon={Link} title="Link" />
      <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} active={false} icon={Table2} title="Table" />
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} icon={Minus} title="Horizontal Rule" />
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
      Markdown.configure({ transformPastedText: true, transformCopiedText: true }),
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
      if (event.detail.source === 'preview' || blocked || window.isExternalScrollSync || recentlyEdited()) return
      const scroller = scrollContainerRef.current
      if (scroller) {
        blocked = true
        if (timer) clearTimeout(timer)
        scroller.scrollTop = event.detail.percentage * (scroller.scrollHeight - scroller.clientHeight)
        timer = setTimeout(() => { blocked = false }, 50)
      }
    }

    const onScroll = () => {
      if (blocked || justSetContent.current || window.isExternalScrollSync || recentlyEdited()) return
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
    <div className="h-full w-full flex flex-col">
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
