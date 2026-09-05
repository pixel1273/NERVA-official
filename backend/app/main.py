
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from .models.routing import RouteRequest, RouteResponse, HazardUpdate
from .models.incident import IncidentCreate, IncidentUpdate, IncidentResponse
from .models.fleet import FleetVehicle, FleetPositionUpdate, FleetRerouteRequest
from .models.alert import AlertCreate, AlertResponse

from .services.omniroute import engine as route_engine
from .services import incidents as incident_service
from .services import fleet as fleet_service
from .services import alerts as alert_service
from .database.db import init_db, seed_data, get_connection
from . import auth

# Initialize database on startup
init_db()
seed_data()

app = FastAPI(
    title="NERVA API",
    description="NER Vulnerability & Accessibility Intelligence Platform — Backend API with AI/ML",
    version="2.0.0"
)

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────
# AUTHENTICATION & RBAC
# ─────────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Extract user from JWT and verify existence in DB."""
    payload = auth.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    conn = get_connection()
    user = conn.execute(
        "SELECT users.*, roles.role_name FROM users JOIN roles ON users.role_id = roles.id WHERE username = ?",
        (username,)
    ).fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return dict(user)

class RoleChecker:
    """Dependency to restrict access to specific roles."""
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: dict = Depends(get_current_user)):
        if user["role_name"] not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return user

# Role Constants
ROLE_GROUND = "role_ground_staff"
ROLE_ADMIN = "role_district_admin"
ROLE_COMMAND = "role_central_command"

