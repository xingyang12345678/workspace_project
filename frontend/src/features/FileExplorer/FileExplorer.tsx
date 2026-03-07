import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTree, getFileTreeChildren, backupDatas, TreeNode } from "../../api/files";

export function FileExplorer() {
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [childrenCache, setChildrenCache] = useState<Record<string, TreeNode[]>>({});
  const [backingUp, setBackingUp] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getTree().then(setRoot);
  }, []);

  const loadChildren = async (path: string) => {
    if (childrenCache[path]) return;
    const list = await getFileTreeChildren(path);
    setChildrenCache((c) => ({ ...c, [path]: list }));
  };

  const doBackup = async () => {
    setBackingUp(true);
    try {
      const r = await backupDatas();
      alert(`备份完成，新增 ${r.files_backed_up} 个文件`);
    } catch (e) {
      alert(String(e));
    } finally {
      setBackingUp(false);
    }
  };

  const toggle = (path: string, isDir: boolean) => {
    if (!isDir) {
      if (path.startsWith("datas/")) {
        const rest = path.slice("datas/".length);
        const last = rest.lastIndexOf("/");
        const dir = last >= 0 ? rest.slice(0, last) : "";
        const file = last >= 0 ? rest.slice(last + 1) : rest;
        navigate(`/datasets?path=${encodeURIComponent(dir)}&file=${encodeURIComponent(file)}`);
      } else if (path.startsWith("tools/")) {
        navigate("/tools");
      } else if (path.startsWith("pipelines/")) {
        navigate("/pipelines");
      }
      return;
    }
    if (expanded.has(path)) {
      setExpanded((s) => {
        const next = new Set(s);
        next.delete(path);
        return next;
      });
      return;
    }
    setExpanded((s) => new Set(s).add(path));
    loadChildren(path);
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const isExpanded = expanded.has(node.path);
    const kids = node.is_dir && childrenCache[node.path];

    return (
      <div key={node.path} style={{ marginLeft: depth * 12 }}>
        <button
          type="button"
          onClick={() => toggle(node.path, node.is_dir)}
          style={{
            background: "none",
            border: "none",
            color: "#e0e0e0",
            cursor: "pointer",
            textAlign: "left",
            padding: "4px 8px",
            width: "100%",
          }}
        >
          {node.is_dir ? (isExpanded ? "▼ " : "▶ ") : "  "}
          {node.name || "workspace"}
        </button>
        {node.is_dir && isExpanded && kids && (
          <div>{kids.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!root) return;
    root.children?.forEach((c) => {
      if (expanded.has(c.path) && !childrenCache[c.path]) loadChildren(c.path);
    });
  }, [root, expanded]);

  if (!root) return <div style={{ padding: 8 }}>加载中...</div>;

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>Workspace</span>
        <button type="button" onClick={doBackup} disabled={backingUp} style={{ fontSize: 12, padding: "2px 6px" }}>
          {backingUp ? "备份中…" : "备份 datas"}
        </button>
      </div>
      {root.children?.map((c) => renderNode(c, 0))}
    </div>
  );
}
