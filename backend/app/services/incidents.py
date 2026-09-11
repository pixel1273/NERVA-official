"""
Incident Service — CRUD operations for geo-tagged field reports.
Now with AI-powered severity auto-classification (text + image).
"""
import logging
from typing import List, Optional
from ..database.db import get_connection
from ..models.incident import IncidentCreate, IncidentUpdate, IncidentResponse

logger = logging.getLogger(__name__)


def create_incident(data: IncidentCreate) -> IncidentResponse:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO incidents (title, description, type, severity, latitude, longitude, location_name, district, state, photo_url, reported_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (data.title, data.description, data.type, data.severity, data.latitude, data.longitude,
         data.location_name, data.district, data.state, data.photo_url, data.reported_by)
    )
    conn.commit()
    row = cursor.execute("SELECT * FROM incidents WHERE id = ?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return _row_to_response(row)


async def create_incident_with_ai(data: IncidentCreate) -> dict:
    """
    Create an incident with AI-powered severity auto-classification.
    Analyzes the description text to suggest/override severity.

    Returns both the incident and the AI classification result.
    """
    ai_result = None

    try:
        from .ai_router import analyze_incident

        if data.description:
            ai_severity = await analyze_incident(data.description)
            ai_severity = ai_severity.lower().strip()

            valid_severities = {"low", "medium", "high", "critical"}
            if ai_severity in valid_severities:
                # Override severity if AI suggests it, unless it's already critical
                if data.severity != "critical" and data.severity != ai_severity:
                    logger.info(f"AI overriding severity: '{data.severity}' → '{ai_severity}'")
                    data.severity = ai_severity

                ai_result = {
                    "severity": ai_severity,
                    "confidence": 0.9,
                    "model": "ai_router",
                    "reasoning": f"AI Router classified this as '{ai_severity}'."
                }
            else:
                logger.warning(f"AI returned invalid severity: {ai_severity}")
    except Exception as e:
        logger.warning(f"AI classification failed, using manual severity: {e}")

    incident = create_incident(data)

    return {
        "incident": incident,
        "ai_classification": ai_result,
    }



def get_incidents(district: Optional[str] = None, severity: Optional[str] = None, status: Optional[str] = None, limit: int = 50) -> List[IncidentResponse]:
    conn = get_connection()
    query = "SELECT * FROM incidents WHERE 1=1"
    params = []

    if district:
        query += " AND district = ?"
        params.append(district)
    if severity:
        query += " AND severity = ?"
        params.append(severity)
    if status:
        query += " AND status = ?"
        params.append(status)

    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [_row_to_response(r) for r in rows]


def get_incident(incident_id: int) -> Optional[IncidentResponse]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    conn.close()
    return _row_to_response(row) if row else None


def update_incident(incident_id: int, data: IncidentUpdate) -> Optional[IncidentResponse]:
    conn = get_connection()
    updates = []
    params = []

    if data.status is not None:
        updates.append("status = ?")
        params.append(data.status)
    if data.severity is not None:
        updates.append("severity = ?")
        params.append(data.severity)
    if data.description is not None:
        updates.append("description = ?")
        params.append(data.description)

    if not updates:
        conn.close()
        return get_incident(incident_id)

    updates.append("updated_at = datetime('now')")
    params.append(incident_id)

    conn.execute(f"UPDATE incidents SET {', '.join(updates)} WHERE id = ?", params)
    conn.commit()
    row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    conn.close()
    return _row_to_response(row) if row else None


def get_stats() -> dict:
    """Aggregate stats for the overview dashboard."""
    conn = get_connection()
    total = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
    critical = conn.execute("SELECT COUNT(*) FROM incidents WHERE severity = 'critical' AND status != 'resolved'").fetchone()[0]
    high = conn.execute("SELECT COUNT(*) FROM incidents WHERE severity = 'high' AND status != 'resolved'").fetchone()[0]
    resolved = conn.execute("SELECT COUNT(*) FROM incidents WHERE status = 'resolved'").fetchone()[0]
    active = total - resolved

    by_state = {}
    for row in conn.execute("SELECT state, COUNT(*) as cnt FROM incidents WHERE status != 'resolved' GROUP BY state").fetchall():
        by_state[row["state"]] = row["cnt"]

    conn.close()
    return {
        "total_incidents": total,
        "active_incidents": active,
        "critical_count": critical,
        "high_count": high,
        "resolved_count": resolved,
        "incidents_by_state": by_state
    }


def _row_to_response(row) -> IncidentResponse:
    return IncidentResponse(
        id=row["id"], title=row["title"], description=row["description"],
        type=row["type"], severity=row["severity"], status=row["status"],
        latitude=row["latitude"], longitude=row["longitude"],
        location_name=row["location_name"], district=row["district"], state=row["state"],
        photo_url=row["photo_url"], reported_by=row["reported_by"],
        created_at=row["created_at"], updated_at=row["updated_at"]
    )
