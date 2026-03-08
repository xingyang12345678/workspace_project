import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getTree,
  getFileTreeChildren,
  backupDatas,
  createFile,
  createDir,
  deletePath,
  movePath,
  TreeNode,
} from "../../api/files";

export function FileExplorer() {
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [childrenCache, setChildrenCache] = useState<Record<string, TreeNode[]>>({});
  const [backingUp, setBackingUp] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ node: TreeNode; x: number; y: number } | null>(null);
  const [newFileParent, setNewFileParent] = useState<string | null>(null);
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const [renameNode, setRenameNode] = useState<TreeNode | null>(null);
  const [deleteNode, setDeleteNode] = useState<TreeNode | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getTree().then(setRoot);
  }, []);

  const loadChildren = useCallback(async (path: string) => {
    setChildrenCache((c) => {
      if (c[path]) return c;
      getFileTreeChildren(path).then((list) => {
        setChildrenCache((prev) => ({ ...prev, [path]: list }));
      });
      return c;
    });
  }, []);

  const invalidateCache = useCallback((path: string) => {
    setChildrenCache((c) => {
      const next = { ...c };
      delete next[path];
      return next;
    });
  }, []);

  const refreshParent = useCallback(
    (parentPath: string) => {
      invalidateCache(parentPath);
      setExpanded((e) => new Set(e).add(parentPath));
      loadChildren(parentPath);
    },
    [loadChildren, invalidateCache]
  );

  useEffect(() => {
    const onClose = () => setContextMenu(null);
    document.addEventListener("click", onClose);
    return () => document.removeEventListener("click", onClose);
  }, []);

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

  const isEditableScript = (p: string) => {
    const editableDirs = ["functions/", "pipelines/", "knowledge/", "plugins/", "tools/"];
    if (!editableDirs.some((d) => p.startsWith(d))) return false;
    return /\.(py|json|md|yaml|yml|ts|tsx|js|jsx)$/i.test(p);
  };

  const toggle = (path: string, isDir: boolean) => {
    if (!isDir) {
      if (isEditableScript(path)) {
        navigate(`/editor?path=${encodeURIComponent(path)}`);
        return;
      }
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

  const parentPath = (node: TreeNode) =>
    node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/")) : "";

  const handleNewFile = async (parent: string, name: string) => {
    try {
      const fullPath = parent ? `${parent}/${name}` : name;
      await createFile(fullPath, "");
      setNewFileParent(null);
      refreshParent(parent || name.split("/")[0]);
    } catch (e) {
      alert(String(e));
    }
  };

  const handleNewFolder = async (parent: string, name: string) => {
    try {
      const fullPath = parent ? `${parent}/${name}` : name;
      await createDir(fullPath);
      setNewFolderParent(null);
      refreshParent(parent || name.split("/")[0]);
    } catch (e) {
      alert(String(e));
    }
  };

  const handleRename = async (node: TreeNode, newName: string) => {
    try {
      const parent = parentPath(node);
      const toPath = parent ? `${parent}/${newName}` : newName;
      await movePath(node.path, toPath);
      setRenameNode(null);
      refreshParent(parent || node.path.split("/")[0]);
    } catch (e) {
      alert(String(e));
    }
  };

  const handleDelete = async (node: TreeNode) => {
    try {
      await deletePath(node.path);
      setDeleteNode(null);
      setContextMenu(null);
      const parent = parentPath(node);
      if (parent) refreshParent(parent);
      else getTree().then(setRoot);
    } catch (e) {
      alert(String(e));
    }
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const isExpanded = expanded.has(node.path);
    const kids = node.is_dir && childrenCache[node.path];

    return (
      <div
        key={node.path}
        style={{ marginLeft: depth * 12 }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ node, x: e.clientX, y: e.clientY });
        }}
      >
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

      {contextMenu && (
        <div
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            background: "var(--page-bg, #252525)",
            border: "1px solid var(--border-color, #444)",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            padding: "4px 0",
            zIndex: 1000,
            minWidth: 140,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const parent = contextMenu.node.is_dir ? contextMenu.node.path : parentPath(contextMenu.node);
            return (
              <>
                <button
                  type="button"
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 12px", border: "none", background: "none", color: "#e0e0e0", cursor: "pointer" }}
                  onClick={() => {
                    setNewFileParent(parent);
                    setContextMenu(null);
                  }}
                >
                  新建文件
                </button>
                <button
                  type="button"
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 12px", border: "none", background: "none", color: "#e0e0e0", cursor: "pointer" }}
                  onClick={() => {
                    setNewFolderParent(parent);
                    setContextMenu(null);
                  }}
                >
                  新建文件夹
                </button>
              </>
            );
          })()}
          <button
            type="button"
            style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 12px", border: "none", background: "none", color: "#e0e0e0", cursor: "pointer" }}
            onClick={() => {
              setRenameNode(contextMenu.node);
              setContextMenu(null);
            }}
          >
            重命名
          </button>
          <button
            type="button"
            style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 12px", border: "none", background: "none", color: "#f88", cursor: "pointer" }}
            onClick={() => {
              setDeleteNode(contextMenu.node);
              setContextMenu(null);
            }}
          >
            删除
          </button>
        </div>
      )}

      {newFileParent !== null && (
        <NewFileModal
          parentPath={newFileParent}
          onClose={() => setNewFileParent(null)}
          onConfirm={handleNewFile}
        />
      )}
      {newFolderParent !== null && (
        <NewFolderModal
          parentPath={newFolderParent}
          onClose={() => setNewFolderParent(null)}
          onConfirm={handleNewFolder}
        />
      )}
      {renameNode && (
        <RenameModal
          node={renameNode}
          onClose={() => setRenameNode(null)}
          onConfirm={handleRename}
        />
      )}
      {deleteNode && (
        <DeleteConfirmModal
          node={deleteNode}
          onClose={() => setDeleteNode(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function NewFileModal({
  parentPath,
  onClose,
  onConfirm,
}: {
  parentPath: string;
  onClose: () => void;
  onConfirm: (parent: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }} onClick={onClose}>
      <div style={{ background: "#1a1a1a", padding: 16, borderRadius: 8, minWidth: 320 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ marginBottom: 8 }}>新建文件 {parentPath ? `（位于 ${parentPath}）` : ""}</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如 script.py"
          style={{ width: "100%", padding: "6px 8px", marginBottom: 12 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose}>取消</button>
          <button type="button" onClick={() => name.trim() && onConfirm(parentPath, name.trim())}>确定</button>
        </div>
      </div>
    </div>
  );
}

function NewFolderModal({
  parentPath,
  onClose,
  onConfirm,
}: {
  parentPath: string;
  onClose: () => void;
  onConfirm: (parent: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }} onClick={onClose}>
      <div style={{ background: "#1a1a1a", padding: 16, borderRadius: 8, minWidth: 320 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ marginBottom: 8 }}>新建文件夹 {parentPath ? `（位于 ${parentPath}）` : ""}</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="文件夹名"
          style={{ width: "100%", padding: "6px 8px", marginBottom: 12 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose}>取消</button>
          <button type="button" onClick={() => name.trim() && onConfirm(parentPath, name.trim())}>确定</button>
        </div>
      </div>
    </div>
  );
}

function RenameModal({
  node,
  onClose,
  onConfirm,
}: {
  node: TreeNode;
  onClose: () => void;
  onConfirm: (node: TreeNode, newName: string) => void;
}) {
  const [name, setName] = useState(node.name);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }} onClick={onClose}>
      <div style={{ background: "#1a1a1a", padding: 16, borderRadius: 8, minWidth: 320 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ marginBottom: 8 }}>重命名</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: "6px 8px", marginBottom: 12 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose}>取消</button>
          <button type="button" onClick={() => name.trim() && onConfirm(node, name.trim())}>确定</button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  node,
  onClose,
  onConfirm,
}: {
  node: TreeNode;
  onClose: () => void;
  onConfirm: (node: TreeNode) => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }} onClick={onClose}>
      <div style={{ background: "#1a1a1a", padding: 16, borderRadius: 8, minWidth: 320 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ marginBottom: 8 }}>确定删除 “{node.path}” ？{node.is_dir ? "（将删除该文件夹及其中所有内容）" : ""}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose}>取消</button>
          <button type="button" onClick={() => onConfirm(node)} style={{ color: "#f88" }}>删除</button>
        </div>
      </div>
    </div>
  );
}
