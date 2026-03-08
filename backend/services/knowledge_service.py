"""Knowledge CRUD: timestamp + text + tags + archive/edit.

Storage: knowledge/entries.jsonl (one JSON object per line).
We support rewriting the file for edits/archiving (MVP scale).
"""
import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from services.file_service import get_workspace_root

KNOWLEDGE_FILE = "knowledge/entries.jsonl"


def _path() -> Path:
    return get_workspace_root() / KNOWLEDGE_FILE


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _local_day() -> str:
    return datetime.now().date().isoformat()


def _normalize_entry(e: dict) -> dict:
    """Backwards-compatible normalization for older entries."""
    out = dict(e)
    if "id" not in out:
        out["id"] = uuid4().hex
    if "timestamp" not in out:
        out["timestamp"] = _now_utc_iso()
    if "day" not in out:
        try:
            ts = datetime.fromisoformat(str(out["timestamp"]).replace("Z", "+00:00"))
            out["day"] = ts.astimezone().date().isoformat()
        except Exception:
            out["day"] = _local_day()
    if "tags" not in out or out["tags"] is None:
        out["tags"] = []
    if "archived" not in out:
        out["archived"] = False
    if "archived_at" not in out:
        out["archived_at"] = None
    if "updated_at" not in out:
        out["updated_at"] = None
    if "text" not in out:
        out["text"] = ""
    if "folder" not in out:
        out["folder"] = ""
    return out


def _read_all() -> list[dict]:
    p = _path()
    if not p.exists():
        return []
    items: list[dict] = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                items.append(_normalize_entry(json.loads(line)))
            except json.JSONDecodeError:
                continue
    return items


def _rewrite_all(items: list[dict]) -> None:
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        for e in items:
            f.write(json.dumps(_normalize_entry(e), ensure_ascii=False) + "\n")
    tmp.replace(p)


def add_entry(text: str, tags: list[str] | None = None, folder: str = "") -> dict:
    """Append entry with timestamp + tags + optional folder."""
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    ts = _now_utc_iso()
    entry = {
        "id": uuid4().hex,
        "timestamp": ts,
        "day": _local_day(),
        "text": text,
        "tags": [t for t in (tags or []) if t.strip()],
        "folder": (folder or "").strip().strip("/"),
        "archived": False,
        "archived_at": None,
        "updated_at": None,
    }
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return entry


def list_entries(
    offset: int = 0,
    limit: int = 100,
    day: str | None = None,
    tag: str | None = None,
    q: str | None = None,
    folder: str | None = None,
    include_archived: bool = False,
) -> tuple[list[dict], int]:
    """Return (entries slice, total) with optional filtering.

    Ordering: newest first by timestamp string.
    """
    entries = _read_all()
    if not include_archived:
        entries = [e for e in entries if not bool(e.get("archived"))]
    if folder is not None:
        fnorm = (folder or "").strip().strip("/")
        entries = [e for e in entries if (e.get("folder") or "") == fnorm]
    if day:
        entries = [e for e in entries if str(e.get("day")) == day]
    if tag:
        entries = [e for e in entries if tag in (e.get("tags") or [])]
    if q:
        qn = q.strip().lower()
        if qn:
            entries = [
                e
                for e in entries
                if qn in str(e.get("text", "")).lower()
                or any(qn in str(t).lower() for t in (e.get("tags") or []))
            ]
    entries.sort(key=lambda e: str(e.get("timestamp", "")), reverse=True)
    total = len(entries)
    return entries[offset : offset + limit], total


def delete_entry(entry_id: str) -> bool:
    """Remove entry by id; rewrites file. Returns True if removed."""
    items = _read_all()
    new_items = [e for e in items if str(e.get("id")) != entry_id]
    if len(new_items) == len(items):
        return False
    _rewrite_all(new_items)
    return True


def update_entry(
    entry_id: str,
    text: str | None = None,
    tags: list[str] | None = None,
    folder: str | None = None,
    archived: bool | None = None,
) -> dict | None:
    """Update an entry by id; rewrites file."""
    items = _read_all()
    updated = None
    for e in items:
        if str(e.get("id")) != entry_id:
            continue
        if text is not None:
            e["text"] = text
        if tags is not None:
            e["tags"] = [t for t in tags if str(t).strip()]
        if folder is not None:
            e["folder"] = (folder or "").strip().strip("/")
        if archived is not None:
            e["archived"] = bool(archived)
            e["archived_at"] = _now_utc_iso() if bool(archived) else None
        e["updated_at"] = _now_utc_iso()
        updated = _normalize_entry(e)
        break
    if updated is None:
        return None
    _rewrite_all(items)
    return updated


def archive_day(day: str | None = None) -> dict:
    """Archive all entries for a day (default today)."""
    target_day = day or _local_day()
    items = _read_all()
    changed = 0
    for e in items:
        if str(e.get("day")) != target_day:
            continue
        if bool(e.get("archived")):
            continue
        e["archived"] = True
        e["archived_at"] = _now_utc_iso()
        e["updated_at"] = _now_utc_iso()
        changed += 1
    if changed:
        _rewrite_all(items)
    return {"day": target_day, "archived_count": changed}


def list_days() -> list[dict]:
    """Return day buckets with counts."""
    items = _read_all()
    buckets: dict[str, dict] = {}
    for e in items:
        d = str(e.get("day", ""))
        if not d:
            continue
        b = buckets.setdefault(d, {"day": d, "total": 0, "archived": 0, "active": 0})
        b["total"] += 1
        if bool(e.get("archived")):
            b["archived"] += 1
        else:
            b["active"] += 1
    return sorted(buckets.values(), key=lambda x: x["day"], reverse=True)


def list_folders() -> list[str]:
    """Return sorted unique folder paths (including "" for root)."""
    items = _read_all()
    folders: set[str] = set()
    for e in items:
        f = (e.get("folder") or "").strip().strip("/")
        folders.add(f)
    return sorted(folders)
