from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/predict", tags=["AI/ML"])

class LandslidePredictionRequest(BaseModel):
    location: str = Field(..., description="NER city name (e.g., 'Kohima', 'Gangtok')")
    rainfall_mm: float = Field(..., ge=0, description="Current daily rainfall in mm")
    antecedent_rainfall_7d: float = Field(0.0, ge=0, description="Cumulative rainfall in past 7 days (mm)")
    seismic_zone: int = Field(5, ge=4, le=5, description="Seismic zone (4 or 5)")

@router.post("/landslide", dependencies=[Depends(get_current_user)])
def predict_landslide(request: LandslidePredictionRequest):
    """Predict landslide probability for a specific NER location."""
    from ..ml.landslide_predictor import landslide_predictor
    return landslide_predictor.predict(
        location=request.location,
        rainfall_mm=request.rainfall_mm,
        antecedent_rainfall_7d=request.antecedent_rainfall_7d,
        seismic_zone=request.seismic_zone,
    )

@router.get("/landslide/locations", dependencies=[Depends(get_current_user)])
def get_prediction_locations():
    """Get all NER locations that have terrain profiles for landslide prediction."""
    from ..ml.landslide_predictor import NER_TERRAIN_PROFILES
    return {
        "locations": list(NER_TERRAIN_PROFILES.keys()),
        "total": len(NER_TERRAIN_PROFILES),
    }
