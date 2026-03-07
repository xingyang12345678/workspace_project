export function PluginsPage() {
  return (
    <div style={{ padding: 24 }}>
      <h2>插件（预留）</h2>
      <p style={{ color: "#888" }}>
        当前 MVP 仅预留结构：后端 `backend/plugins/loader.py`、`backend/plugins/registry.py` 与 workspace 的 `plugins/` 目录。
      </p>
      <p style={{ color: "#888" }}>
        后续可扩展：插件添加 UI 面板、数据可视化、工具、pipeline 节点，并向“模块入口”注入新模块。
      </p>
    </div>
  );
}

