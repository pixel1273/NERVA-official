from fastapi import APIRouter, Depends, Query
from typing import List
from ..dependencies import get_current_user, RoleChecker, ROLE_COMMAND
from ..models.alert import AlertCreate, AlertResponse
from ..services import alerts as alert_service

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.post("", response_model=AlertResponse, dependencies=[Depends(RoleChecker([ROLE_COMMAND]))])
def create_alert(data: AlertCreate):
    """District Admin creates a multilingual alert."""
    return alert_service.create_alert(data)

@router.post("/translate", response_model=AlertResponse, tags=["AI/ML"], dependencies=[Depends(RoleChecker([ROLE_COMMAND]))])
async def create_alert_with_translation(data: AlertCreate):
    """Create an alert with AI auto-translation."""
    return await alert_service.create_alert_with_translation(data)

@router.get("", response_model=List[AlertResponse], dependencies=[Depends(get_current_user)])
def list_alerts(active_only: bool = Query(True)):
    """Get all active alerts."""
    return alert_service.get_alerts(active_only)
