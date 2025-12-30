import math
from typing import Dict, Any

class AdvancedFireRiskCalculator:
    def __init__(self):
        self.vegetation_risk_factors = {"pine_forest": 0.9, "mediterranean_forest": 0.8, "mixed_forest": 0.7}
        self.human_activity_factors = {"high": 0.3, "medium": 0.2, "low": 0.1}

    def _calculate_vpd(self, temp_c: float, rh_percent: float) -> float:
        if temp_c is None or rh_percent is None:
            return 0.0
        svp = 6.112 * math.exp((17.67 * temp_c) / (temp_c + 243.5))
        avp = svp * (rh_percent / 100.0)
        return svp - avp

    def calculate_risk(self, features: Dict[str, Any], slope_factor: float, drought_factor: float) -> float:
        temp = features.get("temperature_c", 20.0)
        rh = features.get("relative_humidity", 60.0)
        wind_speed = features.get("wind_speed_ms", 0.0)
        fuel_moisture = features.get("fuel_moisture", 0.5)
        vegetation = features.get("vegetation_type", "mixed_forest")
        human_activity = features.get("human_activity", "low")

        vpd = self._calculate_vpd(temp, rh)
        vpd_risk = min(1.0, max(0.0, (vpd - 15) / 25))
        wind_risk = min(1, wind_speed / 15)
        fuel_risk = 1 - fuel_moisture
        vegetation_risk = self.vegetation_risk_factors.get(vegetation, 0.5)
        human_risk = self.human_activity_factors.get(human_activity, 0.1)

        base_risk = (
            vpd_risk * 0.50 +
            fuel_risk * 0.25 +
            wind_risk * 0.15 +
            vegetation_risk * 0.05 +
            human_risk * 0.05
        )
        total_risk = base_risk * slope_factor * drought_factor
        return min(1.0, max(0.0, total_risk))
