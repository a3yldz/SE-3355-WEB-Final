from dotenv import load_dotenv
load_dotenv()

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from shapely.geometry import shape, Point
from typing import List, Dict, Any, Optional
import httpx
import asyncio
import os
import math
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from contextlib import asynccontextmanager
import time

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "e7e87950d4cbef19404e95fbad64d7d3")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"
ELEVATION_API_URL = "https://api.open-elevation.com/api/v1/lookup"

ROBOFLOW_API_URL = "https://detect.roboflow.com"
ROBOFLOW_API_KEY = "XoNbKefV5xjEal7LJ744"
ROBOFLOW_MODEL_ID = "smoke-detection-5tkur/3"

def inverse_distance_weighting(target_point: tuple, data_points: list, power=2) -> float:
    numerator, denominator = 0, 0
    for lon, lat, value in data_points:
        distance = math.sqrt((target_point[0] - lon)**2 + (target_point[1] - lat)**2)
        if distance == 0: return value
        weight = 1.0 / (distance ** power); numerator += weight * value; denominator += weight
    return numerator / denominator if denominator else 0

class TopographyService:
    def __init__(self): self.elevation_cache = {}; self.api_limiter = asyncio.Lock()
    async def get_elevation(self, lat: float, lon: float) -> Optional[float]:
        cache_key = (round(lat, 4), round(lon, 4))
        if cache_key in self.elevation_cache: return self.elevation_cache[cache_key]
        async with self.api_limiter:
            await asyncio.sleep(0.2)
            async with httpx.AsyncClient() as client:
                try:
                    r = await client.post(ELEVATION_API_URL, json={"locations": [{"latitude": lat, "longitude": lon}]})
                    r.raise_for_status(); data = r.json(); elevation = data['results'][0]['elevation']
                    self.elevation_cache[cache_key] = elevation
                    return elevation
                except Exception as e:
                    print(f"Elevation API Error ({lat},{lon}): {e}"); self.elevation_cache[cache_key] = None; return None
    async def get_slope_factor(self, polygon_bounds) -> float:
        min_lon, min_lat, max_lon, max_lat = polygon_bounds
        points = [(min_lat, min_lon), (max_lat, min_lon), (min_lat, max_lon), (max_lat, max_lon)]
        elevations = await asyncio.gather(*[self.get_elevation(lat, lon) for lat, lon in points])
        valid_elevations = [e for e in elevations if e is not None]
        if len(valid_elevations) < 2: return 1.0
        elevation_diff = max(valid_elevations) - min(valid_elevations)
        return 1.0 + min(0.5, (elevation_diff / 100) * 0.1)

class DroughtService:
    def calculate_consecutive_dry_days(self, forecast_list: list) -> int:
        now_ts = datetime.utcnow().timestamp(); dry_days = 0
        sorted_forecasts = sorted([f for f in forecast_list if f['dt'] <= now_ts], key=lambda x: x['dt'], reverse=True)
        for forecast in sorted_forecasts:
            if forecast.get('rain', {}).get('3h', 0) == 0: dry_days += 1
            else: break
        return dry_days // 8
    def get_drought_factor(self, dry_days: int) -> float:
        if dry_days <= 2: return 1.0
        return min(1.4, 1.0 + ((dry_days - 2) / 5) * 0.4)

