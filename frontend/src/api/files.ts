import { get, post } from "./client";

export interface TreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: TreeNode[] | null;
}

export function getTree() {
  return get<TreeNode>("/api/files/tree");
}

export async function getFileTreeChildren(path: string): Promise<TreeNode[]> {
  const res = await get<{ children: TreeNode[] }>("/api/files/children", { path });
  return res.children ?? [];
}

export async function readFileText(path: string): Promise<string> {
  const url = new URL("/api/files/read", window.location.origin);
  url.searchParams.set("path", path);
  url.searchParams.set("as_text", "true");
  const res = await fetch(url.pathname + url.search);
  if (!res.ok) throw new Error(await res.text());
  return res.text();
}

export async function writeFile(path: string, content: string): Promise<void> {
  const res = await fetch("/api/files/write", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function createFile(path: string, content = ""): Promise<void> {
  const res = await fetch("/api/files/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function createDir(path: string): Promise<void> {
  const res = await fetch("/api/files/dir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function deletePath(path: string): Promise<void> {
  const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function movePath(fromPath: string, toPath: string): Promise<void> {
  const res = await fetch("/api/files/move", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from_path: fromPath, to_path: toPath }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export function backupDatas() {
  return post<{ files_backed_up: number }>("/api/backup/datas");
}
