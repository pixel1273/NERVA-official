from fastapi import APIRouter, Depends
from ..dependencies import RoleChecker, ROLE_COMMAND

router = APIRouter(prefix="/api/system", tags=["System"])

@router.get("/api-keys/status", dependencies=[Depends(RoleChecker([ROLE_COMMAND]))])
def get_api_key_status():
    """Check the health and availability of configured API keys (admin only)."""
    from ..api_keys import key_manager
    return key_manager.status()
