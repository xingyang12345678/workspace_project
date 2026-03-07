"""Backup API."""
from fastapi import APIRouter

from services import file_service

router = APIRouter(tags=["backup"])


@router.post("/api/backup/datas")
def backup_datas():
    stats = file_service.backup_datas()
    return stats
