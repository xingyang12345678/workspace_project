import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getRecords, getRecord } from "../../api/datasets";

interface Message {
  from?: string;
  role?: string;
  content?: string;
}

function ChatBlock({ label, messages }: { label: string; messages: Message[] }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, color: "#8af", marginBottom: 4 }}>{label}</div>
      {messages.map((m, i) => (
        <div key={i} style={{ marginLeft: 8, marginBottom: 4 }}>
          <span style={{ color: "#888" }}>{(m.from ?? m.role) ?? "unknown"}: </span>
          <span>{typeof m.content === "string" ? m.content : JSON.stringify(m.content)}</span>
        </div>
      ))}
    </div>
  );
}

export function DatasetViewer() {
  const [search] = useSearchParams();
  const path = search.get("path") ?? "";
  const file = search.get("file") ?? "";
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setTotal(0);
      setRecord(null);
      return;
    }
    getRecords(path, file, 0, 1).then((r) => {
      setTotal(r.total);
      setIndex(0);
      if (r.total > 0) getRecord(path, file, 0).then((r2) => setRecord(r2.data)).catch(() => setRecord(null));
      else setRecord(null);
    }).catch((e) => {
      setError(String(e));
      setTotal(0);
      setRecord(null);
    });
  }, [path, file]);

  useEffect(() => {
    if (!file || total === 0) return;
    getRecord(path, file, index)
      .then((r) => setRecord(r.data))
      .catch(() => setRecord(null));
  }, [path, file, index, total]);

  if (!file) {
    return (
      <div style={{ padding: 24 }}>
        <p>从左侧选择 datas 下的 JSONL 文件查看。</p>
      </div>
    );
  }

  if (error) return <div style={{ padding: 24, color: "#f88" }}>{error}</div>;

  const messages = (record?.messages as Message[] | undefined) ?? [];
  const chosen = (record?.chosen as Message[] | undefined) ?? [];
  const rejected = (record?.rejected as Message[] | undefined) ?? [];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <button
          type="button"
          disabled={index <= 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          上一条
        </button>
        <button
          type="button"
          disabled={index >= total - 1}
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
        >
          下一条
        </button>
        <span>
          第
          <input
            type="number"
            min={0}
            max={Math.max(0, total - 1)}
            value={index}
            onChange={(e) => setIndex(Math.max(0, Math.min(total - 1, parseInt(e.target.value, 10) || 0)))}
            style={{ width: 64, margin: "0 8px" }}
          />
          条 / 共 {total} 条
        </span>
      </div>
      <div style={{ background: "#252525", padding: 16, borderRadius: 8 }}>
        {messages.length > 0 && <ChatBlock label="Messages" messages={messages} />}
        {chosen.length > 0 && <ChatBlock label="Assistant (chosen)" messages={chosen} />}
        {rejected.length > 0 && <ChatBlock label="Assistant (rejected)" messages={rejected} />}
        {messages.length === 0 && chosen.length === 0 && rejected.length === 0 && record && (
          <pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(record, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
