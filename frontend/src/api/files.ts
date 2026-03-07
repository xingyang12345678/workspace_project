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

export function backupDatas() {
  return post<{ files_backed_up: number }>("/api/backup/datas");
}
