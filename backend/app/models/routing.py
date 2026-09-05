from pydantic import BaseModel, Field
from typing import List, Optional


class RouteRequest(BaseModel):
    origin: str = Field(..., description="Starting location node ID (e.g. 'Guwahati')")
    destination: str = Field(..., description="Ending location node ID (e.g. 'Shillong')")
    risk_weight: float = Field(0.5, ge=0.0, le=1.0, description="0.0 = shortest distance only, 1.0 = safest route only")
    avoid_blocked: bool = Field(True, description="Skip road segments flagged as blocked")


class RouteSegment(BaseModel):
    u: str
    v: str
    distance_km: float
    landslide_risk: float
    weather_hazard: float
    is_blocked: bool


class RouteResponse(BaseModel):
    path: List[str]
    total_distance_km: float
    total_risk_score: float
    estimated_travel_time_hours: float
    status: str = "success"
    segments: List[RouteSegment] = []


class HazardUpdate(BaseModel):
    u: str = Field(..., description="Source node of the road segment")
    v: str = Field(..., description="Target node of the road segment")
    landslide_risk: Optional[float] = Field(None, ge=0.0, le=1.0)
    weather_hazard: Optional[float] = Field(None, ge=0.0, le=1.0)
    is_blocked: Optional[bool] = None
