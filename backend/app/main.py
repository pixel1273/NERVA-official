from dotenv import load_dotenv
load_dotenv()  # Load .env before anything else reads env vars

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database.db import init_db, seed_data

from .routers import (
    auth, routes, incidents, fleet, alerts,
    predict, classify, early_warning, translate,
    dashboard, analytics, system
)

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

# Include all modular routers
app.include_router(auth.router)
app.include_router(routes.router)
app.include_router(incidents.router)
app.include_router(fleet.router)
app.include_router(alerts.router)
app.include_router(predict.router)
app.include_router(classify.router)
app.include_router(early_warning.router)
app.include_router(translate.router)
app.include_router(dashboard.router)
app.include_router(analytics.router)
app.include_router(system.router)
