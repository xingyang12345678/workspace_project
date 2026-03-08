"""Pipeline API."""
from fastapi import APIRouter, HTTPException

from pydantic import BaseModel, Field

from models.pipeline import PipelineCreate, PipelineUpdate
from services import pipeline_service

router = APIRouter(prefix="/api/pipelines", tags=["pipelines"])

class ExecuteStepRequest(BaseModel):
    params_override: dict[str, str] = Field(default_factory=dict)


@router.get("/list")
def list_pipelines():
    return {"pipelines": pipeline_service.list_pipelines()}


@router.get("/{pipeline_id}")
def get_pipeline(pipeline_id: str):
    pl = pipeline_service.get_pipeline(pipeline_id)
    if pl is None:
        raise HTTPException(404, "Pipeline not found")
    return pl.model_dump()


@router.get("/{pipeline_id}/state")
def get_pipeline_state(pipeline_id: str):
    state = pipeline_service.get_execution_state(pipeline_id)
    if state is None:
        raise HTTPException(404, "Pipeline not found")
    return state


@router.post("")
def create_pipeline(req: PipelineCreate):
    pid = pipeline_service.create_pipeline(req.name, req.steps, params=req.params)
    return {"id": pid, "name": req.name}


@router.post("/{pipeline_id}/execute/step")
def execute_step(pipeline_id: str, req: ExecuteStepRequest | None = None):
    out = pipeline_service.execute_step(pipeline_id, params_override=(req.params_override if req else None))
    if out is None:
        raise HTTPException(404, "Pipeline not found or empty")
    return out


@router.post("/{pipeline_id}/confirm")
def confirm_step(pipeline_id: str):
    return pipeline_service.confirm_step(pipeline_id)


@router.post("/{pipeline_id}/reset")
def reset_pipeline(pipeline_id: str):
    pipeline_service.reset_execution(pipeline_id)
    return {"status": "reset"}


@router.patch("/{pipeline_id}")
def update_pipeline(pipeline_id: str, req: PipelineUpdate):
    pl = pipeline_service.update_pipeline(pipeline_id, name=req.name, params=req.params, steps=req.steps)
    if pl is None:
        raise HTTPException(404, "Pipeline not found")
    return pl.model_dump()
