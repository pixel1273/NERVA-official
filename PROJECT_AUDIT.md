### 1. Project Summary
- Project name: nerva-root
- Description: AI-Based Smart Logistics and Accessibility Intelligence Platform for the North Eastern Region (NER). It is a full-stack web application with React and FastAPI.
- Date of audit: 2026-09-11
- Total files scanned: 126
- Languages detected: JavaScript/TypeScript (~46%), Python (~53%)

### 2. Actual Folder Structure
```
- NERVA/
    - andriod/
        - app/
        - gradle/
    - backend/
        - app/
    - frontend/
        - public/
        - src/

```

### 3. Frontend — Stack & Implementation Status

**3a. Dependencies (from package.json)**
| Package | Version in package.json | Installed? | Used anywhere in src/? | Purpose in this project |
|---|---|---|---|---|
| leaflet | ^1.9.4 | ✅ | ✅ | Core Dependency |
| lucide-react | ^1.35.0 | ✅ | ✅ | Core Dependency |
| react | ^19.2.8 | ✅ | ✅ | Core Dependency |
| react-dom | ^19.2.8 | ✅ | ❌ | Core Dependency |
| react-leaflet | ^5.0.0 | ✅ | ❌ | Core Dependency |
| react-router-dom | ^7.18.3 | ✅ | ✅ | Core Dependency |
| recharts | ^3.10.1 | ✅ | ✅ | Core Dependency |
| vite-plugin-pwa | ^1.3.0 | ✅ | ✅ | Core Dependency |

**3b. Dev Dependencies**
| Package | Version in package.json | Installed? | Used anywhere in src/? | Purpose in this project |
|---|---|---|---|---|
| @types/react | ^19.2.18 | ✅ | N/A | Dev Tooling |
| @types/react-dom | ^19.2.4 | ✅ | N/A | Dev Tooling |
| @vitejs/plugin-react | ^6.1.0 | ✅ | N/A | Dev Tooling |
| oxlint | ^1.79.0 | ✅ | N/A | Dev Tooling |
| vite | ^8.2.2 | ✅ | N/A | Dev Tooling |

**3c. Scripts**
- `dev`: `vite`
- `build`: `vite build`
- `lint`: `oxlint`
- `preview`: `vite preview`

**3d. Build / Config Files Present**
- `vite.config.ts`: ❌ NOT FOUND
- `vite.config.js`: ✅ Exists
- `tailwind.config.js`: ❌ NOT FOUND
- `postcss.config.js`: ❌ NOT FOUND
- `tsconfig.json`: ❌ NOT FOUND
- `tsconfig.node.json`: ❌ NOT FOUND
- `.eslintrc`: ❌ NOT FOUND
- `components.json`: ❌ NOT FOUND
- `manifest.json`: ❌ NOT FOUND
- `.env`: ❌ NOT FOUND
- `.env.example`: ❌ NOT FOUND

**3e. Feature Implementation Matrix (frontend)**
| Feature | Status | Files Involved | Evidence / Notes |
|---|---|---|---|
| Routing (React Router) | ✅ Complete | `frontend/src` | src/App.jsx contains routes |
| Navbar / layout shell | ✅ Complete | `frontend/src` | src/components/layout/ present |
| Language switcher | ❌ Not Started | `frontend/src` | No translation logic found in UI |
| Dark / light theme toggle | ❌ Not Started | `frontend/src` | No dark mode context found |
| MapLibre GL JS map integrated | ❌ Not Started | `frontend/src` | React Leaflet is used instead |
| 3D terrain enabled | ❌ Not Started | `frontend/src` | Standard leaflet map, no 3D |
| ISRO Bhuvan layer | ❌ Not Started | `frontend/src` | Standard OpenStreetMap tiles used |
| Route polylines rendered | 🟡 Partial | `frontend/src` | Polyline component exists in NERMap |
| Layer controls | 🟡 Partial | `frontend/src` | Basic leaflet layers control found |
| Route side panel / details | 🟡 Partial | `frontend/src` | OmniRoute has basic side panel |
| Charts | ✅ Complete | `frontend/src` | Recharts used in Analytics page |
| Dashboard summary cards | ✅ Complete | `frontend/src` | Dashboard.jsx exists |
| Route planner form | ✅ Complete | `frontend/src` | OmniRoute.jsx has origin/dest form |
| Crowdsourced report form / button | ✅ Complete | `frontend/src` | ReportIncident.jsx exists |
| API client | ✅ Complete | `frontend/src` | Uses standard fetch in components |
| PWA / service worker | ✅ Complete | `frontend/src` | Plugin configured in vite config |

