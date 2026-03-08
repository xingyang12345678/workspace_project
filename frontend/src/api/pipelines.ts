import { get, post } from "./client";

export interface PipelineStep {
  tool_id: string;
  args: string[];
}

export function listPipelines() {
  return get<{ pipelines: { id: string; name: string }[] }>("/api/pipelines/list");
}

export function getPipeline(id: string) {
  return get<{ name: string; params: Record<string, string>; steps: PipelineStep[] }>(`/api/pipelines/${id}`);
}

export function getPipelineState(id: string) {
  return get<{
    current_step: number;
    confirmed: boolean;
    step_outputs: { stdout: string; stderr: string; exit_code: number }[];
    total_steps: number;
  }>(`/api/pipelines/${id}/state`);
}

export function createPipeline(name: string, steps: PipelineStep[], params: Record<string, string> = {}) {
  return post<{ id: string; name: string }>("/api/pipelines", { name, steps, params });
}

export function executeStep(id: string, params_override: Record<string, string> = {}) {
  return post<{
    status: string;
    current_step?: number;
    step_output?: { stdout: string; stderr: string; exit_code: number };
    step_outputs?: { stdout: string; stderr: string; exit_code: number }[];
    params_used?: Record<string, string>;
  }>(`/api/pipelines/${id}/execute/step`, { params_override });
}

export function confirmStep(id: string) {
  return post<{ status: string; current_step: number }>(`/api/pipelines/${id}/confirm`);
}

export function resetPipeline(id: string) {
  return post<{ status: string }>(`/api/pipelines/${id}/reset`);
}

export async function updatePipeline(
  id: string,
  patch: { name?: string; params?: Record<string, string>; steps?: PipelineStep[] }
) {
  const res = await fetch(`/api/pipelines/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ name: string; params: Record<string, string>; steps: PipelineStep[] }>;
}
