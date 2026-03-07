"""Pipeline models."""
from pydantic import BaseModel, Field


class PipelineStep(BaseModel):
    """Single step in a pipeline."""
    tool_id: str
    args: list[str] = []


class PipelineDef(BaseModel):
    """Pipeline definition (name + steps)."""
    name: str
    params: dict[str, str] = Field(default_factory=dict)
    steps: list[PipelineStep]


class PipelineCreate(BaseModel):
    """Request to create a pipeline."""
    name: str
    params: dict[str, str] = Field(default_factory=dict)
    steps: list[PipelineStep]


class PipelineUpdate(BaseModel):
    """Partial update for pipeline definition."""
    name: str | None = None
    params: dict[str, str] | None = None
    steps: list[PipelineStep] | None = None
