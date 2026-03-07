import { createContext, useCallback, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FileExplorer } from "../../features/FileExplorer/FileExplorer";
import { TerminalPanel } from "../../features/TerminalPanel/TerminalPanel";
import { KnowledgeInput } from "../../features/KnowledgeInput/KnowledgeInput";
import { AIHub } from "../../features/AIHub/AIHub";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const terminalHeight = 200;
  const navigate = useNavigate();

  const appendTerminal = useCallback((text: string, type: "stdout" | "stderr" | "info" = "stdout") => {
    setTerminalLines((prev) => [...prev, { id: nextId(), text, type }]);
  }, []);

  const clearTerminal = useCallback(() => setTerminalLines([]), []);
  const cssVars = useMemo(
    () =>
      ({
        ["--terminal-height" as any]: terminalOpen ? `${terminalHeight}px` : "0px",
      }) as React.CSSProperties,
    [terminalOpen]
  );

  return (
    <TerminalContext.Provider value={{ terminalLines, appendTerminal, clearTerminal }}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", ...cssVars }}>
        <header
          style={{
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderBottom: "1px solid #333",
            background: "#141414",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={() => setSidebarOpen((v) => !v)}>
              {sidebarOpen ? "关闭导航" : "打开导航"}
            </button>
            <button type="button" onClick={() => setTerminalOpen((v) => !v)}>
              {terminalOpen ? "关闭终端" : "打开终端"}
            </button>
            <button type="button" onClick={() => navigate("/docs")}>
              文档
            </button>
          </div>
          <div style={{ fontWeight: 600 }}>AI 数据工作台</div>
          <div style={{ width: 120 }} />
        </header>
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {sidebarOpen && (
            <aside style={{ width: 260, borderRight: "1px solid #333", overflow: "auto" }}>
              <FileExplorer />
            </aside>
          )}
          <main style={{ flex: 1, overflow: "auto" }}>
            <Outlet />
          </main>
        </div>
        {terminalOpen && <TerminalPanel height={terminalHeight} />}
      </div>
      <KnowledgeInput />
      <AIHub />
    </TerminalContext.Provider>
  );
}