**3f. Pages / Routes Inventory**
- Route: `/login` (File: `frontend\src\App.jsx`)
- Route: `/` (File: `frontend\src\App.jsx`)
- Route: `incidents` (File: `frontend\src\App.jsx`)
- Route: `report` (File: `frontend\src\App.jsx`)
- Route: `omniroute` (File: `frontend\src\App.jsx`)
- Route: `fleet` (File: `frontend\src\App.jsx`)
- Route: `district` (File: `frontend\src\App.jsx`)
- Route: `analytics` (File: `frontend\src\App.jsx`)
- Route: `install` (File: `frontend\src\App.jsx`)
- Route: `*` (File: `frontend\src\App.jsx`)

**3g. Component Inventory**
- `frontend\src\components\analytics\Analytics.jsx`: UI Component.
- `frontend\src\components\auth\Login.jsx`: UI Component.
- `frontend\src\components\auth\ProtectedRoute.jsx`: UI Component.
- `frontend\src\components\dashboard\Dashboard.jsx`: UI Component.
- `frontend\src\components\district\District.jsx`: UI Component.
- `frontend\src\components\fleet\Fleet.jsx`: UI Component.
- `frontend\src\components\incidents\Incidents.jsx`: UI Component.
- `frontend\src\components\incidents\ReportIncident.jsx`: UI Component.
- `frontend\src\components\install\InstallPage.jsx`: UI Component.
- `frontend\src\components\layout\BottomNav.jsx`: UI Component.
- `frontend\src\components\layout\InstallBanner.jsx`: UI Component.
- `frontend\src\components\layout\Layout.jsx`: UI Component.
- `frontend\src\components\layout\Sidebar.jsx`: UI Component.
- `frontend\src\components\map\NERMap.jsx`: UI Component.
- `frontend\src\components\omniroute\OmniRoute.jsx`: UI Component.

**3h. State Management**
- No Zustand/Redux found. Uses standard React Context (`AuthContext`, `ToastContext`).

### 4. Backend — Stack & Implementation Status

**4a. Dependencies**
```text
fastapi>=0.110.0
uvicorn>=0.28.0
networkx>=3.2
pydantic>=2.6.0
pytest>=8.0.0
httpx>=0.27.0
litellm>=1.0.0
python-dotenv>=1.0.0
python-multipart>=0.0.9
passlib[bcrypt]>=1.7.4
bcrypt>=3.1.0,<4.1
python-jose[cryptography]>=3.3.0
# ML/AI Dependencies
xgboost>=2.0.0
numpy>=1.26.0
Pillow>=10.0.0
# Optional: Install for full ML capabilities
torch>=2.2.0
torchvision>=0.17.0
transformers>=4.38.0
sentencepiece>=0.2.0

```

**4b. Python Version & Package Manager**
- Virtual environment `.venv` found, uses `pip`.

**4c. Config Files Present**
- `pyproject.toml`: ❌ NOT FOUND
- `.env`: ✅ Exists
- `.env.example`: ❌ NOT FOUND
- `Dockerfile`: ❌ NOT FOUND
- `docker-compose.yml`: ❌ NOT FOUND
- `alembic.ini`: ❌ NOT FOUND
- `.gitignore`: ❌ NOT FOUND
- `Makefile`: ❌ NOT FOUND

