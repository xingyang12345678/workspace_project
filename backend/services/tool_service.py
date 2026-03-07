"""Scan tools dir, register, run."""
import subprocess
from pathlib import Path

from models.tool import ToolInfo, ToolRunResult

from services.file_service import get_workspace_root, resolve_path


def list_tools() -> list[ToolInfo]:
    """Scan tools/ for .py files."""
    root = get_workspace_root()
    tools_dir = root / "tools"
    if not tools_dir.is_dir():
        return []
    result: list[ToolInfo] = []
    for f in sorted(tools_dir.glob("*.py")):
        name = f.stem
        rel = f"tools/{f.name}"
        result.append(ToolInfo(id=name, name=name, path=rel))
    return result


def run_tool(tool_id: str, args: list[str], env: dict[str, str]) -> ToolRunResult:
    """Run tool by id (script name without .py)."""
    root = get_workspace_root()
    script = root / "tools" / f"{tool_id}.py"
    if not script.is_file():
        from core.exceptions import NotFoundError
        raise NotFoundError(f"Tool not found: {tool_id}")
    env_full = {**env}
    proc = subprocess.run(
        ["python3", str(script)] + args,
        cwd=str(root),
        capture_output=True,
        text=True,
        timeout=300,
        env={**__import__("os").environ, **env_full},
    )
    return ToolRunResult(
        stdout=proc.stdout or "",
        stderr=proc.stderr or "",
        exit_code=proc.returncode or 0,
    )