class OpenWeatherService:
    def __init__(self, api_key: str): self.api_key = api_key; self.base_url = OPENWEATHER_BASE_URL
    async def get_forecast(self, lat: float, lon: float):
        url = f"{self.base_url}/forecast"; params = {"lat": lat, "lon": lon, "appid": self.api_key, "units": "metric"}
        async with httpx.AsyncClient() as client:
            try: r = await client.get(url, params=params); r.raise_for_status(); return r.json()
            except Exception: return None
    def find_forecast_for_offset(self, forecast_data, hour_offset):
        if not forecast_data or "list" not in forecast_data: return None
        now = datetime.utcnow(); target_time = now + timedelta(hours=hour_offset)
        return min(forecast_data["list"], key=lambda x: abs(datetime.utcfromtimestamp(x['dt']) - target_time))
    def extract_weather_features(self, weather_data, lat, lon):
        main = weather_data.get("main", {}); wind = weather_data.get("wind", {}); rain = weather_data.get("rain", {})
        temp = main.get("temp", 20.0); rh = main.get("humidity", 60)
        wind_speed = wind.get("speed", 5.0); wind_dir = wind.get("deg", 0)
        precip = rain.get("3h", 0.0) / 3 if "3h" in rain else 0.0
        veg = self._get_vegetation_type(lat, lon); fuel_moisture = self._estimate_fuel_moisture(temp, rh, precip)
        human_activity = self._estimate_human_activity(lat, lon)
        return {"temperature_c": temp, "relative_humidity": rh, "wind_speed_ms": wind_speed, "wind_direction": wind_dir,
                "precip_1h_mm": precip, "vegetation_type": veg, "fuel_moisture": fuel_moisture, "human_activity": human_activity}
    def _get_vegetation_type(self, lat, lon):
        if 36.0 <= lat <= 38.0 and 26.0 <= lon <= 30.0: return "pine_forest"
        elif 38.0 <= lat <= 40.0 and 26.0 <= lon <= 30.0: return "mediterranean_forest"
        else: return "mixed_forest"
    def _estimate_fuel_moisture(self, temp, humidity, rain):
        temp = temp or 20.0; humidity = humidity or 60.0; rain = rain or 0.0
        if rain == 0.0: return min(0.4, 0.1 + (max(0, (35-temp)/35)*0.2) + ((humidity/100)*0.3))
        else: return min(1.0, 0.5 + (min(1.0, rain/10)*0.4) + ((humidity/100)*0.1))
    def _estimate_human_activity(self, lat, lon):
        if math.sqrt((lat - 41.0082)**2 + (lon - 28.9784)**2) < 0.5: return "high"
        return "low"


class AdvancedFireRiskCalculator:
    def __init__(self):
        self.vegetation_risk_factors = {"pine_forest": 0.9, "mediterranean_forest": 0.8, "mixed_forest": 0.7}
        self.human_activity_factors = {"high": 0.3, "medium": 0.2, "low": 0.1}

    def _calculate_vpd(self, temp_c: float, rh_percent: float) -> float:
        if temp_c is None or rh_percent is None: return 0.0
        svp = 6.112 * math.exp((17.67 * temp_c) / (temp_c + 243.5))
        avp = svp * (rh_percent / 100.0)
        return svp - avp

    def calculate_risk(self, features: Dict[str, Any], slope_factor: float, drought_factor: float) -> float:
        temp = features.get("temperature_c", 20.0); rh = features.get("relative_humidity", 60.0)
        wind_speed = features.get("wind_speed_ms", 0.0); fuel_moisture = features.get("fuel_moisture", 0.5)
        vegetation = features.get("vegetation_type", "mixed_forest"); human_activity = features.get("human_activity", "low")

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(timeout=10)
    yield
    await app.state.http.aclose()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
async def health():
    return {"ok": True, "ts": time.time()}

