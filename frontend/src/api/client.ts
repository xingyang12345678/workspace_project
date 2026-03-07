const BASE = "";

export async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  // Important: do NOT append url.search to `path` again, otherwise queries duplicate:
  // "/api/x?a=1" -> "/api/x?a=1?a=1"
  const res = await fetch(BASE + url.pathname + url.search);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
