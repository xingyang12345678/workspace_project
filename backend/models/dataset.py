"""Dataset / JSONL models."""
from typing import Any, Optional

from pydantic import BaseModel


class FieldMapping(BaseModel):
    """Optional custom keys for SFT/DPO record structure. Defaults used when not set."""
    messages_key: str = "messages"
    chosen_key: str = "chosen"
    rejected_key: str = "rejected"
    content_key: str = "content"
    role_key: str = "role"


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
    field_mapping: Optional[FieldMapping] = None


class TokenStatsRequest(BaseModel):
    path: str
    file: str
    model: str
    scope: str = "both"  # chosen_wise | rejected_wise | both
    field_mapping: Optional[FieldMapping] = None


class NgramRequest(BaseModel):
    path: str
    file: str
    n: int = 2
    min_count: int = 1
    min_length: int = 0
    scope: str = "all"  # messages | chosen | rejected | all
    unit: str = "char"  # char | word
    field_mapping: Optional[FieldMapping] = None


class StringSearchRequest(BaseModel):
    path: str
    file: str
    query: str
    scope: str = "whole"  # chosen_wise | rejected_wise | whole
    field_mapping: Optional[FieldMapping] = None


class RunScriptRequest(BaseModel):
    path: str
    file: str
    script: str
    field_mapping: Optional[FieldMapping] = None


class SaveScriptBody(BaseModel):
    id: str = ""
    body: str = ""
