"""Project documentation API (human/AI)."""

from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/docs", tags=["docs"])


def _project_root() -> Path:
    # backend/api/docs.py -> backend/api -> backend -> project root
    return Path(__file__).resolve().parent.parent.parent


def _read_md(name: str) -> str:
    p = _project_root() / "docs" / name
    if not p.is_file():
        raise HTTPException(404, f"Doc not found: {name}")
    return p.read_text(encoding="utf-8")


@router.get("/human")
def human():
    return {"format": "markdown", "content": _read_md("文档_人类.md")}


@router.get("/ai")
def ai():
    return {"format": "markdown", "content": _read_md("文档_AI.md")}


@router.get("/chat-api")
def chat_api():
    """Chat / JSONL stats API doc (human-readable)."""
    return {"format": "markdown", "content": _read_md("api-chat.md")}

