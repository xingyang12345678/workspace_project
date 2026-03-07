import { get, post } from "./client";

export interface ToolInfo {
  id: string;
  name: string;
  path: string;
}

export function listTools() {
  return get<{ tools: ToolInfo[] }>("/api/tools/list");
}

export function runTool(tool_id: string, args: string[] = [], env: Record<string, string> = {}) {
  return post<{ stdout: string; stderr: string; exit_code: number }>("/api/tools/run", {
    tool_id,
    args,
    env,
  });
}
