from fastapi import APIRouter, Depends
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/seasonal", dependencies=[Depends(get_current_user)])
def get_seasonal_analytics():
    """Get historical seasonal disruption data for charts."""
    return {
        "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        "landslides": [2, 3, 5, 12, 45, 80, 95, 85, 40, 15, 5, 2],
        "floods": [0, 0, 1, 5, 20, 60, 85, 75, 30, 10, 2, 0],
        "road_blocks": [10, 12, 15, 25, 50, 90, 110, 100, 60, 30, 15, 10],
        "impact_score": [1.5, 1.8, 2.5, 4.0, 7.5, 9.2, 9.8, 9.5, 6.5, 4.2, 2.0, 1.6]
    }
