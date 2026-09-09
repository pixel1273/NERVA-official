"""
NERVA Landslide Predictor — Predicts landslide probability from terrain + weather features.

Uses XGBoost (Gradient Boosted Trees) trained on NER-specific features.
For SIH demo: trains on synthetic data that mimics real NER conditions.
For production: retrain on ISRO Landslide Atlas + IMD historical rainfall data.
"""
import os
import json
import logging
import random
import math
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# NER region terrain profiles (realistic baseline values)
NER_TERRAIN_PROFILES = {
    "Siliguri": {"elevation_m": 122, "slope_angle": 5.0, "soil_type": "alluvial", "geology": "sedimentary", "vegetation_cover": 0.6},
    "Gangtok": {"elevation_m": 1650, "slope_angle": 35.0, "soil_type": "laterite", "geology": "metamorphic", "vegetation_cover": 0.7},
    "Guwahati": {"elevation_m": 55, "slope_angle": 3.0, "soil_type": "alluvial", "geology": "sedimentary", "vegetation_cover": 0.5},
    "Tezpur": {"elevation_m": 48, "slope_angle": 2.0, "soil_type": "alluvial", "geology": "sedimentary", "vegetation_cover": 0.55},
    "Nagaon": {"elevation_m": 60, "slope_angle": 2.5, "soil_type": "alluvial", "geology": "sedimentary", "vegetation_cover": 0.5},
    "Jorhat": {"elevation_m": 116, "slope_angle": 2.5, "soil_type": "alluvial", "geology": "sedimentary", "vegetation_cover": 0.5},
    "Dibrugarh": {"elevation_m": 104, "slope_angle": 3.0, "soil_type": "alluvial", "geology": "sedimentary", "vegetation_cover": 0.45},
    "Tinsukia": {"elevation_m": 116, "slope_angle": 3.5, "soil_type": "alluvial", "geology": "sedimentary", "vegetation_cover": 0.45},
    "Shillong": {"elevation_m": 1496, "slope_angle": 25.0, "soil_type": "laterite", "geology": "metamorphic", "vegetation_cover": 0.65},
    "Tura": {"elevation_m": 349, "slope_angle": 18.0, "soil_type": "laterite", "geology": "sedimentary", "vegetation_cover": 0.7},
    "Itanagar": {"elevation_m": 320, "slope_angle": 28.0, "soil_type": "sandy_loam", "geology": "metamorphic", "vegetation_cover": 0.8},
    "Tawang": {"elevation_m": 3048, "slope_angle": 40.0, "soil_type": "rocky", "geology": "metamorphic", "vegetation_cover": 0.6},
    "Dimapur": {"elevation_m": 194, "slope_angle": 8.0, "soil_type": "sandy_loam", "geology": "sedimentary", "vegetation_cover": 0.6},
    "Kohima": {"elevation_m": 1444, "slope_angle": 38.0, "soil_type": "laterite", "geology": "metamorphic", "vegetation_cover": 0.75},
    "Mokokchung": {"elevation_m": 1325, "slope_angle": 30.0, "soil_type": "laterite", "geology": "metamorphic", "vegetation_cover": 0.7},
    "Imphal": {"elevation_m": 786, "slope_angle": 15.0, "soil_type": "clay", "geology": "sedimentary", "vegetation_cover": 0.5},
    "Churachandpur": {"elevation_m": 914, "slope_angle": 22.0, "soil_type": "laterite", "geology": "metamorphic", "vegetation_cover": 0.7},
    "Silchar": {"elevation_m": 22, "slope_angle": 4.0, "soil_type": "alluvial", "geology": "sedimentary", "vegetation_cover": 0.4},
    "Aizawl": {"elevation_m": 1132, "slope_angle": 32.0, "soil_type": "laterite", "geology": "metamorphic", "vegetation_cover": 0.75},
    "Lunglei": {"elevation_m": 880, "slope_angle": 28.0, "soil_type": "laterite", "geology": "metamorphic", "vegetation_cover": 0.8},
    "Agartala": {"elevation_m": 12, "slope_angle": 2.0, "soil_type": "alluvial", "geology": "sedimentary", "vegetation_cover": 0.5},
}

