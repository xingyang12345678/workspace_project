import { useCallback, useEffect, useRef, useState } from "react";

type DocResp = { format: "markdown"; content: string };

async function fetchDoc(kind: string): Promise<DocResp> {
  const res = await fetch(`/api/docs/${kind}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const DOC_KINDS = [
  { id: "human", label: "人读版" },
  { id: "ai", label: "AI 读版" },
  { id: "chat-api", label: "接口文档（聊天）" },
] as const;

export function DocsCenter() {
  const [tab, setTab] = useState<string>("human");
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [winPos, setWinPos] = useState({ x: 80, y: 60 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startLeft: 0, startTop: 0 });

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchDoc(tab)
      .then((r) => setContent(r.content))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [tab]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: winPos.x, startTop: winPos.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [winPos.x, winPos.y]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setWinPos({
        x: Math.max(0, dragRef.current.startLeft + e.clientX - dragRef.current.startX),
        y: Math.max(0, dragRef.current.startTop + e.clientY - dragRef.current.startY),
      });
    },
    [dragging]
  );

  const onPointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>项目文档</h2>
      <p style={{ color: "var(--muted, #888)", marginBottom: 12 }}>
        下方为可拖动文档窗口，拖动标题栏可移动位置。
      </p>
      <div
        role="dialog"
        aria-label="文档窗口"
        style={{
          position: "fixed",
          left: winPos.x,
          top: winPos.y,
          width: "min(90vw, 720px)",
          height: "min(80vh, 560px)",
          display: "flex",
          flexDirection: "column",
          background: "var(--page-bg, #1e1e1e)",
          border: "1px solid var(--border-color, #444)",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          zIndex: 1000,
          overflow: "hidden",
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          onPointerDown={onPointerDown}
          style={{
            padding: "10px 14px",
            background: "var(--header-bg, #252525)",
            borderBottom: "1px solid var(--border-color, #333)",
            cursor: dragging ? "grabbing" : "grab",
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {DOC_KINDS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              style={{
                padding: "4px 10px",
                background: tab === id ? "var(--accent, #8af)" : "transparent",
                color: tab === id ? "#111" : "#e0e0e0",
                border: "1px solid var(--border-color, #444)",
                borderRadius: 6,
              }}
            >
              {label}
            </button>
          ))}
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: "auto", color: "var(--accent, #8af)", fontSize: 13 }}
          >
            OpenAPI（新标签）
          </a>
        </div>
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 16,
            minHeight: 0,
          }}
        >
          {loading ? (
            <div>加载中...</div>
          ) : error ? (
            <div style={{ color: "#f88" }}>{error}</div>
          ) : (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#0f0f0f",
                border: "1px solid #333",
                borderRadius: 8,
                padding: 16,
                margin: 0,
                lineHeight: 1.5,
                fontSize: 13,
              }}
            >
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
