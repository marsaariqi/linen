# Changelog

## v0.1.3 (2026-05-04)

### New Features

- Added a native splashscreen with a theme-adaptive loading bar to improve startup feedback
- Main window now automatically maximizes when the application finishes loading

## v0.1.2 (2026-05-04)

### Bug Fixes

- Fixed save functionality (Ctrl+S, Save icon, Unsaved changes modal) by explicitly adding required Tauri v2 FS scope and write permissions
- Improved "Open App Folder" action in Settings to gracefully fall back to the app data directory if the session file has not been created yet

## v0.1.1 (2026-05-04)

### New Features

- Added LaTeX support with KaTeX for both Source and WYSIWYG modes
- Enhanced WYSIWYG LaTeX synchronization to prevent character escaping

### Bug Fixes

- Fixed Settings panel clipping on smaller screens (laptop size)
- Fixed "Open App Folder" functionality by adding missing Tauri FS permissions
- Perfectly centered the application icon horizontally

## v0.1.0 (2026-05-03)

### Initial Release

- Multi-tab Markdown editor with CodeMirror 6 source view and Tiptap WYSIWYG
- Real-time preview with marked.js, highlight.js, and Mermaid diagram support
- Three view modes: Source, Split, Preview
- WYSIWYG rich-text editing with formatting toolbar (Ctrl+E to toggle lock/unlock)
- Document outline sidebar with heading navigation (Ctrl+B to toggle)
- Bidirectional scroll sync between editor and preview
- Unified Find & Replace bar (Ctrl+F) with match case, whole word, DOM-based highlighting across all modes
- Three themes: Light, Dark, Cat
- Tauri 2.0 desktop integration with native file dialogs (open/save)
- Debounced session persistence via Tauri FS (localStorage fallback)
- 15+ programming language syntax highlighting via highlight.js + lowlight
- Tab management with unsaved changes dialog, right-click context menu
- Keyboard shortcuts: Ctrl+N new tab, Ctrl+W close, Ctrl+Tab/Ctrl+Shift+Tab switch, Ctrl+B sidebar, Ctrl+E lock/unlock, Ctrl+S save, Ctrl+O open, Ctrl+F find, Ctrl+Shift+V cycle views
- Settings modal (theme, default view mode, session restore, open app folder, manual update check)
- Real GitHub release check from marsaariqi/linen (manual — user decides when to update)
- Status bar (word count, line count, file path)
- Welcome.md guide on first launch
- External link confirmation dialog
- Image paste support in source editor (screenshots) and WYSIWYG (screenshots + web images)
- Task list rendering with checkbox support (single line)
- HTML content warning dialog when unlocking WYSIWYG on documents with raw HTML tags
- GitHub Actions workflow for automated cross-platform releases (Windows, macOS, Linux)
- RELEASE.md guide for versioning, tagging, and publishing releases