# Encode categorical features as numeric
SOIL_ENCODING = {"alluvial": 0, "laterite": 1, "sandy_loam": 2, "clay": 3, "rocky": 4}
GEOLOGY_ENCODING = {"sedimentary": 0, "metamorphic": 1, "ignite": 2, "volcanic": 3}


class LandslidePredictor:
    """
    Predicts landslide probability using gradient boosted trees.
    Features: rainfall, slope, soil, elevation, geology, antecedent rainfall, vegetation.
    """

    def __init__(self):
        self.model = None
        self.is_trained = False
        self._model_path = os.path.join(os.path.dirname(__file__), "models", "landslide_xgb.json")

        # Try to load a pre-trained model; if not found, train on synthetic data
        if os.path.exists(self._model_path):
            self._load_model()
        else:
            logger.info("No pre-trained landslide model found. Training on synthetic NER data...")
            self._train_on_synthetic_data()

    def _generate_synthetic_dataset(self, n_samples: int = 5000) -> Tuple[list, list]:
        """
        Generate synthetic training data that mimics real NER landslide conditions.
        Based on empirical relationships from geological literature:
        - High slope + heavy rain + weak soil → high probability
        - Low slope + dry + strong geology → low probability
        """
        X = []
        y = []
        random.seed(42)

        for _ in range(n_samples):
            # Sample features with realistic NER distributions
            rainfall_mm = random.uniform(0, 350)          # Daily rainfall (mm)
            slope_angle = random.uniform(0, 55)            # Degrees
            elevation_m = random.uniform(10, 3500)
            soil_type = random.choice(list(SOIL_ENCODING.values()))
            geology = random.choice(list(GEOLOGY_ENCODING.values()))
            antecedent_rainfall_7d = random.uniform(0, 800)  # 7-day cumulative rainfall (mm)
            vegetation_cover = random.uniform(0.1, 0.95)
            seismic_zone = random.choice([4, 5])           # NER is in zones IV-V

            # Physics-informed landslide probability calculation
            # Based on shallow landslide initiation models
            slope_factor = min(1.0, slope_angle / 45.0) ** 1.5
            rain_factor = min(1.0, rainfall_mm / 200.0) ** 1.2
            saturation_factor = min(1.0, antecedent_rainfall_7d / 500.0)
            soil_weakness = {0: 0.3, 1: 0.6, 2: 0.5, 3: 0.7, 4: 0.2}[soil_type]
            geology_weakness = {0: 0.4, 1: 0.6, 2: 0.3, 3: 0.5}[geology]
            vegetation_protection = 1.0 - (vegetation_cover * 0.4)
            seismic_factor = 1.0 + (seismic_zone - 4) * 0.15

            # Composite probability
            raw_prob = (
                slope_factor * 0.30
                + rain_factor * 0.25
                + saturation_factor * 0.15
                + soil_weakness * 0.10
                + geology_weakness * 0.08
                + vegetation_protection * 0.07
                + (seismic_factor - 1.0) * 0.05
            )

            # Add noise and clamp
            prob = max(0.0, min(1.0, raw_prob + random.gauss(0, 0.08)))

            # Binary label: landslide occurred (1) or not (0)
            label = 1 if random.random() < prob else 0

            X.append([
                rainfall_mm, slope_angle, elevation_m, soil_type,
                geology, antecedent_rainfall_7d, vegetation_cover, seismic_zone
            ])
            y.append(label)

        return X, y

    def _train_on_synthetic_data(self):
        """Train XGBoost model on synthetic NER data."""
        try:
            import xgboost as xgb
            import numpy as np
        except ImportError:
            logger.warning("xgboost/numpy not installed. Using fallback heuristic model.")
            self.is_trained = False
            return

        X, y = self._generate_synthetic_dataset(n_samples=8000)
        X = np.array(X)
        y = np.array(y)

        # Split 80/20
        split = int(0.8 * len(X))
        X_train, X_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]

        dtrain = xgb.DMatrix(
            X_train, label=y_train,
            feature_names=["rainfall_mm", "slope_angle", "elevation_m", "soil_type",
                           "geology", "antecedent_rainfall_7d", "vegetation_cover", "seismic_zone"]
        )
        dtest = xgb.DMatrix(
            X_test, label=y_test,
            feature_names=["rainfall_mm", "slope_angle", "elevation_m", "soil_type",
                           "geology", "antecedent_rainfall_7d", "vegetation_cover", "seismic_zone"]
        )

        params = {
            "objective": "binary:logistic",
            "eval_metric": "auc",
            "max_depth": 6,
            "learning_rate": 0.1,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "seed": 42,
        }

        self.model = xgb.train(
            params, dtrain,
            num_boost_round=200,
            evals=[(dtest, "test")],
            verbose_eval=False,
        )

        # Evaluate
        preds = self.model.predict(dtest)
        accuracy = sum(1 for p, a in zip(preds, y_test) if (p > 0.5) == a) / len(y_test)
        logger.info(f"Landslide model trained. Test accuracy: {accuracy:.3f}")

        # Save model
        os.makedirs(os.path.dirname(self._model_path), exist_ok=True)
        self.model.save_model(self._model_path)
        self.is_trained = True

    def _load_model(self):
        """Load a pre-trained XGBoost model."""
        try:
            import xgboost as xgb
            self.model = xgb.Booster()
            self.model.load_model(self._model_path)
            self.is_trained = True
            logger.info("Loaded pre-trained landslide model")
        except ImportError:
            logger.warning("xgboost not installed. Using fallback heuristic model.")
            self.is_trained = False

    def predict(
        self,
        location: str,
        rainfall_mm: float,
        antecedent_rainfall_7d: float = 0.0,
        seismic_zone: int = 5,
    ) -> Dict:
        """
        Predict landslide probability for a specific NER location.

        Args:
            location: NER city/node name (e.g., "Kohima", "Gangtok")
            rainfall_mm: Current daily rainfall in mm
            antecedent_rainfall_7d: Cumulative rainfall in past 7 days (mm)
            seismic_zone: Seismic zone (4 or 5 for NER)

        Returns:
            Dict with probability, risk_level, contributing_factors, and recommendation
        """
        terrain = NER_TERRAIN_PROFILES.get(location)
        if not terrain:
            return {
                "location": location,
                "probability": None,
                "risk_level": "unknown",
                "error": f"No terrain data for location '{location}'",
            }

        soil_encoded = SOIL_ENCODING.get(terrain["soil_type"], 2)
        geology_encoded = GEOLOGY_ENCODING.get(terrain["geology"], 0)

        features = [
            rainfall_mm,
            terrain["slope_angle"],
            terrain["elevation_m"],
            soil_encoded,
            geology_encoded,
            antecedent_rainfall_7d,
            terrain["vegetation_cover"],
            seismic_zone,
        ]

        if self.is_trained and self.model is not None:
            probability = self._predict_xgb(features)
        else:
            probability = self._predict_heuristic(features)

        risk_level = self._classify_risk(probability)
        factors = self._get_contributing_factors(features, terrain)

        return {
            "location": location,
            "probability": round(probability, 4),
            "risk_level": risk_level,
            "contributing_factors": factors,
            "terrain": {
                "slope_angle": terrain["slope_angle"],
                "elevation_m": terrain["elevation_m"],
                "soil_type": terrain["soil_type"],
                "geology": terrain["geology"],
            },
            "weather_input": {
                "rainfall_mm": rainfall_mm,
                "antecedent_rainfall_7d": antecedent_rainfall_7d,
            },
            "recommendation": self._get_recommendation(risk_level),
        }

    def predict_for_segment(
        self,
        u: str,
        v: str,
        rainfall_mm: float,
        antecedent_rainfall_7d: float = 0.0,
    ) -> float:
        """
        Predict landslide risk for a road segment between two nodes.
        Returns the max risk of either endpoint.
        Used by OmniRoute to dynamically update edge weights.
        """
        risk_u = self.predict(u, rainfall_mm, antecedent_rainfall_7d)
        risk_v = self.predict(v, rainfall_mm, antecedent_rainfall_7d)

        prob_u = risk_u.get("probability") or 0.0
        prob_v = risk_v.get("probability") or 0.0

        return max(prob_u, prob_v)

    def _predict_xgb(self, features: list) -> float:
        """Run prediction through the trained XGBoost model."""
        import xgboost as xgb
        import numpy as np
        dmatrix = xgb.DMatrix(
            [features],
            feature_names=["rainfall_mm", "slope_angle", "elevation_m", "soil_type",
                           "geology", "antecedent_rainfall_7d", "vegetation_cover", "seismic_zone"]
        )
        return float(self.model.predict(dmatrix)[0])

    def _predict_heuristic(self, features: list) -> float:
        """
        Fallback heuristic model when XGBoost is not available.
        Uses the same physics-informed formula as synthetic data generation.
        """
        rainfall_mm, slope_angle, elevation_m, soil_type, geology, ant_rain_7d, veg_cover, seismic = features

        slope_factor = min(1.0, slope_angle / 45.0) ** 1.5
        rain_factor = min(1.0, rainfall_mm / 200.0) ** 1.2
        saturation_factor = min(1.0, ant_rain_7d / 500.0)
        soil_weakness = {0: 0.3, 1: 0.6, 2: 0.5, 3: 0.7, 4: 0.2}.get(int(soil_type), 0.5)
        geology_weakness = {0: 0.4, 1: 0.6, 2: 0.3, 3: 0.5}.get(int(geology), 0.4)
        vegetation_protection = 1.0 - (veg_cover * 0.4)

        prob = (
            slope_factor * 0.30
            + rain_factor * 0.25
            + saturation_factor * 0.15
            + soil_weakness * 0.10
            + geology_weakness * 0.08
            + vegetation_protection * 0.07
        )
        return max(0.0, min(1.0, prob))

    def _classify_risk(self, probability: float) -> str:
        if probability >= 0.75:
            return "critical"
        elif probability >= 0.50:
            return "high"
        elif probability >= 0.25:
            return "moderate"
        else:
            return "low"

    def _get_contributing_factors(self, features: list, terrain: dict) -> List[str]:
        factors = []
        rainfall_mm = features[0]
        slope = features[1]
        ant_rain = features[5]

        if rainfall_mm > 100:
            factors.append(f"Heavy rainfall ({rainfall_mm:.0f}mm)")
        if slope > 25:
            factors.append(f"Steep slope ({slope:.0f}°)")
        if ant_rain > 300:
            factors.append(f"High soil saturation ({ant_rain:.0f}mm in 7 days)")
        if terrain["soil_type"] in ("laterite", "clay"):
            factors.append(f"Weak soil type ({terrain['soil_type']})")
        if terrain["geology"] == "metamorphic":
            factors.append("Unstable geological formation (metamorphic)")

        return factors if factors else ["No significant risk factors detected"]

    def _get_recommendation(self, risk_level: str) -> str:
        recommendations = {
            "critical": "EVACUATE: Immediate evacuation advisory. Close road segment. Deploy emergency responders.",
            "high": "ALERT: Issue travel warning. Restrict heavy vehicles. Pre-position emergency equipment.",
            "moderate": "MONITOR: Increase monitoring frequency. Prepare alternate routes. Notify district admin.",
            "low": "NORMAL: Continue standard operations. Routine monitoring sufficient.",
        }
        return recommendations.get(risk_level, "Unknown risk level")


# Singleton instance
landslide_predictor = LandslidePredictor()
