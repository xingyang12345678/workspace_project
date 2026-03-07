import { useContext } from "react";
import { TerminalContext } from "../../components/Layout/Layout";

export function TerminalPanel({ height = 200 }: { height?: number }) {
  const ctx = useContext(TerminalContext);
  if (!ctx) return null;
  const { terminalLines, clearTerminal } = ctx;

  return (
    <div
      style={{
        height,
        background: "#0d0d0d",
        borderTop: "1px solid #333",
        overflow: "auto",
        fontFamily: "monospace",
        fontSize: 12,
        padding: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#888" }}>终端</span>
        <button
          type="button"
          onClick={clearTerminal}
          style={{ background: "#333", color: "#ccc", border: "none", padding: "2px 8px", cursor: "pointer" }}
        >
          清空
        </button>
      </div>
      {terminalLines.length === 0 ? (
        <div style={{ color: "#555" }}>工具输出与 pipeline 日志将显示在此处</div>
      ) : (
        terminalLines.map((line) => (
          <div
            key={line.id}
            style={{
              color: line.type === "stderr" ? "#f88" : line.type === "info" ? "#8af" : "#ccc",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {line.text}
          </div>
        ))
      )}
    </div>
  );
}