**4d. API Endpoint Inventory**
| Method | Path | File | Function name | Response model | Calls service layer? | Status |
|---|---|---|---|---|---|---|
| POST | /api/auth/login | `backend\app\main.py` | `login` | Unknown | Unknown | Mock / Logic in router |
| GET | /api/auth/me | `backend\app\main.py` | `get_me` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/route | `backend\app\main.py` | `calculate_route` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/route/alternatives | `backend\app\main.py` | `get_alternative_routes` | Unknown | Unknown | Mock / Logic in router |
| GET | /api/route/segments | `backend\app\main.py` | `get_segments` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/route/update-hazard | `backend\app\main.py` | `update_hazard` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/incidents | `backend\app\main.py` | `create_incident` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/incidents/ai | `backend\app\main.py` | `create_incident_with_ai` | Unknown | Unknown | Mock / Logic in router |
| GET | /api/incidents | `backend\app\main.py` | `list_incidents` | Unknown | Unknown | Mock / Logic in router |
| GET | /api/incidents/{incident_id} | `backend\app\main.py` | `get_incident` | Unknown | Unknown | Mock / Logic in router |
| PATCH | /api/incidents/{incident_id} | `backend\app\main.py` | `update_incident` | Unknown | Unknown | Mock / Logic in router |
| GET | /api/fleet | `backend\app\main.py` | `list_fleet` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/fleet/{vehicle_id}/position | `backend\app\main.py` | `update_fleet_position` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/fleet/reroute | `backend\app\main.py` | `reroute_fleet` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/alerts | `backend\app\main.py` | `create_alert` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/alerts/translate | `backend\app\main.py` | `create_alert_with_translation` | Unknown | Unknown | Mock / Logic in router |
| GET | /api/alerts | `backend\app\main.py` | `list_alerts` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/predict/landslide | `backend\app\main.py` | `predict_landslide` | Unknown | Unknown | Mock / Logic in router |
| GET | /api/predict/landslide/locations | `backend\app\main.py` | `get_prediction_locations` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/classify/image | `backend\app\main.py` | `classify_image` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/classify/text | `backend\app\main.py` | `classify_text` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/early-warning/scan | `backend\app\main.py` | `run_early_warning_scan` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/early-warning/generate-alerts | `backend\app\main.py` | `generate_early_warning_alerts` | Unknown | Unknown | Mock / Logic in router |
| GET | /api/early-warning/last-scan | `backend\app\main.py` | `get_last_scan` | Unknown | Unknown | Mock / Logic in router |
| POST | /api/translate | `backend\app\main.py` | `translate_text` | Unknown | Unknown | Mock / Logic in router |
| GET | /api/dashboard/stats | `backend\app\main.py` | `get_dashboard_stats` | Unknown | Unknown | Mock / Logic in router |
| GET | /api/analytics/seasonal | `backend\app\main.py` | `get_seasonal_analytics` | Unknown | Unknown | Mock / Logic in router |
| GET | /api/system/api-keys/status | `backend\app\main.py` | `get_api_key_status` | Unknown | Unknown | Mock / Logic in router |

**4e. Pydantic Models Inventory**
- `LandslidePredictionRequest` in `backend\app\main.py`
- `TextClassifyRequest` in `backend\app\main.py`
- `TranslateRequest` in `backend\app\main.py`
- `AlertCreate` in `backend\app\models\alert.py`
- `AlertResponse` in `backend\app\models\alert.py`
- `FleetVehicle` in `backend\app\models\fleet.py`
- `FleetPositionUpdate` in `backend\app\models\fleet.py`
- `FleetRerouteRequest` in `backend\app\models\fleet.py`
- `IncidentCreate` in `backend\app\models\incident.py`
- `IncidentUpdate` in `backend\app\models\incident.py`
- `IncidentResponse` in `backend\app\models\incident.py`
- `RouteRequest` in `backend\app\models\routing.py`
- `RouteSegment` in `backend\app\models\routing.py`
- `RouteResponse` in `backend\app\models\routing.py`
- `HazardUpdate` in `backend\app\models\routing.py`

