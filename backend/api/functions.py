"""Functions API: list and run render functions."""
from fastapi import APIRouter, HTTPException

from models.function import FunctionRunRequest
from services import function_service

router = APIRouter(prefix="/api/functions", tags=["functions"])


@router.get("/list")
def list_functions():
    return {"functions": function_service.list_functions()}


@router.post("/run")
def run_function(req: FunctionRunRequest):
    try:
        result = function_service.run_function(req.function_id, req.record)
        return {"result": result}
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except TimeoutError as e:
        raise HTTPException(408, str(e))
    except RuntimeError as e:
        raise HTTPException(500, str(e))
