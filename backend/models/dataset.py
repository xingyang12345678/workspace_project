"""Dataset / JSONL models."""
from typing import Any

from pydantic import BaseModel


class RecordResponse(BaseModel):
    """Single JSONL record (raw JSON)."""
    index: int
    data: dict[str, Any]


class RecordsResponse(BaseModel):
    """Paginated records."""
    records: list[dict[str, Any]]
    total: int
    offset: int
    limit: int
