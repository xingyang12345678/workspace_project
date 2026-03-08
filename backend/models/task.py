"""Task models for background execution."""
from typing import Any

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    type: str  # tool_run | pipeline_step
    payload: dict[str, Any] = Field(default_factory=dict)
