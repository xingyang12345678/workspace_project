import { useCallback, useEffect, useState } from "react";
import { useContext } from "react";
import {
  listPipelines,
  getPipeline,
  getPipelineState,
  createPipeline,
  confirmStep,
  resetPipeline,
  updatePipeline,
  PipelineStep,
} from "../../api/pipelines";
import { createTask, getTask } from "../../api/tasks";
import { listTools } from "../../api/tools";
import { TerminalContext } from "../../components/Layout/Layout";

export function PipelineEditor() {
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [definition, setDefinition] = useState<{ name: string; params: Record<string, string>; steps: PipelineStep[] } | null>(null);
  const [stepStatus, setStepStatus] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newSteps, setNewSteps] = useState<PipelineStep[]>([]);
  const [newStepTool, setNewStepTool] = useState("");
  const [newStepArgs, setNewStepArgs] = useState("");
  const [newParams, setNewParams] = useState<{ k: string; v: string }[]>([]);
  const [paramRows, setParamRows] = useState<{ k: string; v: string }[]>([]);
  const [paramDirty, setParamDirty] = useState(false);
  const [tools, setTools] = useState<{ id: string }[]>([]);
  const [execState, setExecState] = useState<{
    current_step: number;
    confirmed: boolean;
    step_outputs: { stdout: string; stderr: string; exit_code: number }[];
    total_steps: number;
  } | null>(null);
  const terminal = useContext(TerminalContext);

  const refreshState = useCallback(() => {
    if (!selectedId) return;
    getPipelineState(selectedId).then(setExecState).catch(() => setExecState(null));
  }, [selectedId]);

  useEffect(() => {
    listPipelines().then((r) => {
      setPipelines(r.pipelines);
      if (r.pipelines.length && !selectedId) setSelectedId(r.pipelines[0].id);
    });
    listTools().then((r) => setTools(r.tools));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDefinition(null);
      return;
    }
    getPipeline(selectedId)
      .then((d) => {
        setDefinition(d);
        const rows = Object.entries(d.params || {}).map(([k, v]) => ({ k, v }));
        setParamRows(rows);
        setParamDirty(false);
      })
      .catch(() => setDefinition(null));
    setStepStatus("");
    getPipelineState(selectedId).then(setExecState).catch(() => setExecState(null));
  }, [selectedId]);

  const runStep = async () => {
    if (!selectedId) return;
    const overrides: Record<string, string> = {};
    paramRows.forEach((r) => {
      const k = r.k.trim();
      if (!k) return;
      overrides[k] = r.v ?? "";
    });
    terminal?.appendTerminal(`[Pipeline] 执行步骤（后台任务）...\n`, "info");
    try {
      const { task_id } = await createTask("pipeline_step", { pipeline_id: selectedId, params_override: overrides });
      const poll = setInterval(async () => {
        try {
          const t = await getTask(task_id);
          if (t.status === "running" || t.status === "pending") return;
          clearInterval(poll);
          const res = t.result as { status?: string; step_output?: { stdout?: string; stderr?: string }; params_used?: Record<string, string> } | undefined;
          setStepStatus(res?.status ?? t.status);
          refreshState();
          if (res?.step_output) {
            terminal?.appendTerminal(res.step_output.stdout ?? "", "stdout");
            if (res.step_output.stderr) terminal?.appendTerminal(res.step_output.stderr, "stderr");
          }
          if (res?.params_used) terminal?.appendTerminal(`[Pipeline] params_used: ${JSON.stringify(res.params_used)}\n`, "info");
          if (t.error) terminal?.appendTerminal(t.error + "\n", "stderr");
        } catch (_) {
          clearInterval(poll);
        }
      }, 500);
    } catch (e) {
      terminal?.appendTerminal(String(e), "stderr");
    }
  };

  const confirm = async () => {
    if (!selectedId) return;
    const res = await confirmStep(selectedId);
    setStepStatus(res.status);
    refreshState();
    terminal?.appendTerminal(`[Pipeline] 已确认，可执行下一步\n`, "info");
  };

  const reset = async () => {
    if (!selectedId) return;
    await resetPipeline(selectedId);
    setStepStatus("reset");
    refreshState();
    terminal?.appendTerminal(`[Pipeline] 已重置\n`, "info");
  };

  const addNewStep = () => {
    if (!newStepTool) return;
    setNewSteps((prev) => [...prev, { tool_id: newStepTool, args: newStepArgs.trim() ? newStepArgs.trim().split(/\s+/) : [] }]);
    setNewStepTool("");
    setNewStepArgs("");
  };

  const addParamRow = () => {
    setParamRows((prev) => [...prev, { k: "", v: "" }]);
    setParamDirty(true);
  };

  const saveParams = async () => {
    if (!selectedId) return;
    const params: Record<string, string> = {};
    paramRows.forEach((r) => {
      const k = r.k.trim();
      if (!k) return;
      params[k] = r.v ?? "";
    });
    const updated = await updatePipeline(selectedId, { params });
    setDefinition(updated);
    setParamRows(Object.entries(updated.params || {}).map(([k, v]) => ({ k, v })));
    setParamDirty(false);
    terminal?.appendTerminal(`[Pipeline] 已保存参数\n`, "info");
  };

  const create = async () => {
    if (!newName.trim()) return;
    const params: Record<string, string> = {};
    newParams.forEach((r) => {
      const k = r.k.trim();
      if (!k) return;
      params[k] = r.v ?? "";
    });
    const res = await createPipeline(newName.trim(), newSteps, params);
    setPipelines((prev) => [...prev, { id: res.id, name: res.name }]);
    setSelectedId(res.id);
    setNewName("");
    setNewSteps([]);
    setNewParams([]);
    setDefinition({ name: res.name, params, steps: newSteps });
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Pipeline</h2>
      <div style={{ marginBottom: 16 }}>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ padding: "4px 8px", minWidth: 200, marginRight: 8 }}
        >
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={runStep} style={{ marginRight: 8 }}>
          执行当前步
        </button>
        <button type="button" onClick={confirm} style={{ marginRight: 8 }}>
          确认
        </button>
        <button type="button" onClick={reset}>重置</button>
      </div>
      {definition && definition.steps.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3>执行进度</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {definition.steps.map((step, idx) => {
              const current = execState?.current_step ?? 0;
              const done = idx < current;
              const isCurrent = idx === current;
              const pendingConfirm = isCurrent && !execState?.confirmed;
              let label = "等待中";
              if (done) label = "已完成";
              else if (pendingConfirm) label = "待确认";
              else if (isCurrent) label = "当前";
              return (
                <div
                  key={idx}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border-color, #333)",
                    background: done
                      ? "var(--accent, #4a9)"
                      : pendingConfirm
                        ? "#8a4"
                        : isCurrent
                          ? "#6af"
                          : "var(--page-bg, #252525)",
                    color: done || isCurrent || pendingConfirm ? "#111" : "var(--page-color, #888)",
                    fontSize: 12,
                  }}
                >
                  {idx + 1}. {step.tool_id} · {label}
                </div>
              );
            })}
          </div>
          {execState?.step_outputs && execState.step_outputs.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer", color: "var(--page-color, #888)" }}>查看各步输出</summary>
              <div style={{ marginTop: 8 }}>
                {execState.step_outputs.map((out, i) => (
                  <div key={i} style={{ marginBottom: 8, padding: 8, background: "#1a1a1a", borderRadius: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>步骤 {i + 1}</div>
                    {out.stdout && <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{out.stdout}</pre>}
                    {out.stderr && <pre style={{ margin: "4px 0 0", color: "#f88", whiteSpace: "pre-wrap" }}>{out.stderr}</pre>}
                    <div style={{ color: "#888" }}>exit: {out.exit_code}</div>
                  </div>
                ))}
              </div>
            </details>
          )}
          <div style={{ marginTop: 8 }}>状态: {stepStatus || "-"}</div>
        </div>
      )}

      <div style={{ marginTop: 12, marginBottom: 16 }}>
        <h3>参数（宏）</h3>
        <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>
          在步骤参数中可使用 <code>{"{{key}}"}</code> 或 <code>{"${key}"}</code>。执行时会用下表的值替换。
        </div>
        {selectedId ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button type="button" onClick={addParamRow}>新增参数</button>
              <button type="button" onClick={saveParams} disabled={!paramDirty}>保存参数到 Pipeline</button>
            </div>
            {paramRows.length === 0 ? (
              <div style={{ color: "#888" }}>暂无参数</div>
            ) : (
              <div style={{ border: "1px solid #333", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 80px", background: "#202020", padding: 8, fontWeight: 600 }}>
                  <div>Key</div>
                  <div>Value</div>
                  <div />
                </div>
                {paramRows.map((r, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 80px", gap: 8, padding: 8, borderTop: "1px solid #333" }}>
                    <input
                      value={r.k}
                      onChange={(e) => {
                        const v = e.target.value;
                        setParamRows((prev) => prev.map((x, i) => (i === idx ? { ...x, k: v } : x)));
                        setParamDirty(true);
                      }}
                      placeholder="例如: input_path"
                      style={{ padding: "4px 8px" }}
                    />
                    <input
                      value={r.v}
                      onChange={(e) => {
                        const v = e.target.value;
                        setParamRows((prev) => prev.map((x, i) => (i === idx ? { ...x, v } : x)));
                        setParamDirty(true);
                      }}
                      placeholder="例如: datas/raw/train.jsonl"
                      style={{ padding: "4px 8px" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setParamRows((prev) => prev.filter((_, i) => i !== idx));
                        setParamDirty(true);
                      }}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: "#888" }}>请选择一个 pipeline</div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>新建 Pipeline</h3>
        <div style={{ marginBottom: 8 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="名称"
            style={{ marginRight: 8, padding: "4px 8px" }}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ marginBottom: 6 }}>参数（可在步骤 args 中用 {"{{key}}"} 引用）：</div>
          <button
            type="button"
            onClick={() => setNewParams((p) => [...p, { k: "", v: "" }])}
            style={{ marginBottom: 6 }}
          >
            新增参数
          </button>
          {newParams.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {newParams.map((r, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={r.k}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNewParams((prev) => prev.map((x, i) => (i === idx ? { ...x, k: v } : x)));
                    }}
                    placeholder="key"
                    style={{ padding: "4px 8px", width: 180 }}
                  />
                  <input
                    value={r.v}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNewParams((prev) => prev.map((x, i) => (i === idx ? { ...x, v } : x)));
                    }}
                    placeholder="value"
                    style={{ padding: "4px 8px", width: 320 }}
                  />
                  <button type="button" onClick={() => setNewParams((prev) => prev.filter((_, i) => i !== idx))}>
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ marginBottom: 8 }}>
          步骤：
          <select value={newStepTool} onChange={(e) => setNewStepTool(e.target.value)} style={{ marginLeft: 8, padding: "4px 8px" }}>
            <option value="">-- 选择工具 --</option>
            {tools.map((t) => (
              <option key={t.id} value={t.id}>{t.id}</option>
            ))}
          </select>
          <input
            value={newStepArgs}
            onChange={(e) => setNewStepArgs(e.target.value)}
            placeholder="参数（空格分隔，支持宏 {{key}}）"
            style={{ marginLeft: 8, width: 200, padding: "4px 8px" }}
          />
          <button type="button" onClick={addNewStep} style={{ marginLeft: 8 }}>添加步骤</button>
        </div>
        {newSteps.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            已选 {newSteps.length} 步：{newSteps.map((s) => s.tool_id).join(" → ")}
          </div>
        )}
        <button type="button" onClick={create} disabled={!newName.trim()}>创建</button>
      </div>
    </div>
  );
}
