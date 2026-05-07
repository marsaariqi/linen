# Changelog

## v0.2.1 (2026-05-07)

### New Features

- **Improved Empty State Experience**:
    - Added a "Show Welcome Screen" setting to toggle the automatic appearance of `Welcome.md` when no files are open.
    - Redesigned the "No active document" view with a modern UI, including quick-action buttons for creating a new document or opening an existing file.
    - Added keyboard shortcut hints to the empty state view for better discoverability.
- **Enhanced Sidebar Behavior**:
    - The Sidebar header and close button now remain visible even when no document is active.
    - Added a dedicated "No active document" message in the sidebar to maintain UI consistency.

## v0.2.0 (2026-05-05)

### New Features

- **Major: Advanced HTML & PDF Export**
    - Added ability to export Markdown to HTML and PDF formats directly from the Preview pane
    - Implemented a "Nuclear Unroll" strategy for PDF, ensuring multi-page documents flow correctly without clipping
    - Forced High-Contrast Light Theme for all PDF exports, ensuring readability regardless of active app theme
    - Native Mermaid diagram support in PDF: Diagrams now automatically re-render with a light theme for the final document
    - Sanitized PDF output by removing all application UI elements (tabs, status bar, toolbars)
- Added **Sync Scroll toggle** in Split view: Easily enable or disable bidirectional scrolling between the editor and preview (available in both locked and unlocked modes)
- Added editor zooming in Source view: Use `Ctrl + Mouse Wheel` or `Ctrl` and `+/-` to adjust font size (`Ctrl + 0` to reset)
- Added drag-and-drop file opening support for `.md` and `.txt` files
- Added extended Markdown syntax support: Subscripts (`~text~`), Superscripts (`^text^`), and Footnotes (`[^1]`)
- Improved security by sanitizing HTML content rendered in the Markdown preview using DOMPurify
- Refined internal document navigation (e.g., Table of Contents links) to perfectly scroll to elements without breaking the app UI

### Improvements & Bug Fixes

- **Toolbar & UI**:
    - Re-designed Preview toolbar with horizontal scrolling for better usability on narrow split-views
    - Improved responsiveness of fixed UI elements to prevent clipping during resize
- Fixed WYSIWYG toolbar clipping under the header in long documents


## v0.1.4 (2026-05-04)

### New Features

- Added a custom Link Dialog for inserting URLs in WYSIWYG mode
- Added an interactive Table Grid Selector (up to 10x10) to the WYSIWYG toolbar

### Bug Fixes

- Fixed WYSIWYG toolbar clipping under the header when typing at the bottom of long documents
- Fixed Table Grid Selector overflowing off the right side of the screen
- Fixed external links opening inside the application directly after exiting WYSIWYG edit mode

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
