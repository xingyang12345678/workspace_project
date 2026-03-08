import { get, post } from "./client";

export function listKnowledge(offset = 0, limit = 100) {
  return get<{
    entries: { id: string; timestamp: string; day: string; text: string; tags: string[]; archived: boolean }[];
    total: number;
    offset: number;
    limit: number;
  }>("/api/knowledge", { offset, limit });
}

export function listKnowledgeDays() {
  return get<{ days: { day: string; total: number; active: number; archived: number }[] }>("/api/knowledge/days");
}

export function listKnowledgeFiltered(params: {
  offset?: number;
  limit?: number;
  day?: string;
  tag?: string;
  q?: string;
  folder?: string;
  include_archived?: boolean;
}) {
  const clean: Record<string, string | number> = {
    offset: params.offset ?? 0,
    limit: params.limit ?? 200,
  };
  if (params.day != null && params.day !== "") clean.day = params.day;
  if (params.tag != null && params.tag !== "") clean.tag = params.tag;
  if (params.q != null && params.q !== "") clean.q = params.q;
  if (params.folder != null && params.folder !== "") clean.folder = params.folder;
  if (params.include_archived === true) clean.include_archived = "true";
  return get<{
    entries: { id: string; timestamp: string; day: string; text: string; tags: string[]; archived: boolean; folder?: string; archived_at?: string | null }[];
    total: number;
    offset: number;
    limit: number;
  }>("/api/knowledge", clean);
}

export function listKnowledgeFolders() {
  return get<{ folders: string[] }>("/api/knowledge/folders");
}

export function createKnowledge(text: string, tags: string[] = [], folder = "") {
  return post<{ id: string; timestamp: string; day: string; text: string; tags: string[]; folder?: string; archived: boolean }>(
    "/api/knowledge",
    { text, tags, folder }
  );
}

export function updateKnowledge(
  id: string,
  patch: { text?: string; tags?: string[]; folder?: string; archived?: boolean }
) {
  return fetch(`/api/knowledge/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).then(async (res) => {
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  });
}

export function deleteKnowledge(id: string) {
  return fetch(`/api/knowledge/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).then(async (res) => {
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  });
}

export function archiveKnowledgeDay(day?: string) {
  return post<{ day: string; archived_count: number }>("/api/knowledge/archive", { day: day ?? null });
}
