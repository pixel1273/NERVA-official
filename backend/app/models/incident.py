from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class IncidentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    type: str = Field("road_block", description="road_block | landslide | flood | bridge_issue | road_damage")
    severity: str = Field("medium", description="low | medium | high | critical")
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    photo_url: Optional[str] = None
    reported_by: str = "field_staff"


class IncidentUpdate(BaseModel):
    status: Optional[str] = Field(None, description="reported | acknowledged | in_progress | resolved")
    severity: Optional[str] = None
    description: Optional[str] = None


class IncidentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    type: str
    severity: str
    status: str
    latitude: float
    longitude: float
    location_name: Optional[str]
    district: Optional[str]
    state: Optional[str]
    photo_url: Optional[str]
    reported_by: str
    created_at: str
    updated_at: str
