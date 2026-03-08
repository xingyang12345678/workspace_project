import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  archiveKnowledgeDay,
  createKnowledge,
  deleteKnowledge,
  listKnowledgeDays,
  listKnowledgeFiltered,
  listKnowledgeFolders,
  updateKnowledge,
} from "../../api/knowledge";

type Entry = {
  id: string;
  timestamp: string;
  day: string;
  text: string;
  tags: string[];
  folder?: string;
  archived: boolean;
  archived_at?: string | null;
};

export function KnowledgeManager() {
  const [days, setDays] = useState<{ day: string; total: number; active: number; archived: number }[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [editTags, setEditTags] = useState<string>("");
  const [editFolder, setEditFolder] = useState<string>("");
  const [archiveDayInput, setArchiveDayInput] = useState<string>("");
  const [showNew, setShowNew] = useState(false);
  const [newText, setNewText] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newFolder, setNewFolder] = useState("");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const refreshDays = async () => {
    const r = await listKnowledgeDays();
    setDays(r.days);
  };

  const refreshFolders = async () => {
    const r = await listKnowledgeFolders();
    setFolders(r.folders);
  };

  const refreshEntries = async () => {
    setLoading(true);
    try {
      const r = await listKnowledgeFiltered({
        offset: 0,
        limit: 200,
        day: selectedDay || undefined,
        tag: tag || undefined,
        q: q || undefined,
        folder: selectedFolder || undefined,
        include_archived: includeArchived,
      });
      setEntries(r.entries as Entry[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDays();
    refreshFolders();
  }, []);

  useEffect(() => {
    refreshEntries();
  }, [selectedDay, selectedFolder, tag, q, includeArchived]);

  const startEdit = (e: Entry) => {
    setEditId(e.id);
    setEditText(e.text);
    setEditTags((e.tags || []).join(" "));
    setEditFolder(e.folder ?? "");
  };

  const saveEdit = async () => {
    if (!editId) return;
    const tags = editTags
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    await updateKnowledge(editId, { text: editText, tags, folder: editFolder || undefined });
    setEditId(null);
    await refreshEntries();
    await refreshDays();
    await refreshFolders();
  };

  const handleDelete = async (e: Entry) => {
    if (!confirm(`确定删除这条知识？`)) return;
    await deleteKnowledge(e.id);
    await refreshEntries();
    await refreshDays();
    await refreshFolders();
  };

  const saveNew = async () => {
    const tags = newTags
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    await createKnowledge(newText, tags, newFolder);
    setShowNew(false);
    setNewText("");
    setNewTags("");
    setNewFolder("");
    await refreshEntries();
    await refreshDays();
    await refreshFolders();
  };

  const toggleArchived = async (e: Entry) => {
    await updateKnowledge(e.id, { archived: !e.archived });
    await refreshEntries();
    await refreshDays();
  };

  const archiveToday = async () => {
    await archiveKnowledgeDay(today);
    await refreshEntries();
    await refreshDays();
  };

  const archiveByDay = async () => {
    const d = archiveDayInput.trim();
    if (!d) return;
    await archiveKnowledgeDay(d);
    await refreshEntries();
    await refreshDays();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>知识库</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <label>
          文件夹：
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            style={{ marginLeft: 8, padding: "4px 8px" }}
          >
            <option value="">全部</option>
            {folders.map((f) => (
              <option key={f || "(根)"} value={f}>
                {f || "(根)"}
              </option>
            ))}
          </select>
        </label>

        <label>
          日期：
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            style={{ marginLeft: 8, padding: "4px 8px" }}
          >
            <option value="">全部</option>
            {days.map((d) => (
              <option key={d.day} value={d.day}>
                {d.day}（活跃 {d.active} / 归档 {d.archived}）
              </option>
            ))}
          </select>
        </label>

        <label>
          标签：
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="例如: prompt"
            style={{ marginLeft: 8, padding: "4px 8px" }}
          />
        </label>

        <label>
          搜索：
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索 text/tags"
            style={{ marginLeft: 8, padding: "4px 8px", width: 260 }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          包含已归档
        </label>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <button type="button" onClick={() => setShowNew(true)}>
          新建条目
        </button>
        <button type="button" onClick={archiveToday}>
          一键归档今天（{today}）
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={archiveDayInput}
            onChange={(e) => setArchiveDayInput(e.target.value)}
            placeholder="YYYY-MM-DD"
            style={{ padding: "4px 8px", width: 140 }}
          />
          <button type="button" onClick={archiveByDay}>
            归档指定日期
          </button>
        </div>
      </div>

      {loading ? (
        <div>加载中...</div>
      ) : entries.length === 0 ? (
        <div style={{ color: "#888" }}>暂无记录</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((e) => (
            <div key={e.id} style={{ background: "#252525", border: "1px solid #333", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                <div style={{ color: "#888", fontSize: 12 }}>
                  {e.day} · {e.timestamp} {e.archived ? "· 已归档" : ""}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => startEdit(e)}>
                    编辑
                  </button>
                  <button type="button" onClick={() => toggleArchived(e)}>
                    {e.archived ? "取消归档" : "归档"}
                  </button>
                  <button type="button" onClick={() => handleDelete(e)} style={{ color: "#f88" }}>
                    删除
                  </button>
                </div>
              </div>

              {(e.folder ?? "") !== "" && (
                <div style={{ color: "#6a6", fontSize: 12, marginBottom: 4 }}>📁 {e.folder}</div>
              )}
              <div className="knowledge-content" style={{ marginBottom: 6 }}>
                <ReactMarkdown>{e.text}</ReactMarkdown>
              </div>
              <div style={{ color: "#8af", fontSize: 12 }}>
                {(e.tags || []).length ? `# ${e.tags.join("  # ")}` : "（无标签）"}
              </div>
            </div>
          ))}
        </div>
      )}

      {editId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ width: 720, maxWidth: "100%", background: "#1a1a1a", border: "1px solid #444", borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>编辑知识条目</div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>文件夹（路径，如 work/ideas）</div>
              <input
                value={editFolder}
                onChange={(e) => setEditFolder(e.target.value)}
                placeholder="留空为根目录"
                style={{ width: "100%", padding: "6px 8px", background: "#0f0f0f", color: "#e0e0e0", border: "1px solid #444", borderRadius: 6 }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>标签（空格或逗号分隔）</div>
              <input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", background: "#0f0f0f", color: "#e0e0e0", border: "1px solid #444", borderRadius: 6 }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>内容（支持 Markdown）</div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={10}
                style={{ width: "100%", padding: 10, background: "#0f0f0f", color: "#e0e0e0", border: "1px solid #444", borderRadius: 6, resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setEditId(null)}>
                取消
              </button>
              <button type="button" onClick={saveEdit}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ width: 720, maxWidth: "100%", background: "#1a1a1a", border: "1px solid #444", borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>新建知识条目</div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>文件夹（路径）</div>
              <input
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="留空为根目录"
                style={{ width: "100%", padding: "6px 8px", background: "#0f0f0f", color: "#e0e0e0", border: "1px solid #444", borderRadius: 6 }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>标签（空格或逗号分隔）</div>
              <input
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", background: "#0f0f0f", color: "#e0e0e0", border: "1px solid #444", borderRadius: 6 }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>内容（支持 Markdown）</div>
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                rows={10}
                style={{ width: "100%", padding: 10, background: "#0f0f0f", color: "#e0e0e0", border: "1px solid #444", borderRadius: 6, resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setShowNew(false)}>取消</button>
              <button type="button" onClick={saveNew}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

