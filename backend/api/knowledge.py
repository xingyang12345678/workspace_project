"""Knowledge API."""
from fastapi import APIRouter, HTTPException

from models.knowledge import KnowledgeArchiveRequest, KnowledgeCreate, KnowledgeUpdate
from services import knowledge_service

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("")
def list_knowledge(
    offset: int = 0,
    limit: int = 100,
    day: str | None = None,
    tag: str | None = None,
    q: str | None = None,
    include_archived: bool = False,
):
    entries, total = knowledge_service.list_entries(offset, limit, day=day, tag=tag, q=q, include_archived=include_archived)
    return {"entries": entries, "total": total, "offset": offset, "limit": limit}


@router.post("")
def create_knowledge(req: KnowledgeCreate):
    entry = knowledge_service.add_entry(req.text, req.tags)
    return entry


@router.patch("/{entry_id}")
def update_knowledge(entry_id: str, req: KnowledgeUpdate):
    updated = knowledge_service.update_entry(entry_id, text=req.text, tags=req.tags, archived=req.archived)
    if updated is None:
        raise HTTPException(404, "Entry not found")
    return updated


@router.post("/archive")
def archive(req: KnowledgeArchiveRequest):
    return knowledge_service.archive_day(req.day)


@router.get("/days")
def days():
    return {"days": knowledge_service.list_days()}
