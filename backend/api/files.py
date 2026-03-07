"""File and backup API."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from core.exceptions import PathOutsideWorkspaceError, NotFoundError
from services import file_service

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/tree")
def get_tree():
    tree = file_service.get_tree()
    return tree


@router.get("/children")
def list_children(path: str = ""):
    """List direct children of path (for expanding tree)."""
    try:
        nodes = file_service.list_dir(path)
        return {"children": [n.model_dump() for n in nodes]}
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.get("/read")
def read_file(path: str = ""):
    if not path:
        raise HTTPException(400, "path required")
    try:
        raw = file_service.read_file(path)
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))
    except NotFoundError as e:
        raise HTTPException(404, str(e.message))
    return Response(content=raw, media_type="application/octet-stream")



