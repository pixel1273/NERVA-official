from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from ..dependencies import get_current_user, RoleChecker, ROLE_COMMAND
from ..models.incident import IncidentCreate, IncidentUpdate, IncidentResponse
from ..services import incidents as incident_service

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

@router.post("", response_model=IncidentResponse, dependencies=[Depends(get_current_user)])
def create_incident(data: IncidentCreate):
    """Ground staff submits a new geo-tagged field report."""
    return incident_service.create_incident(data)

@router.post("/ai", tags=["AI/ML"], dependencies=[Depends(get_current_user)])
async def create_incident_with_ai(data: IncidentCreate):
    """Submit a field report with AI-powered severity auto-classification."""
    return await incident_service.create_incident_with_ai(data)

@router.get("", response_model=List[IncidentResponse], dependencies=[Depends(get_current_user)])
def list_incidents(
    district: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200)
):
    """Get incidents with optional filters."""
    return incident_service.get_incidents(district, severity, status, limit)

@router.get("/{incident_id}", response_model=IncidentResponse, dependencies=[Depends(get_current_user)])
def get_incident(incident_id: int):
    """Get full details of a single incident."""
    inc = incident_service.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc

@router.patch("/{incident_id}", response_model=IncidentResponse, dependencies=[Depends(RoleChecker([ROLE_COMMAND]))])
def update_incident(incident_id: int, data: IncidentUpdate):
    """District Admin updates incident status (acknowledged, resolved, etc)."""
    inc = incident_service.update_incident(incident_id, data)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc
