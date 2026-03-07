"""Tool run models."""
from pydantic import BaseModel


class ToolInfo(BaseModel):
    """Discovered tool metadata."""
    id: str
    name: str
    path: str  # relative to workspace


class ToolRunRequest(BaseModel):
    """Request to run a tool."""
    tool_id: str
    args: list[str] = []
    env: dict[str, str] = {}


class ToolRunResult(BaseModel):
    """Result of running a tool."""
    stdout: str
    stderr: str
    exit_code: int
