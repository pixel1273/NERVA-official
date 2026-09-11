from fastapi import APIRouter, Depends
from ..dependencies import get_current_user
from ..services import incidents as incident_service
from ..services import fleet as fleet_service
from ..services import alerts as alert_service
from ..services.omniroute import engine as route_engine

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats", dependencies=[Depends(get_current_user)])
def get_dashboard_stats():
    """Aggregated stats for the Central Command overview page."""
    incident_stats = incident_service.get_stats()
    fleet_stats = fleet_service.get_fleet_stats()
    road_segments = route_engine.get_all_segments()
    blocked_segments = [s for s in road_segments if s["is_blocked"]]

    return {
        "incidents": incident_stats,
        "fleet": fleet_stats,
        "routes": {
            "total_segments": len(road_segments),
            "blocked_segments": len(blocked_segments),
            "operational_pct": round((1 - len(blocked_segments) / max(len(road_segments), 1)) * 100, 1)
        },
        "active_alerts": len(alert_service.get_alerts(active_only=True))
    }
