"""Plugins API (placeholder)."""
from fastapi import APIRouter

from services import plugin_service

router = APIRouter(prefix="/api/plugins", tags=["plugins"])


@router.get("")
def list_plugins():
    return {"plugins": plugin_service.list_plugins()}
