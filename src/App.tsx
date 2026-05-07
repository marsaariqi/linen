import { useEffect, useState, useRef } from "react";
import { useTabStore } from "./store/useTabStore";
import TabBar from "./components/TabBar";
import EditorPane from "./components/EditorPane";
import PreviewPane from "./components/PreviewPane";
import FindReplaceBar from "./components/FindReplaceBar";
import StatusBar from "./components/StatusBar";
import SettingsPanel from "./components/SettingsPanel";
import {
  Settings,
  Code,
  Columns,
  BookOpen,
  PanelLeftOpen,
  FolderOpen,
  Save,
  Plus,
  FileText,
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { basename } from "@tauri-apps/api/path";

type ViewMode = "source" | "split" | "preview";
const ALL_MODES: ViewMode[] = ["source", "split", "preview"];

function App() {
  const {
    isLoaded,
    loadInitialSession,
    settings,
    updateSettings,
    tabs,
    openFile,
    saveTab,
    addTab,
    closeTab,
    setActiveTab,
    previewEditMode,
  } = useTabStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const processingPaths = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadInitialSession();
  }, [loadInitialSession]);

  useEffect(() => {
    if (isLoaded) {
      import("@tauri-apps/api/core")
        .then(({ invoke }) => {
          invoke("close_splashscreen").catch(console.error);
        })
        .catch(() => {});
    }
  }, [isLoaded]);

  const resolvedTheme =
    settings.theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : settings.theme;

  const previewTheme =
    resolvedTheme === "cat"
      ? "cat"
      : resolvedTheme === "dark"
        ? "dark"
        : "light";

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark", "cat");
    root.classList.add(previewTheme);
  }, [previewTheme]);

  const activeTabId = tabs.find((t) => t.isActive)?.id;
  useEffect(() => {
    requestAnimationFrame(() => setShowFindReplace(false));
  }, [activeTabId]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let isMounted = true;

    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => {
        getCurrentWindow()
          .onDragDropEvent(async (event) => {
            if (event.payload.type === "drop") {
              for (const path of event.payload.paths) {
                if (processingPaths.current.has(path)) continue;

                if (
                  path.toLowerCase().endsWith(".md") ||
                  path.toLowerCase().endsWith(".txt")
                ) {
                  try {
                    processingPaths.current.add(path);
                    const content = await readTextFile(path);
                    const name = await basename(path);

                    useTabStore.setState((state) => {
                      const existingTab = state.tabs.find(
                        (t) => t.filePath === path,
                      );
                      if (existingTab) {
                        const updatedTabs = state.tabs.map((t) => ({
                          ...t,
                          isActive: t.id === existingTab.id,
                        }));
                        return {
                          tabs: updatedTabs,
                          activeTabId: existingTab.id,
                        };
                      }

                      const newTab = {
                        id: crypto.randomUUID(),
                        title: name,
                        content: content,
                        filePath: path,
                        isDirty: 0 as const,
                        isActive: true,
                      };

                      const updatedTabs = state.tabs.map((t) => ({
                        ...t,
                        isActive: false,
                      }));
                      return {
                        tabs: [...updatedTabs, newTab],
                        activeTabId: newTab.id,
                      };
                    });

                    setTimeout(() => {
                      processingPaths.current.delete(path);
                    }, 1000);
                  } catch (err) {
                    console.error("Failed to read dropped file:", err);
                    processingPaths.current.delete(path);
                  }
                }
              }
            }
          })
          .then((u) => {
            if (isMounted) {
              unlisten = u;
            } else {
              u(); // cleanup immediately if already unmounted
            }
          });
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        const idx = ALL_MODES.indexOf(settings.viewMode as ViewMode);
        const next = ALL_MODES[(idx + 1) % ALL_MODES.length];
        updateSettings({ viewMode: next });
      }

      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const activeTab = tabs.find((t) => t.isActive);
        if (activeTab) saveTab(activeTab.id);
      }

      if (e.ctrlKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        openFile();
      }

      if (e.ctrlKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowFindReplace(true);
      }

      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        addTab();
      }

      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        const activeTab = tabs.find((t) => t.isActive);
        if (activeTab) closeTab(activeTab.id);
      }

      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setShowSidebar((prev) => !prev);
      }

      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        const currentIdx = tabs.findIndex((t) => t.isActive);
        if (currentIdx !== -1 && tabs.length > 1) {
          const next = e.shiftKey
            ? (currentIdx - 1 + tabs.length) % tabs.length
            : (currentIdx + 1) % tabs.length;
          setActiveTab(tabs[next].id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    settings.viewMode,
    updateSettings,
    tabs,
    saveTab,
    openFile,
    addTab,
    closeTab,
    setActiveTab,
  ]);

  if (!isLoaded)
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    );

  const activeTab = tabs.find((t) => t.isActive);
  const previewKey = `${activeTab?.id ?? "none"}-${previewTheme}`;
  const isDarkTheme = previewTheme === "dark" || previewTheme === "cat";
  const viewMode = settings.viewMode as ViewMode;

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans">
      <PanelGroup
        autoSaveId="main-layout"
        direction="horizontal"
        className="h-full w-full"
      >
        {showSidebar && (
          <>
            <Panel
              id="sidebar-panel"
              order={1}
              defaultSize={20}
              minSize={15}
              maxSize={40}
              className="flex flex-col bg-muted/10 h-full no-print"
            >
              <Sidebar tab={activeTab} onClose={() => setShowSidebar(false)} />
            </Panel>
            <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize flex flex-col items-center justify-center h-full no-print" />
          </>
        )}

        <Panel
          id="content-panel"
          order={2}
          className="flex flex-col h-full overflow-hidden min-w-[300px]"
        >
          <div
            id="app-header-bar"
            className="flex items-center justify-between border-b border-border bg-muted/30 pl-2 pr-2 shrink-0 h-10 no-print"
          >
            <div className="flex items-center h-full flex-1 overflow-hidden no-print">
              {!showSidebar && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="p-1.5 mr-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors no-print"
                  title="Open Sidebar"
                >
                  <PanelLeftOpen size={16} />
                </button>
              )}
              <TabBar />
            </div>

            <div className="flex items-center gap-1 border-l border-border pl-2 ml-2 py-1 shrink-0 no-print">
              <div className="flex items-center gap-1 mr-2 border-r border-border pr-2 no-print">
                <button
                  onClick={() => openFile()}
                  className="p-1.5 hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors rounded no-print"
                  title="Open File (Ctrl+O)"
                >
                  <FolderOpen size={18} />
                </button>
                <button
                  onClick={() => activeTab && saveTab(activeTab.id)}
                  disabled={!activeTab}
                  className="p-1.5 hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors rounded disabled:opacity-50 no-print"
                  title="Save File (Ctrl+S)"
                >
                  <Save size={18} />
                </button>
              </div>

              <div className="flex items-center bg-muted rounded p-0.5 mr-2 no-print">
                <button
                  onClick={() => updateSettings({ viewMode: "source" })}
                  className={`p-1.5 rounded transition-colors no-print ${viewMode === "source" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title="Source Mode"
                >
                  <Code size={16} />
                </button>
                <button
                  onClick={() => updateSettings({ viewMode: "split" })}
                  className={`p-1.5 rounded transition-colors no-print ${viewMode === "split" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title="Split View"
                >
                  <Columns size={16} />
                </button>
                <button
                  onClick={() => updateSettings({ viewMode: "preview" })}
                  className={`p-1.5 rounded transition-colors no-print ${viewMode === "preview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title="Preview Mode (Ctrl+Shift+V)"
                >
                  <BookOpen size={16} />
                </button>
              </div>

              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors rounded no-print"
                title="Settings"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {showFindReplace && (
            <FindReplaceBar
              onClose={() => setShowFindReplace(false)}
              readOnly={viewMode === "preview" && !previewEditMode}
            />
          )}

          <div
            id="main-content-wrapper"
            className="flex-1 flex overflow-hidden"
          >
            {activeTab ? (
              <PanelGroup
                autoSaveId="editor-layout"
                direction="horizontal"
                className="h-full w-full"
              >
                {viewMode !== "preview" ? (
                  <Panel
                    id="editor-panel"
                    order={1}
                    defaultSize={50}
                    minSize={20}
                    className="flex flex-col no-print"
                  >
                    <EditorPane
                      tab={activeTab}
                      resolvedTheme={isDarkTheme ? "dark" : "light"}
                      sourceWrap={settings.sourceWrap}
                    />
                  </Panel>
                ) : (
                  <div className="hidden no-print">
                    <EditorPane
                      tab={activeTab}
                      resolvedTheme={isDarkTheme ? "dark" : "light"}
                    />
                  </div>
                )}

                {viewMode === "split" && (
                  <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize flex flex-col items-center justify-center z-10 no-print">
                    <div className="w-0.5 h-8 bg-muted-foreground/30 rounded-full no-print" />
                  </PanelResizeHandle>
                )}

                {viewMode !== "source" && (
                  <Panel
                    id="preview-panel"
                    order={2}
                    defaultSize={50}
                    minSize={40}
                    className="flex flex-col bg-card overflow-hidden"
                  >
                    <PreviewPane
                      key={previewKey}
                      content={activeTab.content}
                      tabId={activeTab.id}
                      resolvedTheme={isDarkTheme ? "dark" : "light"}
                    />
                  </Panel>
                )}
              </PanelGroup>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-background p-8 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-muted/50 rounded-2xl flex items-center justify-center mb-6 border border-border/50 shadow-sm group-hover:scale-105 transition-transform duration-300">
                  <FileText size={40} className="text-muted-foreground/40" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No active document</h3>
                <p className="text-muted-foreground max-w-[320px] mb-8 text-sm leading-relaxed">
                  Start by creating a new document or open an existing Markdown file from your computer.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => addTab()}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all font-medium text-sm shadow-sm"
                  >
                    <Plus size={18} />
                    New Document
                  </button>
                  <button
                    onClick={() => openFile()}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all font-medium text-sm border border-border shadow-sm"
                  >
                    <FolderOpen size={18} />
                    Open File
                  </button>
                </div>
                <div className="mt-12 flex items-center gap-6 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/50">
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] text-muted-foreground/80">
                      Ctrl+N
                    </kbd>
                    New
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] text-muted-foreground/80">
                      Ctrl+O
                    </kbd>
                    Open
                  </div>
                </div>
              </div>
            )}
          </div>

          <StatusBar tab={activeTab} />
        </Panel>
      </PanelGroup>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
