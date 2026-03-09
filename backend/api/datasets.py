"""Dataset API."""
from fastapi import APIRouter, HTTPException

from core.exceptions import PathOutsideWorkspaceError
from models.dataset import NgramRequest, RunScriptRequest, SaveScriptBody, StringSearchRequest, TokenCountRequest, TokenStatsRequest
from services import chat_stats_service, dataset_service, script_service, token_service

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


def _mapping_dict(m):
    if m is None:
        return None
    return m.model_dump() if hasattr(m, "model_dump") else m.dict()


@router.post("/token-count", summary="Token count for one record")
def post_token_count(body: TokenCountRequest):
    """Return token counts for a single record: messages, chosen, rejected, sums, and per-message token list."""
    try:
        result = token_service.token_count_record(
            body.path, body.file, body.index, body.model, field_mapping=_mapping_dict(body.field_mapping)
        )
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
        return token_service.token_stats_file(
            body.path, body.file, body.model, body.scope, field_mapping=_mapping_dict(body.field_mapping)
        )
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.post("/ngram", summary="N-gram screening")
def post_ngram(body: NgramRequest):
    """Return n-gram frequency list. Scope: messages, chosen, rejected, all. Unit: char or word."""
    try:
        items = chat_stats_service.ngram(
            body.path,
            body.file,
            body.n,
            body.min_count,
            body.min_length,
            body.scope,
            body.unit,
            field_mapping=_mapping_dict(body.field_mapping),
        )
        return {"items": items}
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.post("/string-search", summary="String search and count")
def post_string_search(body: StringSearchRequest):
    """Return total occurrences, records with match, and per-record counts. Scope: chosen_wise, rejected_wise, whole."""
    try:
        return chat_stats_service.string_search(
            body.path, body.file, body.query, body.scope, field_mapping=_mapping_dict(body.field_mapping)
        )
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.post("/run-script", summary="Run user script with workspace API")
def post_run_script(body: RunScriptRequest):
    """Execute script with workspace (get_record, get_all_records, get_field_as_list, get_text_list, run_saved). Returns { stdout, stderr, error? }."""
    try:
        return script_service.run_script(
            body.path, body.file, body.script, field_mapping=_mapping_dict(body.field_mapping)
        )
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.get("/scripts", summary="List saved dataset scripts")
def list_dataset_scripts():
    try:
        return {"scripts": script_service.list_saved_scripts()}
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.get("/script/{script_id:path}", summary="Get saved script body")
def get_dataset_script(script_id: str):
    try:
        body = script_service.get_saved_script(script_id)
        if body is None:
            raise HTTPException(404, "Script not found")
        return {"id": script_id, "body": body}
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.post("/script/save", summary="Save script by name")
def save_dataset_script(body: SaveScriptBody):
    """Body: { id: string, body: string }. Saves as .ai-workspace/dataset_scripts/{id}.py"""
    try:
        sid = body.id or ""
        script_service.save_script(sid, body.body or "")
        return {"ok": True}
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.delete("/script/{script_id:path}", summary="Delete saved script")
def delete_dataset_script(script_id: str):
    try:
        ok = script_service.delete_script(script_id)
        return {"deleted": ok}
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))
