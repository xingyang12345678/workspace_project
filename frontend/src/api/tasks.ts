import { get, post } from "./client";

export function createTask(type: "tool_run" | "pipeline_step", payload: Record<string, unknown>) {
  return post<{ task_id: string }>("/api/tasks", { type, payload });
}

export function listTasks(params?: { status?: string; type?: string; limit?: number }) {
  return get<{ tasks: TaskRecord[] }>("/api/tasks", params as Record<string, string | number>);
}

export function getTask(taskId: string) {
  return get<TaskRecord>(`/api/tasks/${taskId}`);
}

export function cancelTask(taskId: string) {
  return post<{ status: string }>(`/api/tasks/${taskId}/cancel`);
}

export interface TaskRecord {
  task_id: string;
  type: string;
  status: string;
  created_at: number;
  updated_at: number;
  payload: Record<string, unknown>;
  result?: { stdout?: string; stderr?: string; exit_code?: number; step_output?: unknown };
  error?: string | null;
}
