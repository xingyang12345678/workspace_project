import { del, get, post } from "./client";

export interface FieldMapping {
  messages_key?: string;
  chosen_key?: string;
  rejected_key?: string;
  content_key?: string;
  role_key?: string;
}

const fieldMappingPayload = (m?: FieldMapping | null) => (m ? { field_mapping: m } : {});

export function listJsonl(path: string = "") {
  return get<{ files: { name: string; path: string }[] }>("/api/datasets/list", { path });
}

export function getRecords(path: string, file: string, offset = 0, limit = 50) {
  return get<{ records: Record<string, unknown>[]; total: number; offset: number; limit: number }>(
    "/api/datasets/records",
    { path, file, offset, limit }
  );
}

export function getRecord(path: string, file: string, index: number) {
  return get<{ index: number; data: Record<string, unknown> }>("/api/datasets/record", { path, file, index });
}

export interface TokenCountResult {
  messages_count: number;
  chosen_count: number;
  rejected_count: number;
  messages_plus_chosen: number;
  messages_plus_rejected: number;
  per_message_tokens: number[][];
}

export function tokenCount(
  path: string,
  file: string,
  index: number,
  model: string,
  fieldMapping?: FieldMapping | null
) {
  return post<TokenCountResult>("/api/datasets/token-count", {
    path,
    file,
    index,
    model,
    ...fieldMappingPayload(fieldMapping),
  });
}

export interface TokenStatsResult {
  mean?: number;
  min?: number;
  max?: number;
  n?: number;
  std?: number;
  median?: number;
  p25?: number;
  p75?: number;
  p90?: number;
  histogram?: { bucket_edges: number[]; counts: number[] };
  chosen_wise?: TokenStatsResult;
  rejected_wise?: TokenStatsResult;
}

export function tokenStats(
  path: string,
  file: string,
  model: string,
  scope: string,
  fieldMapping?: FieldMapping | null
) {
  return post<TokenStatsResult>("/api/datasets/token-stats", {
    path,
    file,
    model,
    scope,
    ...fieldMappingPayload(fieldMapping),
  });
}

export function ngram(
  path: string,
  file: string,
  n: number,
  min_count: number,
  min_length: number,
  scope: string,
  unit: "char" | "word" = "char",
  fieldMapping?: FieldMapping | null
) {
  return post<{ items: { gram: string; count: number }[] }>("/api/datasets/ngram", {
    path,
    file,
    n,
    min_count,
    min_length,
    scope,
    unit,
    ...fieldMappingPayload(fieldMapping),
  });
}

export interface StringSearchResult {
  total_occurrences: number;
  records_with_match: number;
  per_record: { index: number; count: number }[];
  mean_per_record?: number;
  min_per_record?: number;
  max_per_record?: number;
  std_per_record?: number;
}

export function stringSearch(
  path: string,
  file: string,
  query: string,
  scope: string,
  fieldMapping?: FieldMapping | null
) {
  return post<StringSearchResult>("/api/datasets/string-search", {
    path,
    file,
    query,
    scope,
    ...fieldMappingPayload(fieldMapping),
  });
}

export interface RunScriptResult {
  stdout: string;
  stderr: string;
  error?: string;
}

export function runScript(
  path: string,
  file: string,
  script: string,
  fieldMapping?: FieldMapping | null
) {
  return post<RunScriptResult>("/api/datasets/run-script", {
    path,
    file,
    script,
    ...fieldMappingPayload(fieldMapping),
  });
}

export interface SavedScriptInfo {
  id: string;
  name: string;
  description: string;
}

export function listScripts() {
  return get<{ scripts: SavedScriptInfo[] }>("/api/datasets/scripts");
}

export function getScript(scriptId: string) {
  return get<{ id: string; body: string }>(`/api/datasets/script/${encodeURIComponent(scriptId)}`);
}

export function saveScript(scriptId: string, body: string) {
  return post<{ ok: boolean }>("/api/datasets/script/save", { id: scriptId, body });
}

export function deleteScript(scriptId: string) {
  return del<{ deleted: boolean }>(`/api/datasets/script/${encodeURIComponent(scriptId)}`);
}
