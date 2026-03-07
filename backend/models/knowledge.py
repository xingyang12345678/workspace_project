"""Knowledge entry models."""
from pydantic import BaseModel, Field


class KnowledgeEntry(BaseModel):
    """Single knowledge entry."""
    id: str
    timestamp: str  # ISO format (UTC)
    day: str  # YYYY-MM-DD (local day at creation time)
    text: str
    tags: list[str] = Field(default_factory=list)
    archived: bool = False
    archived_at: str | None = None  # ISO format (UTC)
    updated_at: str | None = None  # ISO format (UTC)


class KnowledgeCreate(BaseModel):
    """Request to create knowledge entry."""
    text: str
    tags: list[str] = Field(default_factory=list)


class KnowledgeUpdate(BaseModel):
    """Partial update for an entry."""
    text: str | None = None
    tags: list[str] | None = None
    archived: bool | None = None


class KnowledgeListResponse(BaseModel):
    """Paginated knowledge list."""
    entries: list[KnowledgeEntry]
    total: int
    offset: int
    limit: int


class KnowledgeArchiveRequest(BaseModel):
    """Archive entries for a given day (default today)."""
    day: str | None = None
