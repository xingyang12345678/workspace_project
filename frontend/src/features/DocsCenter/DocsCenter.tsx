import { useEffect, useState } from "react";

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

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchDoc(tab)
      .then((r) => setContent(r.content))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div style={{ padding: 24 }}>
      <h2>项目文档</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {DOC_KINDS.map(({ id, label }) => (
          <button key={id} type="button" onClick={() => setTab(id)} disabled={tab === id}>
            {label}
          </button>
        ))}
        <a href="/docs" target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", color: "#8af" }}>
          OpenAPI（/docs）
        </a>
      </div>
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
            borderRadius: 10,
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
  );
}

