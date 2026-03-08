import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FileExplorer } from "../../features/FileExplorer/FileExplorer";
import { TerminalPanel } from "../../features/TerminalPanel/TerminalPanel";
import { KnowledgeInput } from "../../features/KnowledgeInput/KnowledgeInput";
import { AIHub } from "../../features/AIHub/AIHub";

const LAYOUT_STORAGE_KEY = "ai-workspace-layout";

function loadLayout(): { sidebarOpen: boolean; terminalOpen: boolean; sidebarWidth: number; theme: "dark" | "light" } {
  try {
    const s = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (s) {
      const o = JSON.parse(s);
      return {
        sidebarOpen: o.sidebarOpen !== false,
        terminalOpen: o.terminalOpen !== false,
        sidebarWidth: typeof o.sidebarWidth === "number" ? Math.max(200, Math.min(500, o.sidebarWidth)) : 260,
        theme: o.theme === "light" ? "light" : "dark",
      };
    }
  } catch (_) {}
  return { sidebarOpen: true, terminalOpen: true, sidebarWidth: 260, theme: "dark" };
}

function saveLayout(o: { sidebarOpen: boolean; terminalOpen: boolean; sidebarWidth: number; theme: "dark" | "light" }) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(o));
  } catch (_) {}
}

export interface TerminalLine {
  id: string;
  text: string;
  type: "stdout" | "stderr" | "info";
}

interface WorkspaceContextValue {
  terminalLines: TerminalLine[];
  appendTerminal: (text: string, type?: "stdout" | "stderr" | "info") => void;
  clearTerminal: () => void;
}

export const TerminalContext = createContext<WorkspaceContextValue | null>(null);

let idCounter = 0;
function nextId() {
  return String(++idCounter);
}

export function Layout() {
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [layout, setLayout] = useState(loadLayout);
  const [resizing, setResizing] = useState(false);
  const terminalHeight = 200;
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", layout.theme);
  }, [layout.theme]);

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  const appendTerminal = useCallback((text: string, type: "stdout" | "stderr" | "info" = "stdout") => {
    setTerminalLines((prev) => [...prev, { id: nextId(), text, type }]);
  }, []);

  const clearTerminal = useCallback(() => setTerminalLines([]), []);

  const setSidebarOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setLayout((prev) => ({ ...prev, sidebarOpen: typeof v === "function" ? v(prev.sidebarOpen) : v }));
  }, []);
  const setTerminalOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setLayout((prev) => ({ ...prev, terminalOpen: typeof v === "function" ? v(prev.terminalOpen) : v }));
  }, []);
  const setSidebarWidth = useCallback((w: number) => {
    setLayout((prev) => ({ ...prev, sidebarWidth: Math.max(200, Math.min(500, w)) }));
  }, []);
  const setTheme = useCallback((t: "dark" | "light") => {
    setLayout((prev) => ({ ...prev, theme: t }));
  }, []);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
  }, []);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      if (sidebarRef.current) {
        const rect = sidebarRef.current.getBoundingClientRect();
        const w = e.clientX - rect.left;
        setSidebarWidth(w);
      }
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, setSidebarWidth]);

  const cssVars = useMemo(
    () =>
      ({
        ["--terminal-height" as string]: layout.terminalOpen ? `${terminalHeight}px` : "0px",
      }) as React.CSSProperties,
    [layout.terminalOpen]
  );

  return (
    <TerminalContext.Provider value={{ terminalLines, appendTerminal, clearTerminal }}>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", ...cssVars }}>
        <header
          style={{
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderBottom: "1px solid var(--border-color, #333)",
            background: "var(--header-bg, #141414)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={() => navigate("/")}>
              主页
            </button>
            <button type="button" onClick={() => navigate(-1)}>
              回退
            </button>
            <button type="button" onClick={() => setSidebarOpen((v) => !v)}>
              {layout.sidebarOpen ? "关闭导航" : "打开导航"}
            </button>
            <button type="button" onClick={() => setTerminalOpen((v) => !v)}>
              {layout.terminalOpen ? "关闭终端" : "打开终端"}
            </button>
            <button type="button" onClick={() => navigate("/docs")}>
              文档
            </button>
            <button type="button" onClick={() => navigate("/tasks")}>
              任务
            </button>
            <button type="button" onClick={() => setTheme(layout.theme === "dark" ? "light" : "dark")}>
              {layout.theme === "dark" ? "浅色" : "深色"}
            </button>
          </div>
          <div style={{ fontWeight: 600 }}>AI 数据工作台</div>
          <div style={{ width: 120 }} />
        </header>
        <div
          style={{
            display: "flex",
            flex: 1,
            minHeight: 0,
            height: `calc(100vh - 44px - ${layout.terminalOpen ? terminalHeight : 0}px)`,
            overflow: "hidden",
          }}
        >
          {layout.sidebarOpen && (
            <div ref={sidebarRef} style={{ position: "relative", width: layout.sidebarWidth, flexShrink: 0 }}>
              <aside style={{ width: "100%", height: "100%", borderRight: "1px solid var(--border-color, #333)", overflow: "auto" }}>
                <FileExplorer />
              </aside>
              <div
                onMouseDown={onResizeStart}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 6,
                  height: "100%",
                  cursor: "col-resize",
                  background: resizing ? "var(--accent, #4a9)" : "transparent",
                }}
              />
            </div>
          )}
          <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <Outlet />
            </div>
          </main>
        </div>
        {layout.terminalOpen && <TerminalPanel height={terminalHeight} />}
      </div>
      <KnowledgeInput />
      <AIHub />
    </TerminalContext.Provider>
  );
}
