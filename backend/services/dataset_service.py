"""JSONL parse, pagination, chat structure."""
import json
from pathlib import Path

from services.file_service import get_workspace_root, resolve_path


def _datas_path(rel_path: str) -> Path:
    """rel_path is relative to datas/."""
    root = get_workspace_root()
    if ".." in rel_path or rel_path.startswith("/"):
        from core.exceptions import PathOutsideWorkspaceError
        raise PathOutsideWorkspaceError("Invalid path")
    return (root / "datas" / rel_path).resolve()


def list_jsonl(rel_path: str) -> list[dict]:
    """List JSONL files in path (relative to datas). Returns [{name, path}, ...]."""
    p = _datas_path(rel_path)
    if not p.is_dir():
        return []
    out = []
    for f in sorted(p.glob("*.jsonl")):
        sub = f"{rel_path}/{f.name}" if rel_path else f.name
        out.append({"name": f.name, "path": sub})
    return out


def get_records(rel_path: str, file_name: str, offset: int = 0, limit: int = 50) -> tuple[list[dict], int]:
    """Return (records slice, total count)."""
    p = _datas_path(rel_path) / file_name
    if not p.is_file():
        return [], 0
    records = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    total = len(records)
    return records[offset : offset + limit], total


def get_record(rel_path: str, file_name: str, index: int) -> dict | None:
    """Get single record by index (0-based)."""
    p = _datas_path(rel_path) / file_name
    if not p.is_file():
        return None
    with open(p, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            if i == index:
                return json.loads(line)
            if i > index:
                break
    return None


def get_all_records(rel_path: str, file_name: str) -> list[dict]:
    """Return all records (for stats over full file)."""
    p = _datas_path(rel_path) / file_name
    if not p.is_file():
        return []
    records = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return records


def _msg_list_to_texts(lst: list) -> list[str]:
    """Extract content strings from a list of message dicts."""
    out = []
    for m in lst or []:
        if not isinstance(m, dict):
            continue
        c = m.get("content")
        if c is None:
            continue
        out.append(c if isinstance(c, str) else json.dumps(c, ensure_ascii=False))
    return out


def get_record_texts(record: dict) -> tuple[list[str], list[str], list[str]]:
    """Return (messages_texts, chosen_texts, rejected_texts). chosen/rejected may be single message dict or list."""
    messages = record.get("messages") or []
    chosen = record.get("chosen") or []
    rejected = record.get("rejected") or []
    if not isinstance(chosen, list):
        chosen = [chosen] if isinstance(chosen, dict) else []
    if not isinstance(rejected, list):
        rejected = [rejected] if isinstance(rejected, dict) else []
    return (_msg_list_to_texts(messages), _msg_list_to_texts(chosen), _msg_list_to_texts(rejected))
