"""Dataset API."""
from fastapi import APIRouter, HTTPException

from core.exceptions import PathOutsideWorkspaceError
from services import dataset_service

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
