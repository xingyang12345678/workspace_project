"""Tools API."""
from fastapi import APIRouter, HTTPException

from core.exceptions import NotFoundError
from models.tool import ToolRunRequest
from services import tool_service

router = APIRouter(prefix="/api/tools", tags=["tools"])


@router.get("/list")
def list_tools():
    return {"tools": [t.model_dump() for t in tool_service.list_tools()]}


@router.post("/run")
def run_tool(req: ToolRunRequest):
    try:
        result = tool_service.run_tool(req.tool_id, req.args, req.env)
        return result.model_dump()
    except NotFoundError as e:
        raise HTTPException(404, str(e.message))
