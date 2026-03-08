"""Knowledge API."""
from fastapi import APIRouter, HTTPException

from models.knowledge import KnowledgeArchiveRequest, KnowledgeCreate, KnowledgeUpdate
from services import knowledge_service

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


def _norm_query(s: str | None) -> str | None:
    if s is None or s.strip() in ("", "undefined"):
        return None
    return s.strip()


@router.get("")
def list_knowledge(
    offset: int = 0,
    limit: int = 100,
    day: str | None = None,
    tag: str | None = None,
    q: str | None = None,
    folder: str | None = None,
    include_archived: bool = False,
):
    day = _norm_query(day)
    tag = _norm_query(tag)
    q = _norm_query(q)
    folder = _norm_query(folder)
    entries, total = knowledge_service.list_entries(
        offset, limit, day=day, tag=tag, q=q, folder=folder, include_archived=include_archived
    )
    return {"entries": entries, "total": total, "offset": offset, "limit": limit}


@router.get("/folders")
def list_folders():
    return {"folders": knowledge_service.list_folders()}


@router.post("")
def create_knowledge(req: KnowledgeCreate):
    entry = knowledge_service.add_entry(req.text, req.tags, folder=req.folder or "")
    return entry


@router.patch("/{entry_id}")
def update_knowledge(entry_id: str, req: KnowledgeUpdate):
    updated = knowledge_service.update_entry(
        entry_id, text=req.text, tags=req.tags, folder=req.folder, archived=req.archived
    )
    if updated is None:
        raise HTTPException(404, "Entry not found")
    return updated


@router.delete("/{entry_id}")
def delete_knowledge(entry_id: str):
    if not knowledge_service.delete_entry(entry_id):
        raise HTTPException(404, "Entry not found")
    return {"ok": True}


@router.post("/archive")
def archive(req: KnowledgeArchiveRequest):
    return knowledge_service.archive_day(req.day)


@router.get("/days")
def days():
    return {"days": knowledge_service.list_days()}
