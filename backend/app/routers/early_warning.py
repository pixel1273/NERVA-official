from fastapi import APIRouter, Depends, HTTPException
from ..dependencies import get_current_user, RoleChecker, ROLE_COMMAND
from ..models.alert import AlertCreate
from ..services import alerts as alert_service

router = APIRouter(prefix="/api/early-warning", tags=["AI/ML", "Early Warning"])

@router.post("/scan", dependencies=[Depends(RoleChecker([ROLE_COMMAND]))])
async def run_early_warning_scan():
    """Run a full early warning scan across all NER locations."""
    from ..services.early_warning import early_warning
    return await early_warning.run_scan()

@router.post("/generate-alerts", dependencies=[Depends(RoleChecker([ROLE_COMMAND]))])
async def generate_early_warning_alerts():
    """Run a scan AND create multilingual alerts for all high-risk locations."""
    from ..services.early_warning import early_warning
    scan_result = await early_warning.run_scan()
    created_alerts = await early_warning.create_auto_alerts(scan_result)

    saved = []
    for alert_data in created_alerts:
        alert_create = AlertCreate(**alert_data)
        saved_alert = alert_service.create_alert(alert_create)
        saved.append(saved_alert)

    return {
        "scan": scan_result,
        "alerts_created": len(saved),
        "alerts": saved,
    }

@router.get("/last-scan", dependencies=[Depends(get_current_user)])
def get_last_scan():
    """Get results of the most recent early warning scan."""
    from ..services.early_warning import early_warning
    result = early_warning.get_last_scan()
    if not result:
        raise HTTPException(status_code=404, detail="No scan has been run yet. POST /api/early-warning/scan first.")
    return result
