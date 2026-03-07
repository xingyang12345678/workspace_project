import { useEffect, useState } from "react";
import { useContext } from "react";
import { listTools, runTool, ToolInfo } from "../../api/tools";
import { TerminalContext } from "../../components/Layout/Layout";

export function ToolRunner() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [argsStr, setArgsStr] = useState("");
  const [running, setRunning] = useState(false);
  const terminal = useContext(TerminalContext);

  useEffect(() => {
    listTools().then((r) => {
      setTools(r.tools);
      if (r.tools.length && !selected) setSelected(r.tools[0].id);
    });
  }, []);

  const run = async () => {
    if (!selected) return;
    setRunning(true);
    const args = argsStr.trim() ? argsStr.trim().split(/\s+/) : [];
    terminal?.appendTerminal(`$ ${selected} ${args.join(" ")}\n`, "info");
    try {
      const result = await runTool(selected, args);
      terminal?.appendTerminal(result.stdout, "stdout");
      if (result.stderr) terminal?.appendTerminal(result.stderr, "stderr");
      terminal?.appendTerminal(`exit code: ${result.exit_code}\n`, "info");
    } catch (e) {
      terminal?.appendTerminal(String(e), "stderr");
    }
    setRunning(false);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>工具执行</h2>
      <div style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>选择工具</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{ padding: "4px 8px", minWidth: 200 }}
        >
          {tools.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>参数（空格分隔）</label>
        <input
          type="text"
          value={argsStr}
          onChange={(e) => setArgsStr(e.target.value)}
          style={{ width: 400, padding: "4px 8px" }}
          placeholder="arg1 arg2"
        />
      </div>
      <button type="button" onClick={run} disabled={running || !selected}>
        {running ? "执行中…" : "执行"}
      </button>
    </div>
  );
}
