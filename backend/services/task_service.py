"""Background task queue: tool_run and pipeline_step, in-memory store."""
import threading
import time
import uuid
from typing import Any

from services import tool_service
from services import pipeline_service

_tasks: dict[str, dict] = {}
_lock = threading.Lock()

def _next_id() -> str:
    return uuid.uuid4().hex[:12]

def create_task(task_type: str, payload: dict[str, Any]) -> str:
    with _lock:
        task_id = _next_id()
        _tasks[task_id] = {
            "task_id": task_id,
            "type": task_type,
            "status": "pending",
            "created_at": time.time(),
            "updated_at": time.time(),
            "payload": payload,
            "result": None,
            "error": None,
        }
    threading.Thread(target=_run_task, args=(task_id,), daemon=True).start()
    return task_id

def _run_task(task_id: str) -> None:
    with _lock:
        t = _tasks.get(task_id)
        if not t or t["status"] != "pending":
            return
        t["status"] = "running"
        t["updated_at"] = time.time()
    try:
        typ = t["type"]
        payload = t["payload"]
        if typ == "tool_run":
            res = tool_service.run_tool(
                payload.get("tool_id", ""),
                payload.get("args", []),
                payload.get("env", {}),
            )
            result = {"stdout": res.stdout, "stderr": res.stderr, "exit_code": res.exit_code}
        elif typ == "pipeline_step":
            out = pipeline_service.execute_step(
                payload.get("pipeline_id", ""),
                payload.get("params_override"),
            )
            result = out if isinstance(out, dict) else {}
        else:
            result = {}
        with _lock:
            _tasks[task_id]["status"] = "success"
            _tasks[task_id]["result"] = result
            _tasks[task_id]["updated_at"] = time.time()
    except Exception as e:
        with _lock:
            _tasks[task_id]["status"] = "failed"
            _tasks[task_id]["error"] = str(e)
            _tasks[task_id]["updated_at"] = time.time()
    finally:
        with _lock:
            if _tasks.get(task_id, {}).get("status") == "cancelled":
                pass

def get_task(task_id: str) -> dict | None:
    with _lock:
        return _tasks.get(task_id)

def list_tasks(status: str | None = None, task_type: str | None = None, limit: int = 50) -> list[dict]:
    with _lock:
        out = list(_tasks.values())
    if status:
        out = [t for t in out if t.get("status") == status]
    if task_type:
        out = [t for t in out if t.get("type") == task_type]
    out.sort(key=lambda x: x.get("updated_at", 0), reverse=True)
    return out[:limit]

def cancel_task(task_id: str) -> bool:
    with _lock:
        t = _tasks.get(task_id)
        if not t:
            return False
        if t["status"] in ("pending", "running"):
            t["status"] = "cancelled"
            t["updated_at"] = time.time()
            return True
    return False