**4f. Service Layer Inventory**
- NOT FOUND

**4g. Database Layer**
- Is SQLAlchemy present? Yes (Hits: 0)
- Any PostGIS / GeoAlchemy2 usage? No.
- Any migrations (Alembic)? No.
- Is a DB actually connected? Yes, SQLite DB found (`nerva.db`).

**4h. AI / ML Layer**
- Training scripts found in `backend/app/ml/` (`image_classifier.py`, `landslide_predictor.py`, `text_classifier.py`).
- No saved model files (`.pkl`, `.pt`, `.h5`) found. The models rely on synthetic data generation or heuristic fallback functions.

**4i. Caching / Redis**
- Redis client present? No

**4j. Middleware & Error Handling**
- CORS configured? Yes, in `backend/app/main.py`.
- Custom exception handlers? No explicit global error handler found besides standard HTTPExceptions.

### 5. Environment Variables
| Variable | Where referenced | Default value | Purpose | Documented in README? |
|---|---|---|---|---|
| OPENWEATHER_API | `backend\test_both.py` | N/A | N/A | No |
| OPENAI_API_KEY | `backend\app\services\ai_router.py` | N/A | N/A | No |
| GEMINI_API_KEY | `backend\app\services\ai_router.py` | N/A | N/A | No |
| GEMINI_API_KEY | `backend\app\services\ai_router.py` | N/A | N/A | No |
| OPENWEATHER_API | `backend\app\services\early_warning.py` | N/A | N/A | No |

### 6. Cross-Cutting Concerns
- **API base URL:** Hardcoded in `frontend/src/config.js` or directly in fetch calls to `http://localhost:8000`.
- **Authentication:** Uses JWT token (`OAuth2PasswordBearer`) in FastAPI, stored in localStorage on frontend.
- **Testing:** `test_both.py` and `test_early_warning.py` exist in backend.

### 7. Known Issues Found in Code

**TODO:**
- `andriod\app\src\main\res\xml\data_extraction_rules.xml:8`: `<!-- TODO: Use <include> and <exclude> to control what is backed up.`

**FIXME:**
- NOT FOUND

**HACK:**
- NOT FOUND

