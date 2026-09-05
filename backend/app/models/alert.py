from pydantic import BaseModel, Field
from typing import Optional


class AlertCreate(BaseModel):
    title: str
    message_en: str
    message_as: Optional[str] = None  # Assamese
    message_hi: Optional[str] = None  # Hindi
    message_mn: Optional[str] = None  # Manipuri
    severity: str = Field("warning", description="info | warning | critical")
    district: Optional[str] = None
    target_audience: str = Field("all", description="all | drivers | officials | public")


class AlertResponse(BaseModel):
    id: int
    title: str
    message_en: str
    message_as: Optional[str]
    message_hi: Optional[str]
    message_mn: Optional[str]
    severity: str
    district: Optional[str]
    target_audience: str
    is_active: bool
    created_at: str
