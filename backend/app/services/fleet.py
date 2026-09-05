"""
Fleet Tracking Service — Vehicle position management and mass rerouting.
"""
from typing import List, Optional
from ..database.db import get_connection
from ..models.fleet import FleetVehicle
from .omniroute import engine as route_engine


def get_all_vehicles() -> List[FleetVehicle]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM fleet ORDER BY last_updated DESC").fetchall()
    conn.close()
    return [_row_to_vehicle(r) for r in rows]

def _get_cargo_priority(cargo_type: str) -> int:
    cargo = cargo_type.lower()
    if any(k in cargo for k in ['medical', 'medicine', 'oxygen']):
        return 3
    if any(k in cargo for k in ['food', 'water', 'ration', 'fuel', 'essential']):
        return 2
    return 1


def update_position(vehicle_id: str, lat: float, lng: float) -> Optional[FleetVehicle]:
    conn = get_connection()
    conn.execute(
        "UPDATE fleet SET current_lat = ?, current_lng = ?, last_updated = datetime('now') WHERE vehicle_id = ?",
        (lat, lng, vehicle_id)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM fleet WHERE vehicle_id = ?", (vehicle_id,)).fetchone()
    conn.close()
    return _row_to_vehicle(row) if row else None


def reroute_fleet(blocked_u: str, blocked_v: str) -> dict:
    """
    When a road segment is blocked, find all trucks whose route passes through it
    and compute new routes for them using OmniRoute.
    """
    # First mark the segment as blocked in the routing engine
    route_engine.update_edge_hazard(blocked_u, blocked_v, is_blocked=True)

    conn = get_connection()
    vehicles = conn.execute("SELECT * FROM fleet WHERE status IN ('in_transit', 'delayed')").fetchall()
    conn.close()

    rerouted = []
    failed = []

    for v in vehicles:
        origin = v["origin"]
        destination = v["destination"]
        if not origin or not destination:
            continue

        # Check if this truck's route would pass through the blocked segment
        # by computing a route and checking if it uses that edge
        new_route = route_engine.get_route(origin, destination, risk_weight=0.7, avoid_blocked=True)

        if new_route.status == "success":
            rerouted.append({
                "vehicle_id": v["vehicle_id"],
                "driver_name": v["driver_name"],
                "cargo_type": v["cargo_type"],
                "priority": _get_cargo_priority(v["cargo_type"]),
                "new_route": new_route.path,
                "new_distance_km": new_route.total_distance_km,
                "new_eta_hours": new_route.estimated_travel_time_hours
            })
        else:
            failed.append({
                "vehicle_id": v["vehicle_id"],
                "driver_name": v["driver_name"],
                "reason": "No available route found"
            })

    # Sort rerouted by priority descending
    rerouted.sort(key=lambda x: x["priority"], reverse=True)

    return {
        "blocked_segment": f"{blocked_u} → {blocked_v}",
        "total_vehicles_checked": len(vehicles),
        "rerouted": rerouted,
        "no_route_available": failed
    }


def get_fleet_stats() -> dict:
    conn = get_connection()
    total = conn.execute("SELECT COUNT(*) FROM fleet").fetchone()[0]
    in_transit = conn.execute("SELECT COUNT(*) FROM fleet WHERE status = 'in_transit'").fetchone()[0]
    delayed = conn.execute("SELECT COUNT(*) FROM fleet WHERE status = 'delayed'").fetchone()[0]
    blocked = conn.execute("SELECT COUNT(*) FROM fleet WHERE status = 'blocked'").fetchone()[0]
    conn.close()
    return {"total_vehicles": total, "in_transit": in_transit, "delayed": delayed, "blocked": blocked}


def _row_to_vehicle(row) -> FleetVehicle:
    return FleetVehicle(
        id=row["id"], vehicle_id=row["vehicle_id"], vehicle_type=row["vehicle_type"],
        driver_name=row["driver_name"], cargo_type=row["cargo_type"],
        origin=row["origin"], destination=row["destination"],
        current_lat=row["current_lat"], current_lng=row["current_lng"],
        status=row["status"], last_updated=row["last_updated"]
    )