@app.post("/api/auth/login", tags=["Auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate user and return JWT token."""
    conn = get_connection()
    user = conn.execute(
        "SELECT users.* FROM users WHERE username = ?",
        (form_data.username,)
    ).fetchone()
    conn.close()

    if not user or not auth.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", tags=["Auth"])
def get_me(user: dict = Depends(get_current_user)):
    """Get current user profile and role."""
    return {
        "username": user["username"],
        "full_name": user["full_name"],
        "role": user["role_name"]
    }


# ─────────────────────────────────────────────────────────
# ROUTING (OmniRoute Engine)
# ─────────────────────────────────────────────────────────

@app.post("/api/route", response_model=RouteResponse, tags=["Routing"], dependencies=[Depends(get_current_user)])
def calculate_route(request: RouteRequest):
    """Calculate the optimal risk-aware route between two NER locations."""
    return route_engine.get_route(request.origin, request.destination, request.risk_weight, request.avoid_blocked)


@app.post("/api/route/alternatives", response_model=List[RouteResponse], tags=["Routing"], dependencies=[Depends(get_current_user)])
def get_alternative_routes(request: RouteRequest):
    """Get alternate contingency routes."""
    return route_engine.get_alternative_routes(request.origin, request.destination, request.risk_weight, request.avoid_blocked)


@app.get("/api/route/segments", response_model=List[Dict[str, Any]], tags=["Routing"], dependencies=[Depends(get_current_user)])
def get_segments():
    """Get all road segments with risk data — feeds the GIS map overlays."""
    return route_engine.get_all_segments()


@app.post("/api/route/update-hazard", tags=["Routing"], dependencies=[Depends(RoleChecker([ROLE_ADMIN, ROLE_COMMAND]))])
def update_hazard(update: HazardUpdate):
    """Update road segment hazard levels (triggered by incidents or weather data)."""
    success = route_engine.update_edge_hazard(update.u, update.v, update.landslide_risk, update.weather_hazard, update.is_blocked)
    if not success:
        raise HTTPException(status_code=404, detail=f"Segment '{update.u}' → '{update.v}' not found")
    return {"message": "Hazard updated", "segment": {"u": update.u, "v": update.v}}


# ─────────────────────────────────────────────────────────
# INCIDENTS (Field Reports — used by Ground Staff + District Admin)
# ─────────────────────────────────────────────────────────

@app.post("/api/incidents", response_model=IncidentResponse, tags=["Incidents"], dependencies=[Depends(get_current_user)])
def create_incident(data: IncidentCreate):
    """Ground staff submits a new geo-tagged field report."""
    return incident_service.create_incident(data)


@app.post("/api/incidents/ai", tags=["Incidents", "AI/ML"], dependencies=[Depends(get_current_user)])
async def create_incident_with_ai(data: IncidentCreate):
    """Submit a field report with AI-powered severity auto-classification."""
    return await incident_service.create_incident_with_ai(data)


@app.get("/api/incidents", response_model=List[IncidentResponse], tags=["Incidents"], dependencies=[Depends(get_current_user)])
def list_incidents(
    district: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200)
):
    """Get incidents with optional filters."""
    return incident_service.get_incidents(district, severity, status, limit)


@app.get("/api/incidents/{incident_id}", response_model=IncidentResponse, tags=["Incidents"], dependencies=[Depends(get_current_user)])
def get_incident(incident_id: int):
    """Get full details of a single incident."""
    inc = incident_service.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc


@app.patch("/api/incidents/{incident_id}", response_model=IncidentResponse, tags=["Incidents"], dependencies=[Depends(RoleChecker([ROLE_ADMIN, ROLE_COMMAND]))])
def update_incident(incident_id: int, data: IncidentUpdate):
    """District Admin updates incident status (acknowledged, resolved, etc)."""
    inc = incident_service.update_incident(incident_id, data)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc


# ─────────────────────────────────────────────────────────
# FLEET TRACKING (Central Command View)
# ─────────────────────────────────────────────────────────

@app.get("/api/fleet", response_model=List[FleetVehicle], tags=["Fleet"], dependencies=[Depends(RoleChecker([ROLE_COMMAND]))])
def list_fleet():
    """Get all tracked vehicles with current positions."""
    return fleet_service.get_all_vehicles()


@app.post("/api/fleet/{vehicle_id}/position", tags=["Fleet"], dependencies=[Depends(get_current_user)])
def update_fleet_position(vehicle_id: str, data: FleetPositionUpdate):
    """Vehicle sends its GPS position update."""
    vehicle = fleet_service.update_position(vehicle_id, data.latitude, data.longitude)
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle '{vehicle_id}' not found")
    return {"message": "Position updated", "vehicle_id": vehicle_id}


@app.post("/api/fleet/reroute", tags=["Fleet"], dependencies=[Depends(RoleChecker([ROLE_COMMAND]))])
def reroute_fleet(data: FleetRerouteRequest):
    """Central Command triggers mass rerouting after a road closure."""
    return fleet_service.reroute_fleet(data.blocked_segment_u, data.blocked_segment_v)


# ─────────────────────────────────────────────────────────
# ALERTS (District Admin → Drivers/Public)
# ─────────────────────────────────────────────────────────

@app.post("/api/alerts", response_model=AlertResponse, tags=["Alerts"], dependencies=[Depends(RoleChecker([ROLE_ADMIN, ROLE_COMMAND]))])
def create_alert(data: AlertCreate):
    """District Admin creates a multilingual alert."""
    return alert_service.create_alert(data)


@app.post("/api/alerts/translate", response_model=AlertResponse, tags=["Alerts", "AI/ML"], dependencies=[Depends(RoleChecker([ROLE_ADMIN, ROLE_COMMAND]))])
async def create_alert_with_translation(data: AlertCreate):
    """Create an alert with AI auto-translation."""
    return await alert_service.create_alert_with_translation(data)


@app.get("/api/alerts", response_model=List[AlertResponse], tags=["Alerts"], dependencies=[Depends(get_current_user)])
def list_alerts(active_only: bool = Query(True)):
    """Get all active alerts."""
    return alert_service.get_alerts(active_only)


# ─────────────────────────────────────────────────────────
# AI/ML — LANDSLIDE PREDICTION
# ─────────────────────────────────────────────────────────

class LandslidePredictionRequest(BaseModel):
    location: str = Field(..., description="NER city name (e.g., 'Kohima', 'Gangtok')")
    rainfall_mm: float = Field(..., ge=0, description="Current daily rainfall in mm")
    antecedent_rainfall_7d: float = Field(0.0, ge=0, description="Cumulative rainfall in past 7 days (mm)")
    seismic_zone: int = Field(5, ge=4, le=5, description="Seismic zone (4 or 5)")


@app.post("/api/predict/landslide", tags=["AI/ML"], dependencies=[Depends(get_current_user)])
def predict_landslide(request: LandslidePredictionRequest):
    """Predict landslide probability for a specific NER location."""
    from .ml.landslide_predictor import landslide_predictor
    return landslide_predictor.predict(
        location=request.location,
        rainfall_mm=request.rainfall_mm,
        antecedent_rainfall_7d=request.antecedent_rainfall_7d,
        seismic_zone=request.seismic_zone,
    )


@app.get("/api/predict/landslide/locations", tags=["AI/ML"], dependencies=[Depends(get_current_user)])
def get_prediction_locations():
    """Get all NER locations that have terrain profiles for landslide prediction."""
    from .ml.landslide_predictor import NER_TERRAIN_PROFILES
    return {
        "locations": list(NER_TERRAIN_PROFILES.keys()),
        "total": len(NER_TERRAIN_PROFILES),
    }


# ─────────────────────────────────────────────────────────
# AI/ML — IMAGE SEVERITY CLASSIFICATION
# ─────────────────────────────────────────────────────────

@app.post("/api/classify/image", tags=["AI/ML"], dependencies=[Depends(get_current_user)])
async def classify_image(file: UploadFile = File(...)):
    """Upload a road damage photo and get AI-powered severity classification."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (JPEG or PNG)")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    from .ml.image_classifier import image_classifier
    result = await image_classifier.classify(image_bytes)
    result["filename"] = file.filename
    return result


# ─────────────────────────────────────────────────────────
# AI/ML — TEXT SEVERITY CLASSIFICATION
# ─────────────────────────────────────────────────────────

class TextClassifyRequest(BaseModel):
    text: str = Field(..., description="Incident description text to classify")
    incident_type: Optional[str] = Field(None, description="Optional: road_block, landslide, flood, etc.")


@app.post("/api/classify/text", tags=["AI/ML"], dependencies=[Depends(get_current_user)])
def classify_text(request: TextClassifyRequest):
    """Classify incident report text into severity levels."""
    from .ml.text_classifier import text_classifier
    return text_classifier.classify(request.text, request.incident_type)


# ─────────────────────────────────────────────────────────
# AI/ML — EARLY WARNING SYSTEM
# ─────────────────────────────────────────────────────────

@app.post("/api/early-warning/scan", tags=["AI/ML", "Early Warning"], dependencies=[Depends(RoleChecker([ROLE_COMMAND]))])
async def run_early_warning_scan():
    """Run a full early warning scan across all NER locations."""
    from .services.early_warning import early_warning
    return await early_warning.run_scan()


@app.post("/api/early-warning/generate-alerts", tags=["AI/ML", "Early Warning"], dependencies=[Depends(RoleChecker([ROLE_COMMAND]))])
async def generate_early_warning_alerts():
    """Run a scan AND create multilingual alerts for all high-risk locations."""
    from .services.early_warning import early_warning
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


@app.get("/api/early-warning/last-scan", tags=["AI/ML", "Early Warning"], dependencies=[Depends(get_current_user)])
def get_last_scan():
    """Get results of the most recent early warning scan."""
    from .services.early_warning import early_warning
    result = early_warning.get_last_scan()
    if not result:
        raise HTTPException(status_code=404, detail="No scan has been run yet. POST /api/early-warning/scan first.")
    return result


# ─────────────────────────────────────────────────────────
# AI/ML — TRANSLATION
# ─────────────────────────────────────────────────────────

class TranslateRequest(BaseModel):
    text: str = Field(..., description="English text to translate")
    target_langs: Optional[List[str]] = Field(None, description="Language codes: as, hi, mn, mz, na, bn")


@app.post("/api/translate", tags=["AI/ML"], dependencies=[Depends(get_current_user)])
async def translate_text(request: TranslateRequest):
    """Translate English text to NER regional languages using AI."""
    from .ml.translator import translator
    try:
        translations = await translator.translate_all(request.text, request.target_langs)
        return {"original": request.text, "translations": translations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


# ─────────────────────────────────────────────────────────
# DASHBOARD STATS (Aggregated data for overview screens)
# ─────────────────────────────────────────────────────────

@app.get("/api/dashboard/stats", tags=["Dashboard"], dependencies=[Depends(get_current_user)])
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

# ─────────────────────────────────────────────────────────
# HISTORICAL ANALYTICS
# ─────────────────────────────────────────────────────────

@app.get("/api/analytics/seasonal", tags=["Analytics"], dependencies=[Depends(get_current_user)])
def get_seasonal_analytics():
    """Get historical seasonal disruption data for charts."""
    return {
        "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        "landslides": [2, 3, 5, 12, 45, 80, 95, 85, 40, 15, 5, 2],
        "floods": [0, 0, 1, 5, 20, 60, 85, 75, 30, 10, 2, 0],
        "road_blocks": [10, 12, 15, 25, 50, 90, 110, 100, 60, 30, 15, 10],
        "impact_score": [1.5, 1.8, 2.5, 4.0, 7.5, 9.2, 9.8, 9.5, 6.5, 4.2, 2.0, 1.6]
    }
