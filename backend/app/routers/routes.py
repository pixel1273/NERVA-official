from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from ..dependencies import get_current_user, RoleChecker, ROLE_COMMAND
from ..models.routing import RouteRequest, RouteResponse, HazardUpdate
from ..services.omniroute import engine as route_engine

router = APIRouter(prefix="/api/route", tags=["Routing"])

@router.post("", response_model=RouteResponse, dependencies=[Depends(get_current_user)])
def calculate_route(request: RouteRequest):
    """Calculate the optimal risk-aware route between two NER locations."""
    return route_engine.get_route(request.origin, request.destination, request.risk_weight, request.avoid_blocked)

@router.post("/alternatives", response_model=List[RouteResponse], dependencies=[Depends(get_current_user)])
def get_alternative_routes(request: RouteRequest):
    """Get alternate contingency routes."""
    return route_engine.get_alternative_routes(request.origin, request.destination, request.risk_weight, request.avoid_blocked)

@router.get("/segments", response_model=List[Dict[str, Any]], dependencies=[Depends(get_current_user)])
def get_segments():
    """Get all road segments with risk data — feeds the GIS map overlays."""
    return route_engine.get_all_segments()

@router.post("/update-hazard", dependencies=[Depends(RoleChecker([ROLE_COMMAND]))])
def update_hazard(update: HazardUpdate):
    """Update road segment hazard levels (triggered by incidents or weather data)."""
    success = route_engine.update_edge_hazard(update.u, update.v, update.landslide_risk, update.weather_hazard, update.is_blocked)
    if not success:
        raise HTTPException(status_code=404, detail=f"Segment '{update.u}' → '{update.v}' not found")
    return {"message": "Hazard updated", "segment": {"u": update.u, "v": update.v}}
