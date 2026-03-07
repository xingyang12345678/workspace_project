import { useNavigate } from "react-router-dom";
import { MODULES } from "./modules";

export function ModuleHub() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>AI 数据工作台</h1>
      <div style={{ color: "#888", marginBottom: 16 }}>
        在这里以“功能模块”的方式进入数据阅读、Pipeline、知识库等区域（后续可扩展为插件注入模块）。
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {MODULES.filter((m) => m.enabled !== false).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => navigate(m.path)}
            style={{
              textAlign: "left",
              padding: 16,
              borderRadius: 12,
              border: "1px solid #333",
              background: "#1f1f1f",
              color: "#e0e0e0",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{m.title}</div>
            <div style={{ color: "#aaa", fontSize: 13, lineHeight: 1.4 }}>{m.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

