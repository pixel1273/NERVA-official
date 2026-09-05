from pydantic import BaseModel, Field
from typing import Optional


class FleetVehicle(BaseModel):
    id: int
    vehicle_id: str
    vehicle_type: str
    driver_name: Optional[str]
    cargo_type: Optional[str]
    origin: Optional[str]
    destination: Optional[str]
    current_lat: Optional[float]
    current_lng: Optional[float]
    status: str
    last_updated: str


class FleetPositionUpdate(BaseModel):
    latitude: float
    longitude: float


class FleetRerouteRequest(BaseModel):
    blocked_segment_u: str = Field(..., description="Start node of the blocked road segment")
    blocked_segment_v: str = Field(..., description="End node of the blocked road segment")
