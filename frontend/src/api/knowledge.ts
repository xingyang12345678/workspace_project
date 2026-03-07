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
  include_archived?: boolean;
}) {
  return get<{
    entries: { id: string; timestamp: string; day: string; text: string; tags: string[]; archived: boolean; archived_at?: string | null }[];
    total: number;
    offset: number;
    limit: number;
  }>("/api/knowledge", params as Record<string, string | number>);
}

export function createKnowledge(text: string, tags: string[] = []) {
  return post<{ id: string; timestamp: string; day: string; text: string; tags: string[]; archived: boolean }>(
    "/api/knowledge",
    { text, tags }
  );
}

export function updateKnowledge(
  id: string,
  patch: { text?: string; tags?: string[]; archived?: boolean }
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

export function archiveKnowledgeDay(day?: string) {
  return post<{ day: string; archived_count: number }>("/api/knowledge/archive", { day: day ?? null });
}
