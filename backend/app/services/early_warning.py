"""
NERVA Early Warning Engine — Proactive alert generation based on AI predictions + weather data.

Monitors weather conditions across NER locations and auto-generates alerts when
the landslide/flood model predicts danger above configurable thresholds.

In production, this runs as a Celery background task polling IMD every 30 minutes.
For SIH demo, it can be triggered manually via API endpoint.
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Risk thresholds for auto-alert generation
ALERT_THRESHOLDS = {
    "critical": 0.75,  # Auto-generate critical alert + evacuation recommendation
    "high": 0.50,      # Auto-generate warning alert
    "moderate": 0.25,  # Log for monitoring, no alert
}

# Simulated IMD weather data for NER stations (in production, fetch from IMD API)
SIMULATED_WEATHER = {
    "Siliguri": {"rainfall_mm": 45, "antecedent_7d": 120, "temp_c": 28, "humidity": 85},
    "Gangtok": {"rainfall_mm": 180, "antecedent_7d": 450, "temp_c": 18, "humidity": 95},
    "Guwahati": {"rainfall_mm": 30, "antecedent_7d": 80, "temp_c": 30, "humidity": 80},
    "Tezpur": {"rainfall_mm": 25, "antecedent_7d": 70, "temp_c": 29, "humidity": 78},
    "Jorhat": {"rainfall_mm": 40, "antecedent_7d": 100, "temp_c": 28, "humidity": 82},
    "Dibrugarh": {"rainfall_mm": 35, "antecedent_7d": 90, "temp_c": 27, "humidity": 80},
    "Shillong": {"rainfall_mm": 120, "antecedent_7d": 350, "temp_c": 20, "humidity": 92},
    "Tura": {"rainfall_mm": 85, "antecedent_7d": 220, "temp_c": 24, "humidity": 88},
    "Itanagar": {"rainfall_mm": 150, "antecedent_7d": 400, "temp_c": 22, "humidity": 93},
    "Dimapur": {"rainfall_mm": 55, "antecedent_7d": 140, "temp_c": 26, "humidity": 84},
    "Kohima": {"rainfall_mm": 200, "antecedent_7d": 520, "temp_c": 17, "humidity": 96},
    "Imphal": {"rainfall_mm": 90, "antecedent_7d": 250, "temp_c": 23, "humidity": 90},
    "Silchar": {"rainfall_mm": 110, "antecedent_7d": 300, "temp_c": 25, "humidity": 91},
    "Aizawl": {"rainfall_mm": 140, "antecedent_7d": 380, "temp_c": 21, "humidity": 94},
    "Agartala": {"rainfall_mm": 60, "antecedent_7d": 160, "temp_c": 29, "humidity": 86},
}


class EarlyWarningEngine:
    """
    Proactive warning system that combines ML predictions with weather data
    to auto-generate alerts for at-risk NER locations.
    """

    def __init__(self):
        self._last_scan_results = []
        self._last_scan_time = None

    async def run_scan(self, weather_data: Optional[Dict] = None) -> Dict:
        """
        Scan all NER locations for landslide/flood risk and generate warnings.

        Args:
            weather_data: Optional custom weather data dict. If None, uses simulated data.

        Returns:
            Dict with scan results, alerts generated, and recommendations.
        """
        from ..ml.landslide_predictor import landslide_predictor

        if weather_data is None:
            weather_data = SIMULATED_WEATHER

        scan_results = []
        alerts_to_generate = []

        for location, weather in weather_data.items():
            # Run landslide prediction
            prediction = landslide_predictor.predict(
                location=location,
                rainfall_mm=weather["rainfall_mm"],
                antecedent_rainfall_7d=weather["antecedent_7d"],
            )

            probability = prediction.get("probability", 0)
            risk_level = prediction.get("risk_level", "unknown")

            result = {
                "location": location,
                "probability": probability,
                "risk_level": risk_level,
                "weather": weather,
                "contributing_factors": prediction.get("contributing_factors", []),
                "recommendation": prediction.get("recommendation", ""),
            }
            scan_results.append(result)

            # Auto-generate alert if threshold exceeded
            if probability and probability >= ALERT_THRESHOLDS["high"]:
                alert_severity = "critical" if probability >= ALERT_THRESHOLDS["critical"] else "warning"
                alerts_to_generate.append({
                    "location": location,
                    "severity": alert_severity,
                    "probability": probability,
                    "risk_level": risk_level,
                    "message_en": self._generate_alert_message(location, risk_level, prediction, weather),
                    "factors": prediction.get("contributing_factors", []),
                })

        # Sort by risk (highest first)
        scan_results.sort(key=lambda x: x.get("probability", 0) or 0, reverse=True)

        self._last_scan_results = scan_results
        self._last_scan_time = datetime.utcnow().isoformat()

        return {
            "scan_time": self._last_scan_time,
            "total_locations_scanned": len(scan_results),
            "high_risk_count": sum(1 for r in scan_results if r["risk_level"] in ("critical", "high")),
            "alerts_generated": alerts_to_generate,
            "results": scan_results,
        }

    async def create_auto_alerts(self, scan_result: Dict) -> List[Dict]:
        """
        Take scan results and create actual alerts in the database.
        Also auto-translates to regional languages.
        """
        from ..ml.translator import translator

        created_alerts = []

        for alert_data in scan_result.get("alerts_generated", []):
            message_en = alert_data["message_en"]

            # Auto-translate
            try:
                translations = await translator.translate_all(message_en, ["as", "hi", "mn"])
            except Exception as e:
                logger.warning(f"Translation failed for alert at {alert_data['location']}: {e}")
                translations = {"as": None, "hi": None, "mn": None}

            alert = {
                "title": f"⚠️ {alert_data['risk_level'].upper()} Risk — {alert_data['location']}",
                "message_en": message_en,
                "message_as": translations.get("as"),
                "message_hi": translations.get("hi"),
                "message_mn": translations.get("mn"),
                "severity": alert_data["severity"],
                "district": alert_data["location"],
                "target_audience": "all",
            }
            created_alerts.append(alert)

        return created_alerts

    def get_last_scan(self) -> Optional[Dict]:
        """Get results of the most recent scan."""
        if not self._last_scan_results:
            return None
        return {
            "scan_time": self._last_scan_time,
            "results": self._last_scan_results,
        }

    def _generate_alert_message(self, location: str, risk_level: str, prediction: Dict, weather: Dict) -> str:
        """Generate a human-readable alert message."""
        factors = prediction.get("contributing_factors", [])
        factors_str = "; ".join(factors[:3]) if factors else "multiple risk factors"

        if risk_level == "critical":
            return (
                f"CRITICAL LANDSLIDE WARNING for {location}. "
                f"Risk probability: {prediction['probability']:.0%}. "
                f"Causes: {factors_str}. "
                f"Current rainfall: {weather['rainfall_mm']}mm. "
                f"AVOID all travel on roads near {location}. "
                f"Evacuation may be required for nearby settlements."
            )
        elif risk_level == "high":
            return (
                f"HIGH LANDSLIDE RISK near {location}. "
                f"Risk probability: {prediction['probability']:.0%}. "
                f"Causes: {factors_str}. "
                f"Heavy vehicles should avoid the area. "
                f"Use alternate routes where available."
            )
        else:
            return (
                f"Moderate landslide risk detected near {location}. "
                f"Risk probability: {prediction['probability']:.0%}. "
                f"Monitor conditions and exercise caution."
            )


# Singleton instance
early_warning = EarlyWarningEngine()
