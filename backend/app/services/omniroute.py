"""
OmniRoute Engine — Risk-aware pathfinding across the NER road network.

Uses a weighted directed graph (NetworkX) where edge costs factor in:
- Physical distance (km)
- Landslide susceptibility (0.0 to 1.0)
- Weather hazard level (0.0 to 1.0)
- Blockage status (boolean)
"""
import networkx as nx
from typing import List, Dict, Any, Optional
from ..models.routing import RouteResponse, RouteSegment


class OmniRouteEngine:
    def __init__(self):
        self.graph = nx.DiGraph()
        self._build_ner_network()

    def _build_ner_network(self):
        """
        Initialize the road network for the 8 NER states.
        Each edge: (from, to, distance_km, landslide_risk, weather_hazard)
        """
        roads = [
            # Sikkim corridor
            ("Siliguri", "Gangtok", 110, 0.6, 0.2),
            # Assam main artery (NH-27 / NH-37)
            ("Siliguri", "Guwahati", 470, 0.1, 0.1),
            ("Guwahati", "Nagaon", 120, 0.1, 0.1),
            ("Guwahati", "Tezpur", 180, 0.1, 0.1),
            ("Nagaon", "Jorhat", 140, 0.15, 0.1),
            ("Tezpur", "Jorhat", 150, 0.2, 0.1),
            ("Jorhat", "Dibrugarh", 140, 0.1, 0.1),
            ("Dibrugarh", "Tinsukia", 50, 0.1, 0.05),
            # Meghalaya
            ("Guwahati", "Shillong", 100, 0.3, 0.2),
            ("Guwahati", "Tura", 200, 0.2, 0.1),
            ("Shillong", "Tura", 220, 0.4, 0.2),
            # Arunachal Pradesh
            ("Tezpur", "Itanagar", 170, 0.5, 0.3),
            ("Tezpur", "Tawang", 320, 0.7, 0.4),
            # Nagaland
            ("Guwahati", "Dimapur", 290, 0.2, 0.1),
            ("Dimapur", "Kohima", 74, 0.8, 0.4),
            ("Dimapur", "Mokokchung", 160, 0.5, 0.3),
            ("Jorhat", "Mokokchung", 120, 0.4, 0.2),
            # Manipur
            ("Kohima", "Imphal", 140, 0.7, 0.3),
            ("Silchar", "Imphal", 260, 0.8, 0.4),
            ("Imphal", "Churachandpur", 60, 0.5, 0.2),
            # Mizoram
            ("Silchar", "Aizawl", 180, 0.6, 0.3),
            ("Aizawl", "Lunglei", 160, 0.65, 0.35),
            # Tripura
            ("Silchar", "Agartala", 250, 0.4, 0.2),
            # Silchar connections
            ("Shillong", "Silchar", 210, 0.7, 0.3),
        ]

        for u, v, dist, landslide, weather in roads:
            # Add both directions (bidirectional roads)
            for src, dst in [(u, v), (v, u)]:
                self.graph.add_edge(
                    src, dst,
                    distance_km=dist,
                    landslide_risk=landslide,
                    weather_hazard=weather,
                    is_blocked=False
                )

    def _edge_weight(self, u: str, v: str, risk_weight: float, avoid_blocked: bool) -> float:
        """Calculate effective routing cost for a road segment."""
        data = self.graph[u][v]
        if avoid_blocked and data.get("is_blocked", False):
            return float('inf')

        dist = data["distance_km"]
        risk_penalty = (data["landslide_risk"] * 2.0) + (data["weather_hazard"] * 1.5)
        return dist * (1.0 + risk_weight * risk_penalty)

    def get_route(self, origin: str, destination: str, risk_weight: float = 0.5, avoid_blocked: bool = True) -> RouteResponse:
        """Compute risk-aware shortest path using Dijkstra."""
        for node in [origin, destination]:
            if node not in self.graph:
                return RouteResponse(path=[], total_distance_km=0, total_risk_score=0, estimated_travel_time_hours=0, status=f"Node '{node}' not found")

        try:
            path = nx.dijkstra_path(
                self.graph, origin, destination,
                weight=lambda u, v, d: self._edge_weight(u, v, risk_weight, avoid_blocked)
            )
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return RouteResponse(path=[], total_distance_km=0, total_risk_score=0, estimated_travel_time_hours=0, status="no_path")

        # Build response with segment details
        total_dist = 0.0
        total_risk = 0.0
        travel_hours = 0.0
        segments = []

        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            d = self.graph[u][v]
            dist = d["distance_km"]
            lr = d["landslide_risk"]
            wh = d["weather_hazard"]

            total_dist += dist
            total_risk += (lr + wh) * dist

            # Speed degrades with risk: base 50 km/h, min 15 km/h
            speed = max(15.0, 50.0 - (lr * 15.0) - (wh * 10.0))
            travel_hours += dist / speed

            segments.append(RouteSegment(u=u, v=v, distance_km=dist, landslide_risk=lr, weather_hazard=wh, is_blocked=d["is_blocked"]))

        return RouteResponse(
            path=path,
            total_distance_km=round(total_dist, 2),
            total_risk_score=round(total_risk, 2),
            estimated_travel_time_hours=round(travel_hours, 2),
            segments=segments
        )

    def get_alternative_routes(self, origin: str, destination: str, risk_weight: float = 0.5, avoid_blocked: bool = True, max_alternatives: int = 2) -> List[RouteResponse]:
        """Find alternate routes by penalizing the primary path edges."""
        primary = self.get_route(origin, destination, risk_weight, avoid_blocked)
        if primary.status != "success" or not primary.path:
            return []

        alternatives = []
        # Save original edge data before penalizing
        saved = {}
        for i in range(len(primary.path) - 1):
            u, v = primary.path[i], primary.path[i + 1]
            saved[(u, v)] = dict(self.graph[u][v])
            self.graph[u][v]["distance_km"] *= 3.0
            self.graph[u][v]["landslide_risk"] = min(1.0, self.graph[u][v]["landslide_risk"] + 0.5)

        alt = self.get_route(origin, destination, risk_weight, avoid_blocked)

        # Restore original data
        for (u, v), data in saved.items():
            for k, val in data.items():
                self.graph[u][v][k] = val

        if alt.status == "success" and alt.path != primary.path:
            alternatives.append(alt)

        return alternatives

    def update_edge_hazard(self, u: str, v: str, landslide_risk: Optional[float] = None, weather_hazard: Optional[float] = None, is_blocked: Optional[bool] = None) -> bool:
        """Update hazard metrics for a road segment (both directions)."""
        updated = False
        for src, dst in [(u, v), (v, u)]:
            if self.graph.has_edge(src, dst):
                if landslide_risk is not None:
                    self.graph[src][dst]["landslide_risk"] = landslide_risk
                if weather_hazard is not None:
                    self.graph[src][dst]["weather_hazard"] = weather_hazard
                if is_blocked is not None:
                    self.graph[src][dst]["is_blocked"] = is_blocked
                updated = True
        return updated

    def get_all_segments(self) -> List[Dict[str, Any]]:
        """Return all unique road segments for map overlays."""
        seen = set()
        segments = []
        for u, v, data in self.graph.edges(data=True):
            pair = tuple(sorted([u, v]))
            if pair not in seen:
                seen.add(pair)
                segments.append({"u": u, "v": v, **{k: data[k] for k in ["distance_km", "landslide_risk", "weather_hazard", "is_blocked"]}})
        return segments


# Singleton instance
engine = OmniRouteEngine()
