"""Tasks API: create, list, get, cancel."""
from fastapi import APIRouter, HTTPException

from models.task import TaskCreate
from services import task_service

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.post("")
def create_task(req: TaskCreate):
    task_id = task_service.create_task(req.type, req.payload)
    return {"task_id": task_id}


@router.get("")
def list_tasks(status: str | None = None, type: str | None = None, limit: int = 50):
    return {"tasks": task_service.list_tasks(status=status, task_type=type, limit=limit)}


@router.get("/{task_id}")
def get_task(task_id: str):
    t = task_service.get_task(task_id)
    if t is None:
        raise HTTPException(404, "Task not found")
    return t


@router.post("/{task_id}/cancel")
def cancel_task(task_id: str):
    ok = task_service.cancel_task(task_id)
    if not ok:
        raise HTTPException(400, "Task not found or not cancellable")
    return {"status": "cancelled"}
