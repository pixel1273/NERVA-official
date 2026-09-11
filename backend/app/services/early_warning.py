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
import httpx

logger = logging.getLogger(__name__)

# NER Node Coordinates (same as frontend map)
NODE_COORDS = {
    "Gangtok":       [27.3389, 88.6065],
    "Siliguri":      [26.7271, 88.3953],
    "Guwahati":      [26.1445, 91.7362],
    "Tezpur":        [26.6338, 92.7897],
    "Nagaon":        [26.3500, 92.6840],
    "Jorhat":        [26.7509, 94.2037],
    "Dibrugarh":     [27.4728, 94.9120],
    "Tinsukia":      [27.4922, 95.3547],
    "Silchar":       [24.8333, 92.7789],
    "Shillong":      [25.5788, 91.8933],
    "Tura":          [25.5144, 90.2187],
    "Itanagar":      [27.1000, 93.6167],
    "Tawang":        [27.5860, 91.8595],
    "Dimapur":       [25.9042, 93.7266],
    "Kohima":        [25.6751, 94.1086],
    "Mokokchung":    [26.3225, 94.5204],
    "Imphal":        [24.8170, 93.9368],
    "Churachandpur": [24.3337, 93.6833],
    "Aizawl":        [23.7271, 92.7176],
    "Lunglei":       [22.8839, 92.7275],
    "Agartala":      [23.8315, 91.2868],
}

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
    "Nagaon": {"rainfall_mm": 35, "antecedent_7d": 85, "temp_c": 29, "humidity": 80},
    "Jorhat": {"rainfall_mm": 40, "antecedent_7d": 100, "temp_c": 28, "humidity": 82},
    "Dibrugarh": {"rainfall_mm": 35, "antecedent_7d": 90, "temp_c": 27, "humidity": 80},
    "Tinsukia": {"rainfall_mm": 40, "antecedent_7d": 95, "temp_c": 27, "humidity": 82},
    "Shillong": {"rainfall_mm": 120, "antecedent_7d": 350, "temp_c": 20, "humidity": 92},
    "Tura": {"rainfall_mm": 85, "antecedent_7d": 220, "temp_c": 24, "humidity": 88},
    "Itanagar": {"rainfall_mm": 150, "antecedent_7d": 400, "temp_c": 22, "humidity": 93},
    "Tawang": {"rainfall_mm": 100, "antecedent_7d": 280, "temp_c": 10, "humidity": 90},
    "Dimapur": {"rainfall_mm": 55, "antecedent_7d": 140, "temp_c": 26, "humidity": 84},
    "Kohima": {"rainfall_mm": 200, "antecedent_7d": 520, "temp_c": 17, "humidity": 96},
    "Mokokchung": {"rainfall_mm": 130, "antecedent_7d": 340, "temp_c": 19, "humidity": 91},
    "Imphal": {"rainfall_mm": 90, "antecedent_7d": 250, "temp_c": 23, "humidity": 90},
    "Churachandpur": {"rainfall_mm": 95, "antecedent_7d": 260, "temp_c": 22, "humidity": 91},
    "Silchar": {"rainfall_mm": 110, "antecedent_7d": 300, "temp_c": 25, "humidity": 91},
    "Aizawl": {"rainfall_mm": 140, "antecedent_7d": 380, "temp_c": 21, "humidity": 94},
    "Lunglei": {"rainfall_mm": 145, "antecedent_7d": 390, "temp_c": 22, "humidity": 93},
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
            weather_data: Optional custom weather data dict. If None, fetches real data from Open-Meteo.

        Returns:
            Dict with scan results, alerts generated, and recommendations.
        """
        from ..ml.landslide_predictor import landslide_predictor

        if weather_data is None:
            weather_data = await self.fetch_real_weather()

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

    async def fetch_real_weather(self) -> Dict:
        """Fetch actual weather data from Open-Meteo and OpenWeather for all NER locations."""
        import asyncio
        import os
        try:
            locations = list(NODE_COORDS.keys())
            lats = [coord[0] for coord in NODE_COORDS.values()]
            lons = [coord[1] for coord in NODE_COORDS.values()]
            
            # Bulk query Open-Meteo for past 7 days and current day precipitation
            om_url = f"https://api.open-meteo.com/v1/forecast?latitude={','.join(map(str, lats))}&longitude={','.join(map(str, lons))}&daily=precipitation_sum,temperature_2m_max&past_days=7&forecast_days=1&timezone=Asia%2FKolkata"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                om_resp = await client.get(om_url)
                om_resp.raise_for_status()
                om_data = om_resp.json()
            
            if isinstance(om_data, dict):
                om_data = [om_data]
                
            openweather_key = os.getenv("OPENWEATHER_API")
            ow_data_list = [None] * len(locations)
            
            # Fetch OpenWeather concurrently
            if openweather_key:
                async def fetch_ow(idx, lat, lon):
                    ow_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={openweather_key}&units=metric"
                    try:
                        async with httpx.AsyncClient(timeout=5.0) as ow_client:
                            resp = await ow_client.get(ow_url)
                            if resp.status_code == 200:
                                return idx, resp.json()
                    except Exception:
                        pass
                    return idx, None

                tasks = [fetch_ow(i, lats[i], lons[i]) for i in range(len(locations))]
                results = await asyncio.gather(*tasks)
                for idx, data in results:
                    ow_data_list[idx] = data
            
            weather_data = {}
            for idx, loc_data in enumerate(om_data):
                loc_name = locations[idx]
                daily = loc_data.get("daily", {})
                precip = daily.get("precipitation_sum", [])
                
                if len(precip) >= 8:
                    # Last item is today, previous 7 are antecedent
                    rainfall_today = precip[-1] or 0.0
                    antecedent_7d = sum(p for p in precip[:-1] if p is not None)
                else:
                    rainfall_today = 0.0
                    antecedent_7d = 0.0
                    
                temp_c = daily.get("temperature_2m_max", [0])[-1] if daily.get("temperature_2m_max") else 25
                humidity = 85
                
                # Integrate OpenWeather current data
                ow_data = ow_data_list[idx]
                if ow_data:
                    temp_c = ow_data.get("main", {}).get("temp", temp_c)
                    humidity = ow_data.get("main", {}).get("humidity", humidity)
                    # Add current rain if raining now
                    rain_1h = ow_data.get("rain", {}).get("1h", 0)
                    if rain_1h > 0:
                        rainfall_today += rain_1h
                        
                weather_data[loc_name] = {
                    "rainfall_mm": round(rainfall_today, 1),
                    "antecedent_7d": round(antecedent_7d, 1),
                    "temp_c": round(temp_c, 1),
                    "humidity": round(humidity, 1)
                }
                
            logger.info(f"Successfully fetched real weather data from Open-Meteo & OpenWeather for {len(locations)} locations.")
            return weather_data
        except Exception as e:
            logger.error(f"Failed to fetch real weather data: {e}. Falling back to SIMULATED_WEATHER.")
            return SIMULATED_WEATHER

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
