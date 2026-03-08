import { useEffect, useState } from "react";
import { listTasks, getTask, cancelTask, TaskRecord } from "../../api/tasks";

export function TaskCenter() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TaskRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");

  const load = () => {
    listTasks({ limit: 100, ...(filterStatus ? { status: filterStatus } : {}) }).then((r) => setTasks(r.tasks));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    getTask(selectedId).then(setDetail).catch(() => setDetail(null));
    const interval = setInterval(() => {
      getTask(selectedId).then(setDetail).catch(() => setDetail(null));
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedId]);

  const handleCancel = async (id: string) => {
    try {
      await cancelTask(id);
      load();
      if (selectedId === id) setDetail(null);
    } catch (_) {}
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>任务中心</h2>
      <p style={{ color: "#888", marginBottom: 16 }}>
        工具与 Pipeline 步骤在后台执行，可并行。此处查看所有任务状态与日志。
      </p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>状态筛选</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "4px 8px" }}>
          <option value="">全部</option>
          <option value="pending">pending</option>
          <option value="running">running</option>
          <option value="success">success</option>
          <option value="failed">failed</option>
          <option value="cancelled">cancelled</option>
        </select>
        <button type="button" onClick={load} style={{ marginLeft: 8 }}>
          刷新
        </button>
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div style={{ border: "1px solid var(--border-color, #333)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: 8, background: "var(--header-bg, #202020)", fontWeight: 600 }}>任务列表</div>
            {tasks.length === 0 ? (
              <div style={{ padding: 16, color: "#888" }}>暂无任务</div>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.task_id}
                  onClick={() => setSelectedId(t.task_id)}
                  style={{
                    padding: 10,
                    borderTop: "1px solid var(--border-color, #333)",
                    cursor: "pointer",
                    background: selectedId === t.task_id ? "var(--page-bg, #252525)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#888" }}>{t.task_id}</span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: t.status === "success" ? "#2a2" : t.status === "failed" ? "#a22" : t.status === "running" ? "#4af" : "#666",
                      }}
                    >
                      {t.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{t.type} · {JSON.stringify(t.payload).slice(0, 60)}…</div>
                </div>
              ))
            )}
          </div>
        </div>
        <div style={{ flex: "1 1 360px", minWidth: 0 }}>
          {detail ? (
            <div style={{ border: "1px solid var(--border-color, #333)", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <strong>{detail.task_id}</strong>
                {(detail.status === "pending" || detail.status === "running") && (
                  <button type="button" onClick={() => handleCancel(detail.task_id)}>
                    取消
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>类型: {detail.type} · 状态: {detail.status}</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Payload</div>
                <pre style={{ margin: 0, fontSize: 11, background: "#1a1a1a", padding: 8, borderRadius: 4, overflow: "auto" }}>
                  {JSON.stringify(detail.payload, null, 2)}
                </pre>
              </div>
              {detail.result && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Result</div>
                  <pre style={{ margin: 0, fontSize: 11, background: "#1a1a1a", padding: 8, borderRadius: 4, overflow: "auto", whiteSpace: "pre-wrap" }}>
                    {typeof detail.result === "object"
                      ? JSON.stringify(detail.result, null, 2)
                      : String(detail.result)}
                  </pre>
                </div>
              )}
              {detail.error && (
                <div style={{ color: "#f88", marginTop: 8 }}>{detail.error}</div>
              )}
            </div>
          ) : (
            <div style={{ color: "#888" }}>点击左侧任务查看详情</div>
          )}
        </div>
      </div>
    </div>
  );
}
