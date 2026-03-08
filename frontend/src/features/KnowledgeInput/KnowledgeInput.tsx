import { useState, useCallback, useEffect, useRef } from "react";
import { createKnowledge } from "../../api/knowledge";

const NOTE_STORAGE_KEY = "ai-workspace-note-panel";

const DEFAULT = {
  left: typeof window !== "undefined" ? window.innerWidth - 360 : 40,
  top: 80,
  width: 340,
  height: 280,
  minimized: false,
};

function loadNoteLayout(): typeof DEFAULT {
  try {
    const s = localStorage.getItem(NOTE_STORAGE_KEY);
    if (s) {
      const o = JSON.parse(s);
      return {
        left: typeof o.left === "number" ? o.left : DEFAULT.left,
        top: typeof o.top === "number" ? o.top : DEFAULT.top,
        width: Math.max(280, Math.min(600, o.width ?? DEFAULT.width)),
        height: Math.max(200, Math.min(500, o.height ?? DEFAULT.height)),
        minimized: !!o.minimized,
      };
    }
  } catch (_) {}
  return { ...DEFAULT, left: typeof window !== "undefined" ? window.innerWidth - 360 : 40 };
}

function saveNoteLayout(o: typeof DEFAULT) {
  try {
    localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(o));
  } catch (_) {}
}

export function KnowledgeInput() {
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [sending, setSending] = useState(false);
  const [layout, setLayout] = useState(loadNoteLayout);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => saveNoteLayout(layout), [layout]);

  const submit = useCallback(async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const tagList = tags
        .split(/[,\s]+/)
        .map((x) => x.trim())
        .filter(Boolean);
      await createKnowledge(t, tagList);
      setText("");
      setTags("");
    } finally {
      setSending(false);
    }
  }, [text, tags, sending]);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, left: layout.left, top: layout.top };
    },
    [layout.left, layout.top]
  );

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing(true);
      resizeStart.current = { x: e.clientX, y: e.clientY, w: layout.width, h: layout.height };
    },
    [layout.width, layout.height]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setLayout((prev) => ({
        ...prev,
        left: Math.max(0, dragStart.current.left + dx),
        top: Math.max(0, dragStart.current.top + dy),
      }));
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const dw = e.clientX - resizeStart.current.x;
      const dh = e.clientY - resizeStart.current.y;
      setLayout((prev) => ({
        ...prev,
        width: Math.max(280, Math.min(600, resizeStart.current.w + dw)),
        height: Math.max(200, Math.min(500, resizeStart.current.h + dh)),
      }));
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  const toggleMinimize = useCallback(() => {
    setLayout((prev) => ({ ...prev, minimized: !prev.minimized }));
  }, []);

  const maximize = useCallback(() => {
    setLayout((prev) => ({ ...prev, width: 500, height: 400, minimized: false }));
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        left: layout.left,
        top: layout.top,
        width: layout.minimized ? 200 : layout.width,
        height: layout.minimized ? 40 : layout.height,
        minWidth: layout.minimized ? 200 : 280,
        minHeight: layout.minimized ? 40 : 200,
        maxWidth: 600,
        maxHeight: 500,
        background: "var(--page-bg, #252525)",
        border: "1px solid var(--border-color, #444)",
        borderRadius: 8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 1000,
      }}
    >
      <div
        onMouseDown={onDragStart}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          background: "var(--header-bg, #333)",
          borderBottom: layout.minimized ? "none" : "1px solid var(--border-color, #444)",
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--page-color, #ccc)" }}>Knowledge 快速记录</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button type="button" onClick={toggleMinimize} style={{ padding: "2px 6px", fontSize: 11 }}>
            {layout.minimized ? "展开" : "最小化"}
          </button>
          {!layout.minimized && (
            <button type="button" onClick={maximize} style={{ padding: "2px 6px", fontSize: 11 }}>
              放大
            </button>
          )}
        </div>
      </div>

      {!layout.minimized && (
        <>
          <div style={{ flex: 1, padding: 8, overflow: "auto", display: "flex", flexDirection: "column" }}>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="标签（逗号或空格分隔）"
              style={{
                width: "100%",
                marginBottom: 6,
                padding: "6px 8px",
                background: "var(--page-bg, #1a1a1a)",
                border: "1px solid var(--border-color, #444)",
                color: "var(--page-color, #e0e0e0)",
                borderRadius: 4,
              }}
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="想法、提示词、笔记..."
              rows={4}
              style={{
                width: "100%",
                flex: 1,
                resize: "none",
                padding: 8,
                background: "var(--page-bg, #1a1a1a)",
                border: "1px solid var(--border-color, #444)",
                color: "var(--page-color, #e0e0e0)",
                borderRadius: 4,
              }}
            />
            <button
              type="button"
              onClick={submit}
              disabled={sending || !text.trim()}
              style={{ marginTop: 8, padding: "6px 12px", alignSelf: "flex-start" }}
            >
              {sending ? "保存中…" : "保存"}
            </button>
          </div>
          <div
            onMouseDown={onResizeStart}
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 16,
              height: 16,
              cursor: "nwse-resize",
              background: "linear-gradient(135deg, transparent 50%, var(--border-color, #444) 50%)",
            }}
          />
        </>
      )}
    </div>
  );
}
