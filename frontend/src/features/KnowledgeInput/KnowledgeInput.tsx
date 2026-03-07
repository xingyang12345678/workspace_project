import { useState, useCallback } from "react";
import { createKnowledge } from "../../api/knowledge";

export function KnowledgeInput() {
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [sending, setSending] = useState(false);

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

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(var(--terminal-height, 200px) + 16px)",
        right: 24,
        width: 320,
        background: "#252525",
        border: "1px solid #444",
        borderRadius: 8,
        padding: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Knowledge 快速记录</div>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="标签（逗号或空格分隔）"
        style={{
          width: "100%",
          marginBottom: 6,
          padding: "6px 8px",
          background: "#1a1a1a",
          border: "1px solid #444",
          color: "#e0e0e0",
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
        rows={2}
        style={{
          width: "100%",
          resize: "vertical",
          padding: 8,
          background: "#1a1a1a",
          border: "1px solid #444",
          color: "#e0e0e0",
          borderRadius: 4,
        }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={sending || !text.trim()}
        style={{ marginTop: 4, padding: "4px 12px" }}
      >
        {sending ? "保存中…" : "保存"}
      </button>
    </div>
  );
}
