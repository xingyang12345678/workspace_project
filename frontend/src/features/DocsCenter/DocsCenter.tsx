import { useEffect, useState } from "react";

type DocResp = { format: "markdown"; content: string };

async function fetchDoc(kind: "human" | "ai"): Promise<DocResp> {
  const res = await fetch(`/api/docs/${kind}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function DocsCenter() {
  const [tab, setTab] = useState<"human" | "ai">("human");
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
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => setTab("human")} disabled={tab === "human"}>
          人读版
        </button>
        <button type="button" onClick={() => setTab("ai")} disabled={tab === "ai"}>
          AI 读版
        </button>
        <a href="/docs" style={{ marginLeft: "auto", color: "#8af" }} onClick={(e) => e.preventDefault()}>
          （本页即文档中心）
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

