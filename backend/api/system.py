"""System: clear cache, user data status, export, wipe."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from core.exceptions import PathOutsideWorkspaceError
from services import file_service, knowledge_service, script_service, system_service

router = APIRouter(prefix="/api/system", tags=["system"])


@router.post("/clear-cache", summary="One-click clear cache, reset to initial state")
def post_clear_cache():
    """Remove cache only (tokenizer memory, __pycache__, .cache). Does not delete knowledge, scripts, datas."""
    try:
        return system_service.clear_cache()
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.get("/user-data-status", summary="Summary of user data (for export/delete UI)")
def get_user_data_status():
    """Return counts for knowledge, dataset_scripts, datas (file count) so UI can show export/delete."""
    try:
        root = file_service.get_workspace_root()
        knowledge_file = root / "knowledge" / "entries.jsonl"
        knowledge_count = 0
        if knowledge_file.is_file():
            knowledge_count = sum(1 for _ in open(knowledge_file, encoding="utf-8") if _.strip())

        scripts = script_service.list_saved_scripts()
        datas_dir = root / "datas"
        datas_count = 0
        if datas_dir.is_dir():
            datas_count = sum(1 for _ in datas_dir.rglob("*.jsonl"))
        return {
            "knowledge_entries": knowledge_count,
            "dataset_scripts": len(scripts),
            "datas_jsonl_files": datas_count,
        }
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.get("/export/knowledge", response_class=PlainTextResponse)
def export_knowledge():
    """Download knowledge entries as text (JSONL)."""
    try:
        path = knowledge_service._path()
        if not path.exists():
            return ""
        return path.read_text(encoding="utf-8")
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.post("/wipe/knowledge")
def wipe_knowledge():
    """Clear all knowledge entries (overwrite with empty). Requires confirmation on frontend."""
    try:
        path = knowledge_service._path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("", encoding="utf-8")
        return {"ok": True}
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.post("/wipe/scripts")
def wipe_scripts():
    """Delete all saved dataset scripts. Requires confirmation on frontend."""
    try:
        root = script_service._scripts_dir()
        if root.is_dir():
            for f in root.glob("*.py"):
                f.unlink()
        return {"ok": True}
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))


@router.post("/wipe/datas")
def wipe_datas():
    """Delete all JSONL files under datas/. Requires confirmation on frontend."""
    try:
        root = file_service.get_workspace_root()
        datas = root / "datas"
        if datas.is_dir():
            for f in datas.rglob("*.jsonl"):
                f.unlink()
        return {"ok": True}
    except PathOutsideWorkspaceError as e:
        raise HTTPException(403, str(e.message))
