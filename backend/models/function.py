"""Function library models."""
from typing import Any

from pydantic import BaseModel


class FunctionRunRequest(BaseModel):
    function_id: str
    record: dict[str, Any]
