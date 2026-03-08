"""Render function library: scan workspace/functions, run render(record) -> dict."""
import subprocess
import sys
from pathlib import Path

from services.file_service import get_workspace_root


def _functions_dir() -> Path:
    return get_workspace_root() / "functions"


def list_functions() -> list[dict]:
    """Scan functions/ for .py files; return id, name, category, description."""
    root = _functions_dir()
    if not root.is_dir():
        return []
    out = []
    for f in sorted(root.rglob("*.py")):
        if f.name.startswith("_"):
            continue
        try:
            rel = f.relative_to(root)
            parts = rel.parts
            # id: e.g. chat.default (category.name)
            fid = str(rel.with_suffix("")).replace("/", ".")
            category = parts[0] if len(parts) > 1 else "default"
            name = f.stem
            desc = ""
            try:
                src = f.read_text(encoding="utf-8")
                if '"""' in src:
                    start = src.index('"""') + 3
                    end = src.index('"""', start)
                    desc = src[start:end].strip().split("\n")[0][:200]
            except Exception:
                pass
            out.append({"id": fid, "name": name, "category": category, "description": desc})
        except Exception:
            continue
    return out


def run_function(function_id: str, record: dict) -> dict:
    """Run render(record) in subprocess; return result dict or raise."""
    root = _functions_dir()
    if not root.is_dir():
        raise FileNotFoundError("functions dir not found")
    # function_id is e.g. chat.default -> path functions/chat/default.py
    rel_path = "functions" + "/" + function_id.replace(".", "/") + ".py"
    full_path = root.parent / rel_path
    if not full_path.is_file():
        full_path = root / function_id.replace(".", "/") + ".py"
    if not full_path.is_file():
        raise FileNotFoundError(f"function not found: {function_id}")
    try:
        rel_from_workspace = full_path.relative_to(root.parent)
    except ValueError:
        rel_from_workspace = full_path.relative_to(root)
    rel_str = str(rel_from_workspace).replace("\\", "/")
    import json as _json
    stdin_data = _json.dumps(record, ensure_ascii=False)
    try:
        backend_dir = Path(__file__).resolve().parent.parent
        proc = subprocess.run(
            [sys.executable, str(backend_dir / "run_function.py"), str(root.parent), rel_str],
            input=stdin_data,
            capture_output=True,
            text=True,
            timeout=10,
            cwd=str(backend_dir),
        )
    except subprocess.TimeoutExpired:
        raise TimeoutError("Function timed out")
    if proc.returncode != 0:
        err = proc.stderr or proc.stdout or f"exit {proc.returncode}"
        raise RuntimeError(err)
    return _json.loads(proc.stdout)
