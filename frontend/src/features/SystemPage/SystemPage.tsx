import { useCallback, useEffect, useState } from "react";
import {
  clearCache,
  getUserDataStatus,
  exportKnowledgeDownload,
  wipeKnowledge,
  wipeScripts,
  wipeDatas,
  UserDataStatus,
} from "../../api/system";

export function SystemPage() {
  const [status, setStatus] = useState<UserDataStatus | null>(null);
  const [cacheResult, setCacheResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getUserDataStatus()
      .then(setStatus)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onClearCache = () => {
    setLoading(true);
    setCacheResult(null);
    setError(null);
    clearCache()
      .then((r) => setCacheResult(`已清除: ${r.removed.join(", ")}`))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  const onExportKnowledge = () => {
    exportKnowledgeDownload().catch((e) => setError(String(e)));
  };

  const onWipe = (name: string, fn: () => Promise<unknown>) => {
    if (!window.confirm(`确定要清空「${name}」吗？此操作不可恢复。`)) return;
    setLoading(true);
    setError(null);
    fn()
      .then(refresh)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <h2>系统与数据管理</h2>
      {error && <div style={{ color: "#f88", marginBottom: 12 }}>{error}</div>}

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>一键清除缓存</h3>
        <p style={{ color: "var(--muted, #888)", fontSize: 14, marginBottom: 8 }}>
          仅删除缓存（如 tokenizer 内存、__pycache__、.cache），不删除知识库、代码库、datas 等用户数据。
        </p>
        <button type="button" onClick={onClearCache} disabled={loading}>
          {loading ? "处理中…" : "清除缓存"}
        </button>
        {cacheResult && <div style={{ color: "#8a8", marginTop: 8 }}>{cacheResult}</div>}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>用户数据概览</h3>
        {status && (
          <ul style={{ marginBottom: 12 }}>
            <li>知识库条目: {status.knowledge_entries}</li>
            <li>数据集代码脚本: {status.dataset_scripts}</li>
            <li>datas 下 JSONL 文件数: {status.datas_jsonl_files}</li>
          </ul>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>知识库</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={onExportKnowledge}>
            导出 (JSONL)
          </button>
          <button
            type="button"
            onClick={() => onWipe("知识库", wipeKnowledge)}
            disabled={loading}
            style={{ color: "#f88" }}
          >
            清空
          </button>
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>代码库（数据集脚本）</h3>
        <p style={{ color: "var(--muted, #888)", fontSize: 14, marginBottom: 8 }}>
          脚本保存在 .ai-workspace/dataset_scripts/，可通过数据阅读页「代码」Tab 加载。
        </p>
        <button
          type="button"
          onClick={() => onWipe("代码库（所有已保存脚本）", wipeScripts)}
          disabled={loading}
          style={{ color: "#f88" }}
        >
          清空全部脚本
        </button>
      </section>

      <section>
        <h3 style={{ marginBottom: 8 }}>数据 (datas)</h3>
        <p style={{ color: "var(--muted, #888)", fontSize: 14, marginBottom: 8 }}>
          datas/ 下的 JSONL 文件。清空将删除所有 .jsonl 文件。
        </p>
        <button
          type="button"
          onClick={() => onWipe("datas 下所有 JSONL", wipeDatas)}
          disabled={loading}
          style={{ color: "#f88" }}
        >
          清空 datas 下 JSONL
        </button>
      </section>
    </div>
  );
}
