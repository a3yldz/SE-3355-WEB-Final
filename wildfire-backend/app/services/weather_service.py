import httpx
import math
from datetime import datetime, timedelta
import os

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "e7e87950d4cbef19404e95fbad64d7d3")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"

class OpenWeatherService:
    def __init__(self, api_key: str = OPENWEATHER_API_KEY):
        self.api_key = api_key
        self.base_url = OPENWEATHER_BASE_URL
    async def get_forecast(self, lat: float, lon: float):
        url = f"{self.base_url}/forecast"
        params = {"lat": lat, "lon": lon, "appid": self.api_key, "units": "metric"}
        async with httpx.AsyncClient() as client:
            try:
                r = await client.get(url, params=params)
                r.raise_for_status()
                return r.json()
            except Exception:
                return None
    def find_forecast_for_offset(self, forecast_data, hour_offset):
        if not forecast_data or "list" not in forecast_data:
            return None
        now = datetime.utcnow()
        target_time = now + timedelta(hours=hour_offset)
        return min(forecast_data["list"], key=lambda x: abs(datetime.utcfromtimestamp(x['dt']) - target_time))
    def extract_weather_features(self, weather_data, lat, lon):
        main = weather_data.get("main", {})
        wind = weather_data.get("wind", {})
        rain = weather_data.get("rain", {})
        temp = main.get("temp", 20.0)
        rh = main.get("humidity", 60)
        wind_speed = wind.get("speed", 5.0)
        wind_dir = wind.get("deg", 0)
        precip = rain.get("3h", 0.0) / 3 if "3h" in rain else 0.0
        veg = self._get_vegetation_type(lat, lon)
        fuel_moisture = self._estimate_fuel_moisture(temp, rh, precip)
        human_activity = self._estimate_human_activity(lat, lon)
        return {"temperature_c": temp, "relative_humidity": rh, "wind_speed_ms": wind_speed, "wind_direction": wind_dir,
                "precip_1h_mm": precip, "vegetation_type": veg, "fuel_moisture": fuel_moisture, "human_activity": human_activity}
    def _get_vegetation_type(self, lat, lon):
        if 36.0 <= lat <= 38.0 and 26.0 <= lon <= 30.0:
            return "pine_forest"
        elif 38.0 <= lat <= 40.0 and 26.0 <= lon <= 30.0:
            return "mediterranean_forest"
        else:
            return "mixed_forest"
    def _estimate_fuel_moisture(self, temp, humidity, rain):
        temp = temp or 20.0
        humidity = humidity or 60.0
        rain = rain or 0.0
        if rain == 0.0:
            return min(0.4, 0.1 + (max(0, (35-temp)/35)*0.2) + ((humidity/100)*0.3))
        else:
            return min(1.0, 0.5 + (min(1.0, rain/10)*0.4) + ((humidity/100)*0.1))
    def _estimate_human_activity(self, lat, lon):
        if math.sqrt((lat - 41.0082)**2 + (lon - 28.9784)**2) < 0.5:
            return "high"
        return "low"