@app.post("/smoke/detect")
async def detect_smoke(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        
        detect_url = f"{ROBOFLOW_API_URL}/{ROBOFLOW_MODEL_ID}"
        params = {"api_key": ROBOFLOW_API_KEY}
        files = {"file": (file.filename or "upload.jpg", contents, file.content_type or "application/octet-stream")}
        
        client = getattr(app.state, 'http', None)
        if client:
            response = await client.post(detect_url, params=params, files=files)
        else:
            async with httpx.AsyncClient(timeout=30) as new_client:
                response = await new_client.post(detect_url, params=params, files=files)

        response.raise_for_status()
        result = response.json()
        
        max_confidence = 0.0
        detections = []
        
        if result and "predictions" in result:
            for prediction in result["predictions"]:
                if "confidence" in prediction:
                    confidence = prediction["confidence"]
                    max_confidence = max(max_confidence, confidence)
                    detections.append({
                        "confidence": confidence,
                        "class": prediction.get("class", "smoke"),
                        "bbox": prediction.get("bbox", {})
                    })
        
        risk_score = max_confidence * 100
        
        return {
            "success": True,
            "risk_score": risk_score,
            "confidence": max_confidence,
            "detections": detections,
            "detection_count": len(detections),
            "raw_result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smoke detection failed: {str(e)}")

weather_service = OpenWeatherService(api_key=OPENWEATHER_API_KEY)
risk_calculator = AdvancedFireRiskCalculator()
topography_service = TopographyService()
drought_service = DroughtService()

class PolygonRequest(BaseModel): type: str; geometry: Dict[str, Any]; properties: Dict[str, Any]
class RiskPoint(BaseModel): type: str = "Feature"; geometry: Dict[str, Any]; properties: Dict[str, Any]
class RiskResponse(BaseModel): type: str = "FeatureCollection"; features: List[RiskPoint]

@app.post("/risk/nowcast_by_polygon", response_model=RiskResponse)
async def get_risk_nowcast_for_polygon(
    polygon_request: PolygonRequest, hourOffset: int = 0,
    provider: str = "hyper_model_vpd", version: int = 7
):
    polygon = shape(polygon_request.geometry); min_lon, min_lat, max_lon, max_lat = polygon.bounds

    slope_factor_task = topography_service.get_slope_factor((min_lon, min_lat, max_lon, max_lat))
    center_lon, center_lat = polygon.centroid.x, polygon.centroid.y
    main_forecast_task = weather_service.get_forecast(center_lat, center_lon)
    slope_factor, main_forecast = await asyncio.gather(slope_factor_task, main_forecast_task)
    dry_days = drought_service.calculate_consecutive_dry_days(main_forecast['list']) if main_forecast and 'list' in main_forecast else 0
    drought_factor = drought_service.get_drought_factor(dry_days)

    strategic_points = [(min_lon, min_lat), (max_lon, min_lat), (min_lon, max_lat), (max_lon, max_lat), (center_lon, center_lat)]
    forecast_results = await asyncio.gather(*[weather_service.get_forecast(lat, lon) for lon, lat in strategic_points])
    processed_points = []
    for i, forecast in enumerate(forecast_results):
        if forecast:
            target_weather = weather_service.find_forecast_for_offset(forecast, hourOffset)
            if target_weather:
                features = weather_service.extract_weather_features(target_weather, strategic_points[i][1], strategic_points[i][0])
                processed_points.append({'lon': strategic_points[i][0], 'lat': strategic_points[i][1], 'features': features})
    if not processed_points: return RiskResponse(features=[])
    
    data_sets = {key: [(p['lon'], p['lat'], p['features'][key]) for p in processed_points]
                 for key in ["temperature_c", "relative_humidity", "wind_speed_ms", "wind_direction"]}

    nx, ny = 20, 20
    lon_points = np.linspace(min_lon, max_lon, nx); lat_points = np.linspace(min_lat, max_lat, ny)
    risk_features_to_add = []

    for p_lon in lon_points:
        for p_lat in lat_points:
            if Point(p_lon, p_lat).within(polygon):
                point_features = weather_service.extract_weather_features({}, p_lat, p_lon)
                for key, data in data_sets.items():
                    point_features[key] = inverse_distance_weighting((p_lon, p_lat), data)
                
                risk_value = risk_calculator.calculate_risk(point_features, slope_factor, drought_factor)
                
                risk_features_to_add.append(RiskPoint(
                    geometry={"type": "Point", "coordinates": [p_lon, p_lat]},
                    properties={
                        "risk": round(risk_value, 2), "temp": round(point_features['temperature_c'], 1),
                        "rh": int(point_features['relative_humidity']), "wind": round(point_features['wind_speed_ms'], 1),
                        "wind_dir": int(point_features.get('wind_direction', 0)),
                        "fuel_moisture": round(point_features.get('fuel_moisture', 0.5), 2),
                        "vegetation": point_features.get('vegetation_type', 'unknown'),
                        "slope_factor": round(slope_factor, 2), "drought_factor": round(drought_factor, 2),
                        "dry_days": dry_days, "provider": f"{provider}:v{version}"
                    }
                ))

    print(f"Risk calculated for '{polygon_request.properties.get('name')}' (VPD Model). Drought Factor: {drought_factor:.2f}, Slope Factor: {slope_factor:.2f}")
    return RiskResponse(features=risk_features_to_add)