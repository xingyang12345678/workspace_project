"""One-click clear cache / reset to initial state. Does not delete user data (knowledge, scripts, datas)."""
import shutil
from pathlib import Path

from services import file_service, token_service


def clear_cache() -> dict:
    """
    Remove cache files only. Keeps knowledge, dataset_scripts, datas, functions, etc.
    - In-memory tokenizer cache
    - Backend __pycache__
    - Workspace .cache if exists
    - .ai-workspace/*/__pycache__ if any
    """
    removed: list[str] = []
    token_service.clear_tokenizer_cache()
    removed.append("tokenizer_cache (memory)")

    backend_root = Path(__file__).resolve().parent.parent
    for pycache in backend_root.rglob("__pycache__"):
        if pycache.is_dir():
            try:
                shutil.rmtree(pycache)
                removed.append(str(pycache.relative_to(backend_root)))
            except Exception:
                pass

    root = file_service.get_workspace_root()
    cache_dir = root / ".cache"
    if cache_dir.is_dir():
        try:
            shutil.rmtree(cache_dir)
            removed.append("workspace/.cache")
        except Exception:
            pass

    ai_ws = root / ".ai-workspace"
    if ai_ws.is_dir():
        for pycache in ai_ws.rglob("__pycache__"):
            if pycache.is_dir():
                try:
                    shutil.rmtree(pycache)
                    removed.append(str(pycache.relative_to(root)))
                except Exception:
                    pass

    return {"cleared": True, "removed": removed}
