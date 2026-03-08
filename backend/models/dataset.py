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


class TokenCountRequest(BaseModel):
    path: str
    file: str
    index: int
    model: str


class TokenStatsRequest(BaseModel):
    path: str
    file: str
    model: str
    scope: str = "both"  # chosen_wise | rejected_wise | both


class NgramRequest(BaseModel):
    path: str
    file: str
    n: int = 2
    min_count: int = 1
    min_length: int = 0
    scope: str = "all"  # messages | chosen | rejected | all
    unit: str = "char"  # char | word


class StringSearchRequest(BaseModel):
    path: str
    file: str
    query: str
    scope: str = "whole"  # chosen_wise | rejected_wise | whole
