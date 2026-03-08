import { get, post } from "./client";

export interface FunctionInfo {
  id: string;
  name: string;
  category: string;
  description: string;
}

export function listFunctions() {
  return get<{ functions: FunctionInfo[] }>("/api/functions/list");
}

export function runFunction(functionId: string, record: Record<string, unknown>) {
  return post<{ result: { sections?: { title: string; type: string; messages?: unknown[]; items?: { k: string; v: unknown }[] }[] } }>(
    "/api/functions/run",
    { function_id: functionId, record }
  );
}
