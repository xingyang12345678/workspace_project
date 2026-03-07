"""Workspace and app configuration."""
import os
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings


def _default_workspace_root() -> Path:
    env = os.getenv("WORKSPACE_ROOT")
    if env:
        return Path(env).resolve()
    return (Path(__file__).resolve().parent.parent / "workspace_project").resolve()


class Settings(BaseSettings):
    """Application settings."""

    workspace_root: Path = Field(default_factory=_default_workspace_root)
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


def get_workspace_root() -> Path:
    """Return resolved workspace root; ensure subdirs exist."""
    root = Settings().workspace_root
    for name in ("datas", "tools", "pipelines", "backup", "knowledge", "plugins"):
        (root / name).mkdir(parents=True, exist_ok=True)
    return root
