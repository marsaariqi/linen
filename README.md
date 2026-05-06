<p align="center">
  <img src="public/icon.svg" width="140" alt="Linen Logo">
</p>

<h1 align="center">
Linen
</h1>

<p align="center">
  <a href="https://github.com/marsaariqi/linen/releases"><img src="https://img.shields.io/github/v/release/marsaariqi/linen?color=orange&label=version&logo=github" alt="Current Version"></a>
  <a href="https://github.com/marsaariqi/linen/actions/workflows/release.yml"><img src="https://github.com/marsaariqi/linen/actions/workflows/release.yml/badge.svg" alt="Build Status"></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/Changelog-CHANGELOG.md-green?logo=gitbook&logoColor=white" alt="Changelog"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License"></a>
</p>

**Linen** is a minimalist Tauri 2.0 desktop Markdown editor with real-time preview, split view, code syntax highlighting, Mermaid diagram support, WYSIWYG editing, and multi-tab workflow.

## Tech Stack

- **Frontend**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4
- **State**: Zustand
- **Backend**: Rust (Tauri 2.0)
- **Source Editor**: CodeMirror 6
- **WYSIWYG Editor**: Tiptap (ProseMirror) + tiptap-markdown
- **Preview**: marked.js + highlight.js + Mermaid

## Features

- **Multi-tab editing** with unsaved change tracking and right-click context menu
- **Three view modes**: Source, Split, Preview
- **WYSIWYG rich-text editing** with formatting toolbar (Ctrl+E to unlock preview)
- **Mermaid diagram** rendering (flowchart, sequence, Gantt, class, state, etc.)
- **Syntax highlighting** for 15+ languages via highlight.js + lowlight
- **Document outline sidebar** with heading navigation (Ctrl+B to toggle)
- **Export options**: Export preview to HTML or PDF natively
- **Drag-and-drop support**: Easily open .md files by dragging them into the window
- **Markdown Extensibility**: Subscript (`~sub~`), Superscript (`^sup^`), and Footnotes (`[^1]`)
- **Bidirectional scroll sync** between source editor and preview
- **Unified Find & Replace** (Ctrl+F) — match case, whole word, DOM-based highlighting in all modes
- **Image paste** in source (screenshots) and WYSIWYG (screenshots + web images)
- **Task lists** with checkbox rendering
- **Tauri FS persistence** with localStorage fallback
- **Debounced session auto-save** (500ms)
- **Three themes**: Light, Dark, Cat
- **Session restore** across app restarts
- **Native file dialogs** (open/save .md files)
- **External link confirmation** dialog
- **HTML content warning** when unlocking WYSIWYG on documents with raw HTML
- **Keyboard shortcuts**: Ctrl+N new tab, Ctrl+W close, Ctrl+Tab switch, Ctrl+B sidebar, Ctrl+E lock/unlock, Ctrl+S save, Ctrl+O open, Ctrl+F find, Ctrl+Shift+V cycle views
- **Settings**: theme, view mode, restore session, open app folder, manual update check

## Development

```bash
npm install
npm run dev         # Vite dev server (port 5173)
npx tauri dev       # Full Tauri desktop dev
```

## Build

```bash
npm run build       # tsc -b && vite build
npm run lint        # ESLint
npx tauri build     # Production Tauri build
```

## Release

See [RELEASE.md](./RELEASE.md) for the release process, CI/CD workflow, and update check setup.

## Project Structure

| Directory            | Purpose                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `src/`               | React frontend                                                             |
| `src/components/`    | UI components (EditorPane, PreviewPane, WysiwygPane, FindReplaceBar, etc.) |
| `src/store/`         | Zustand state management                                                   |
| `src/lib/`           | Utilities (storage, cn helper)                                             |
| `src-tauri/`         | Rust backend                                                               |
| `.github/workflows/` | CI/CD (release builds on tag push)                                         |
| `dist/`              | Vite build output                                                          |

## Roadmap

### Known Issues

- Find & Replace can be laggy or unresponsive in larger documents
- Scroll sync may drift in split view when editing rapidly in WYSIWYG mode
- HTML tags in markdown are not preserved when editing in WYSIWYG mode (Tiptap limitation)
- Image paste from web pages may produce inconsistent results across browsers
- Preview pane edit/lock bar may flicker or disappear during content changes

### Planned

- [ ] Spell check / grammar integration
- [x] Drag-and-drop file opening
- [ ] Recent files list
- [x] Export to PDF / HTML
- [ ] Custom CSS snippets for preview
- [ ] Plugin/extension system
- [ ] Vim / Emacs keybindings
- [ ] Typewriter / focus mode
- [ ] Presentation mode (slides from markdown)

## License

MIT
