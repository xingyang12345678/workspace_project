"""File and backup API."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, PlainTextResponse

from core.exceptions import PathOutsideWorkspaceError, NotFoundError
from pydantic import BaseModel
from services import file_service

router = APIRouter(prefix="/api/files", tags=["files"])


class WriteFileBody(BaseModel):
    path: str
    content: str


class CreateFileBody(BaseModel):
    path: str
    content: str = ""


class CreateDirBody(BaseModel):
    path: str


class MoveBody(BaseModel):
    from_path: str
    to_path: str


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
def read_file(path: str = "", as_text: bool = False):
    if not path:
        raise HTTPException(400, "path required")
    try:
        raw = file_service.read_file(path)
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))
    except NotFoundError as e:
        raise HTTPException(404, str(e.message))
    if as_text:
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(400, "File is not valid UTF-8 text")
        return PlainTextResponse(content=text)
    return Response(content=raw, media_type="application/octet-stream")


@router.put("/write")
def write_file_endpoint(body: WriteFileBody):
    if not body.path or not body.path.strip():
        raise HTTPException(400, "path required")
    try:
        file_service.write_file(body.path.strip(), body.content.encode("utf-8"))
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))
    except NotFoundError as e:
        raise HTTPException(404, str(e.message))
    return {"ok": True}


@router.post("/file")
def create_file_endpoint(body: CreateFileBody):
    if not body.path or not body.path.strip():
        raise HTTPException(400, "path required")
    try:
        file_service.create_file(body.path.strip(), body.content.encode("utf-8"))
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))
    except NotFoundError as e:
        raise HTTPException(404, str(e.message))
    return {"ok": True}


@router.post("/dir")
def create_dir_endpoint(body: CreateDirBody):
    if not body.path or not body.path.strip():
        raise HTTPException(400, "path required")
    try:
        file_service.create_dir(body.path.strip())
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))
    return {"ok": True}


@router.delete("")
def delete_path_endpoint(path: str = ""):
    if not path or not path.strip():
        raise HTTPException(400, "path required")
    try:
        file_service.delete_path(path.strip())
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))
    except NotFoundError as e:
        raise HTTPException(404, str(e.message))
    return {"ok": True}


@router.patch("/move")
def move_path_endpoint(body: MoveBody):
    if not body.from_path or not body.to_path:
        raise HTTPException(400, "from_path and to_path required")
    try:
        file_service.rename_path(body.from_path.strip(), body.to_path.strip())
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))
    except NotFoundError as e:
        raise HTTPException(404, str(e.message))
    return {"ok": True}



