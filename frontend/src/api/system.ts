import { get, post } from "./client";

export function clearCache() {
  return post<{ cleared: boolean; removed: string[] }>("/api/system/clear-cache");
}

export interface UserDataStatus {
  knowledge_entries: number;
  dataset_scripts: number;
  datas_jsonl_files: number;
}

export function getUserDataStatus() {
  return get<UserDataStatus>("/api/system/user-data-status");
}

/** Fetch knowledge as text and trigger download. */
export async function exportKnowledgeDownload(): Promise<void> {
  const res = await fetch("/api/system/export/knowledge");
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  const blob = new Blob([text], { type: "application/jsonl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "knowledge_entries.jsonl";
  a.click();
  URL.revokeObjectURL(url);
}

export function wipeKnowledge() {
  return post<{ ok: boolean }>("/api/system/wipe/knowledge");
}

export function wipeScripts() {
  return post<{ ok: boolean }>("/api/system/wipe/scripts");
}

export function wipeDatas() {
  return post<{ ok: boolean }>("/api/system/wipe/datas");
}
