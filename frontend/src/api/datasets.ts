import { get } from "./client";

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
