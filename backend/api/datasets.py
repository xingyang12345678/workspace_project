"""Dataset API."""
from fastapi import APIRouter, HTTPException

from core.exceptions import PathOutsideWorkspaceError
from models.dataset import NgramRequest, StringSearchRequest, TokenCountRequest, TokenStatsRequest
from services import chat_stats_service, dataset_service, token_service

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.get("/list")
def list_jsonl(path: str = ""):
    try:
        items = dataset_service.list_jsonl(path)
        return {"files": items}
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.get("/records")
def get_records(path: str, file: str, offset: int = 0, limit: int = 50):
    try:
        records, total = dataset_service.get_records(path, file, offset, limit)
        return {"records": records, "total": total, "offset": offset, "limit": limit}
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.get("/record")
def get_record(path: str, file: str, index: int):
    try:
        record = dataset_service.get_record(path, file, index)
        if record is None:
            raise HTTPException(404, "Record not found")
        return {"index": index, "data": record}
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.post("/token-count", summary="Token count for one record")
def post_token_count(body: TokenCountRequest):
    """Return token counts for a single record: messages, chosen, rejected, sums, and per-message token list."""
    try:
        result = token_service.token_count_record(body.path, body.file, body.index, body.model)
        if result is None:
            raise HTTPException(404, "Record not found")
        return result
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.post("/token-stats", summary="Token stats for full file")
def post_token_stats(body: TokenStatsRequest):
    """Return mean/min/max and histogram for token counts over the file. Scope: chosen_wise, rejected_wise, or both."""
    try:
        return token_service.token_stats_file(body.path, body.file, body.model, body.scope)
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.post("/ngram", summary="N-gram screening")
def post_ngram(body: NgramRequest):
    """Return n-gram frequency list. Scope: messages, chosen, rejected, all. Unit: char or word."""
    try:
        items = chat_stats_service.ngram(
            body.path, body.file, body.n, body.min_count, body.min_length, body.scope, body.unit
        )
        return {"items": items}
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.post("/string-search", summary="String search and count")
def post_string_search(body: StringSearchRequest):
    """Return total occurrences, records with match, and per-record counts. Scope: chosen_wise, rejected_wise, whole."""
    try:
        return chat_stats_service.string_search(body.path, body.file, body.query, body.scope)
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))
