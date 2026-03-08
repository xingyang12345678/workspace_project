import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { readFileText, writeFile } from "../../api/files";

function languageForPath(path: string): string {
  const ext = path.replace(/^.*\./, "").toLowerCase();
  if (ext === "py") return "python";
  if (ext === "json") return "json";
  if (ext === "md") return "markdown";
  if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx") return ext;
  if (ext === "yaml" || ext === "yml") return "yaml";
  return "plaintext";
}

export function FileEditor() {
  const [search] = useSearchParams();
  const path = search.get("path") ?? "";
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialContentRef = useRef<string | null>(null);

  const load = useCallback(async (p: string) => {
    if (!p.trim()) {
      setLoading(false);
      setContent("");
      setError("未指定文件路径");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const text = await readFileText(p);
      setContent(text);
      initialContentRef.current = text;
      setDirty(false);
    } catch (e) {
      setError(String(e));
      setContent("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(path);
  }, [path, load]);

  const handleSave = useCallback(async () => {
    if (!path.trim() || !dirty) return;
    setSaving(true);
    try {
      await writeFile(path, content);
      initialContentRef.current = content;
      setDirty(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }, [path, content, dirty]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    setContent(value ?? "");
    setDirty(true);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  if (!path.trim()) {
    return (
      <div style={{ padding: 24, color: "#888" }}>
        从左侧文件树点击可编辑文件（如 functions/*.py、pipelines/*.json）打开编辑器。
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  if (error && !content) {
    return (
      <div style={{ padding: 24, color: "#f88" }}>
        加载失败: {error}
      </div>
    );
  }

  const lang = languageForPath(path);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 400 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 16px",
          borderBottom: "1px solid var(--border-color, #333)",
          background: "var(--page-bg, #1e1e1e)",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--accent, #8af)" }}>{path}</span>
        <span style={{ color: "#666", fontSize: 12 }}>{lang}</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{ marginLeft: "auto", padding: "6px 12px" }}
        >
          {saving ? "保存中…" : dirty ? "保存" : "已保存"}
        </button>
      </div>
      {error && <div style={{ padding: "4px 16px", color: "#f88", fontSize: 12 }}>{error}</div>}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          language={lang}
          value={content}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}
