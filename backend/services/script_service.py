"""Run user scripts against JSONL dataset with a workspace API. Save/load script library."""
import io
import sys
from pathlib import Path
from typing import Any

from services import dataset_service
from services.file_service import get_workspace_root


def _scripts_dir() -> Path:
    return get_workspace_root() / ".ai-workspace" / "dataset_scripts"


def _safe_workspace(path: str, file: str, field_mapping: dict | None):
    """Build a workspace object for script execution: get_record, get_all_records, get_field_as_list."""
    m = dataset_service._get_mapping(field_mapping)
    content_key = m["content_key"]

    class Workspace:
        def get_record(self, index: int) -> dict | None:
            return dataset_service.get_record(path, file, index)

        def get_all_records(self) -> list[dict]:
            return dataset_service.get_all_records(path, file)

        def get_field_as_list(self, field_path: str) -> list:
            """Return list of values for field_path across all records. field_path: top-level key or 'messages'|'chosen'|'rejected'."""
            records = dataset_service.get_all_records(path, file)
            out = []
            for r in records:
                v = r.get(field_path)
                if v is not None:
                    out.append(v)
            return out

        def get_text_list(self, field_path: str) -> list[str]:
            """Like get_field_as_list but flatten message lists to content strings. field_path: messages|chosen|rejected."""
            records = dataset_service.get_all_records(path, file)
            out = []
            for r in records:
                val = r.get(field_path)
                if val is None:
                    continue
                if not isinstance(val, list):
                    val = [val] if isinstance(val, dict) else []
                for m in val:
                    if isinstance(m, dict) and content_key in m:
                        c = m[content_key]
                        out.append(c if isinstance(c, str) else str(c))
            return out

    return Workspace()


def run_script(path: str, file: str, script: str, field_mapping: dict | None = None) -> dict:
    """
    Execute user script with workspace in restricted globals. Returns { stdout, stderr, error? }.
    Script can use workspace.get_record(i), workspace.get_all_records(), workspace.get_field_as_list(field), workspace.get_text_list(field), and run_saved(name).
    """
    out_capture = io.StringIO()
    err_capture = io.StringIO()

    def _run_saved(name: str) -> dict:
        body = get_saved_script(name)
        if not body:
            return {"stdout": "", "stderr": "", "error": f"Saved script not found: {name}"}
        return run_script(path, file, body, field_mapping)

    workspace = _safe_workspace(path, file, field_mapping)
    safe_builtins = {
        "print": print,
        "len": len,
        "str": str,
        "int": int,
        "float": float,
        "list": list,
        "dict": dict,
        "tuple": tuple,
        "set": set,
        "range": range,
        "enumerate": enumerate,
        "zip": zip,
        "map": map,
        "filter": filter,
        "sum": sum,
        "min": min,
        "max": max,
        "abs": abs,
        "round": round,
        "sorted": sorted,
        "reversed": reversed,
        "True": True,
        "False": False,
        "None": None,
    }
    globals_for_exec = {
        "workspace": workspace,
        "run_saved": _run_saved,
        "__builtins__": safe_builtins,
    }
    old_stdout, old_stderr = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = out_capture, err_capture
    try:
        exec(script, globals_for_exec)
    except Exception as e:
        err_capture.write(str(e))
        return {"stdout": out_capture.getvalue(), "stderr": err_capture.getvalue(), "error": str(e)}
    finally:
        sys.stdout, sys.stderr = old_stdout, old_stderr
    return {"stdout": out_capture.getvalue(), "stderr": err_capture.getvalue()}


def list_saved_scripts() -> list[dict]:
    """Return [{ id, name, description }] from .ai-workspace/dataset_scripts/."""
    root = _scripts_dir()
    if not root.is_dir():
        return []
    out = []
    for f in sorted(root.glob("*.py")):
        name = f.stem
        fid = name
        desc = ""
        try:
            src = f.read_text(encoding="utf-8")
            if '"""' in src:
                start = src.index('"""') + 3
                end = src.index('"""', start)
                desc = src[start:end].strip().split("\n")[0][:200]
        except Exception:
            pass
        out.append({"id": fid, "name": name, "description": desc})
    return out


def get_saved_script(script_id: str) -> str | None:
    """Load script body by id (filename without .py)."""
    root = _scripts_dir()
    path = root / f"{script_id}.py"
    if not path.is_file():
        return None
    return path.read_text(encoding="utf-8")


def save_script(script_id: str, body: str) -> None:
    """Save script by id. Creates directory if needed."""
    root = _scripts_dir()
    root.mkdir(parents=True, exist_ok=True)
    (root / f"{script_id}.py").write_text(body, encoding="utf-8")


def delete_script(script_id: str) -> bool:
    """Remove saved script. Return True if deleted."""
    root = _scripts_dir()
    path = root / f"{script_id}.py"
    if path.is_file():
        path.unlink()
        return True
    return False
