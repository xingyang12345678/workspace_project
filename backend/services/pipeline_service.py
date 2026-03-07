"""Pipeline definition and step execution with confirmation."""
import json
import re
from pathlib import Path

from models.pipeline import PipelineDef, PipelineStep

from services.file_service import get_workspace_root
from services import tool_service

# In-memory execution state: pipeline_id -> { current_step, confirmed, step_outputs }
_execution_state: dict[str, dict] = {}


def _pipelines_dir() -> Path:
    return get_workspace_root() / "pipelines"


def list_pipelines() -> list[dict]:
    """List pipeline definitions (name, id from filename)."""
    d = _pipelines_dir()
    if not d.is_dir():
        return []
    out = []
    for f in sorted(d.glob("*.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            out.append({"id": f.stem, "name": data.get("name", f.stem)})
        except Exception:
            out.append({"id": f.stem, "name": f.stem})
    return out


def get_pipeline(pipeline_id: str) -> PipelineDef | None:
    """Load pipeline definition by id."""
    path = _pipelines_dir() / f"{pipeline_id}.json"
    if not path.is_file():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return PipelineDef(
        name=data.get("name", pipeline_id),
        params=data.get("params", {}) or {},
        steps=[PipelineStep(**s) for s in data.get("steps", [])],
    )


def create_pipeline(name: str, steps: list[PipelineStep], params: dict[str, str] | None = None) -> str:
    """Create pipeline file; return id (slug of name)."""
    import re
    pid = re.sub(r"[^\w\-]", "_", name).strip("_") or "pipeline"
    d = _pipelines_dir()
    path = d / f"{pid}.json"
    idx = 0
    while path.exists():
        idx += 1
        path = d / f"{pid}_{idx}.json"
    path.write_text(
        json.dumps(
            {"name": name, "params": params or {}, "steps": [s.model_dump() for s in steps]},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return path.stem


def update_pipeline(pipeline_id: str, name: str | None = None, params: dict[str, str] | None = None, steps: list[PipelineStep] | None = None) -> PipelineDef | None:
    """Update pipeline definition; rewrites JSON file."""
    path = _pipelines_dir() / f"{pipeline_id}.json"
    if not path.is_file():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    if name is not None:
        data["name"] = name
    if params is not None:
        data["params"] = params
    if steps is not None:
        data["steps"] = [s.model_dump() for s in steps]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return get_pipeline(pipeline_id)


def _get_state(pid: str) -> dict:
    if pid not in _execution_state:
        _execution_state[pid] = {"current_step": 0, "confirmed": True, "step_outputs": []}
    return _execution_state[pid]


_macro_pat = re.compile(r"\{\{\s*([A-Za-z0-9_\-]+)\s*\}\}|\$\{([A-Za-z0-9_\-]+)\}")


def _render_macros(s: str, params: dict[str, str]) -> str:
    def repl(m: re.Match) -> str:
        key = m.group(1) or m.group(2) or ""
        return str(params.get(key, m.group(0)))

    return _macro_pat.sub(repl, s)


def _render_args(args: list[str], params: dict[str, str]) -> list[str]:
    return [_render_macros(a, params) for a in args]


def execute_step(pipeline_id: str, params_override: dict[str, str] | None = None) -> dict | None:
    """Execute current step; require previous confirmed. Returns step output and status."""
    pl = get_pipeline(pipeline_id)
    if not pl or not pl.steps:
        return None
    state = _get_state(pipeline_id)
    if not state["confirmed"]:
        return {"status": "pending_confirm", "message": "Confirm previous step first"}
    idx = state["current_step"]
    if idx >= len(pl.steps):
        return {"status": "done", "current_step": idx, "step_outputs": state["step_outputs"]}
    step = pl.steps[idx]
    merged_params = {**(pl.params or {}), **(params_override or {})}
    rendered_args = _render_args(step.args, merged_params)
    result = tool_service.run_tool(step.tool_id, rendered_args, {})
    state["step_outputs"].append({"stdout": result.stdout, "stderr": result.stderr, "exit_code": result.exit_code})
    state["current_step"] = idx + 1
    state["confirmed"] = False
    return {
        "status": "pending_confirm",
        "current_step": state["current_step"],
        "step_output": {"stdout": result.stdout, "stderr": result.stderr, "exit_code": result.exit_code},
        "step_outputs": state["step_outputs"],
        "params_used": merged_params,
    }


def confirm_step(pipeline_id: str) -> dict:
    """Mark current step confirmed so next can run."""
    state = _get_state(pipeline_id)
    state["confirmed"] = True
    return {"status": "confirmed", "current_step": state["current_step"]}


def reset_execution(pipeline_id: str) -> None:
    """Reset execution state for a pipeline."""
    _execution_state.pop(pipeline_id, None)