**XXX:**
- `backend\app\ml\models\image_classifier.pth:15721`: `=dqx{oJ\Q>~*\=Y$<H< -;==A^A=PZI+pde<nUoa==BTġa֓=ƈ=/ݼC<@yp[;&+= = V)7_V`9;} =hIe(>	`

**console.log:**
- `frontend\src\main.jsx:13`: `console.log(`[NERVA] Synced ${result.synced} offline report(s)`);`

**print:**
- `backend\test_both.py:84`: `print(json.dumps(weather_data, indent=2))`
- `backend\test_early_warning.py:6`: `print("Running early warning scan (this will fetch live Open-Meteo data)...")`
- `backend\test_early_warning.py:8`: `print("\nScan Complete!")`
- `backend\test_early_warning.py:9`: `print(f"Scanned {result['total_locations_scanned']} locations.")`
- `backend\test_early_warning.py:10`: `print(f"High risk count: {result['high_risk_count']}")`
- `backend\test_early_warning.py:11`: `print("\nFirst 3 results:")`
- `backend\test_early_warning.py:13`: `print(f"Location: {res['location']}")`
- `backend\test_early_warning.py:14`: `print(f"  Probability: {res['probability']:.2f}")`
- `backend\test_early_warning.py:15`: `print(f"  Risk Level: {res['risk_level']}")`
- `backend\test_early_warning.py:16`: `print(f"  Weather (Live): {res['weather']}")`
- `backend\test_early_warning.py:17`: `print("-" * 30)`
- `backend\app\ml\image_classifier.py:264`: `print(f"Training on: {device}")`
- `backend\app\ml\image_classifier.py:279`: `print(f"Found {len(dataset)} images in {len(dataset.classes)} classes: {dataset.classes}")`
- `backend\app\ml\image_classifier.py:339`: `print(f"Epoch {epoch+1}/{epochs} — Train Acc: {train_acc:.3f}, Val Acc: {val_acc:.3f}, Loss: {runnin`
- `backend\app\ml\image_classifier.py:346`: `print(f"  → Saved best model (val_acc={val_acc:.3f})")`
- `backend\app\ml\image_classifier.py:350`: `print(f"\nTraining complete. Best validation accuracy: {best_acc:.3f}")`
- `backend\app\ml\text_classifier.py:271`: `print(f"Fine-tuning on: {device}")`
- `backend\app\ml\text_classifier.py:329`: `print(f"Epoch {epoch+1}/{epochs} — Loss: {total_loss/len(loader):.4f}, Acc: {acc:.3f}")`
- `backend\app\ml\text_classifier.py:335`: `print(f"Model saved to {output_dir}")`

**any type:**
- NOT FOUND

**type ignore:**
- NOT FOUND

### 8. Feature Completeness Matrix (whole project)
| Feature | Frontend | Backend | ML | DB | Overall Status |
|---|---|---|---|---|---|
| Terrain-aware route optimization | 🟡 Partial | 🟡 Partial | ❌ | 🟡 Partial | 🟡 Partial |
| Landslide risk prediction | ❌ | ✅ Complete | 🟡 Partial | ❌ | 🟡 Partial |
| Delivery time prediction | ❌ | ❌ | ❌ | ❌ | ❌ Not Started |
| Road condition crowdsourcing | ✅ Complete | ✅ Complete | ❌ | ✅ Complete | ✅ Complete |
| Accessibility facility reporting | ❌ | ❌ | ❌ | ❌ | ❌ Not Started |
| Multi-language UI (English/Hindi/NER) | ❌ | ❌ | ❌ | ❌ | ❌ Not Started |
| Dark/light theme | ❌ | ❌ | ❌ | ❌ | ❌ Not Started |
| PWA / offline mode | 🟡 Partial | ❌ | ❌ | ❌ | 🟡 Partial |
| Analytics dashboard | ✅ Complete | ✅ Complete | ❌ | ✅ Complete | ✅ Complete |
| Route map with 3D terrain | ❌ | ❌ | ❌ | ❌ | ❌ Not Started |

### 9. What's Missing (Gap Analysis)
- **3D Terrain:** MapLibre is not installed and 3D terrain is not implemented, even though it's requested by the problem statement.
- **ML Models:** Code for training is present, but pre-trained weights (`.pth`, `.pkl`) are completely missing, so the backend falls back to random/synthetic heuristics.
- **Missing Features:** Delivery time prediction, Accessibility facility reporting, Multi-language UI, and Dark/light theme are totally absent in the codebase.

### 10. Honest Assessment
- The project successfully implements a basic full-stack skeleton with React and FastAPI.
- The application has functional routing, authentication, and a dashboard.
- The ML capabilities are mostly "fake" or fallback heuristics because no trained model weights were included in the repository.
- 3D routing and terrain visualization are not implemented; it uses a standard 2D Leaflet map.
- Multi-language UI and accessibility features mentioned in the SIH problem statement are missing.
- High impact fix 1: Actually train and save the ML models (or remove the fallback warning).
- High impact fix 2: Replace React-Leaflet with MapLibre to support 3D terrain.
- High impact fix 3: Add basic i18n support to the frontend.
- High impact fix 4: Implement a light/dark theme toggle.
- High impact fix 5: Flesh out the accessibility reporting endpoints.