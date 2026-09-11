from fastapi import APIRouter, Depends, HTTPException
from typing import List
from ..dependencies import get_current_user, RoleChecker, ROLE_COMMAND
from ..models.fleet import FleetVehicle, FleetPositionUpdate, FleetRerouteRequest
from ..services import fleet as fleet_service

router = APIRouter(prefix="/api/fleet", tags=["Fleet"])

@router.get("", response_model=List[FleetVehicle], dependencies=[Depends(RoleChecker([ROLE_COMMAND]))])
def list_fleet():
    """Get all tracked vehicles with current positions."""
    return fleet_service.get_all_vehicles()

@router.post("/{vehicle_id}/position", dependencies=[Depends(get_current_user)])
def update_fleet_position(vehicle_id: str, data: FleetPositionUpdate):
    """Vehicle sends its GPS position update."""
    vehicle = fleet_service.update_position(vehicle_id, data.latitude, data.longitude)
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle '{vehicle_id}' not found")
    return {"message": "Position updated", "vehicle_id": vehicle_id}

@router.post("/reroute", dependencies=[Depends(RoleChecker([ROLE_COMMAND]))])
def reroute_fleet(data: FleetRerouteRequest):
    """Central Command triggers mass rerouting after a road closure."""
    return fleet_service.reroute_fleet(data.blocked_segment_u, data.blocked_segment_v)
