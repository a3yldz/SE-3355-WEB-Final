# main.py

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from shapely.geometry import shape, Point
from typing import List, Dict, Any

app = FastAPI()

# CORS ayarları aynı kalıyor
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic modelleri aynı kalıyor
class PolygonRequest(BaseModel):
    type: str
    geometry: Dict[str, Any]
    properties: Dict[str, Any]

class RiskPoint(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: Dict[str, Any]

class RiskResponse(BaseModel):
    type: str = "FeatureCollection"
    features: List[RiskPoint]

# <<<<<<<<<<<<<<<<<<<<<<<< DEĞİŞİKLİK BURADA >>>>>>>>>>>>>>>>>>>>>>>>
@app.post("/risk/nowcast_by_polygon", response_model=RiskResponse)
async def get_risk_nowcast_for_polygon(
    polygon_request: PolygonRequest,
    hourOffset: int = 0,
    provider: str = "heuristic",
    version: int = 1  # 1. DEĞİŞİKLİK: Versiyonu ayrı bir parametre olarak alıyoruz.
):
# <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    polygon = shape(polygon_request.geometry)
    min_lon, min_lat, max_lon, max_lat = polygon.bounds
    nx, ny = 36, 36
    lon_points = np.linspace(min_lon, max_lon, nx)
    lat_points = np.linspace(min_lat, max_lat, ny)
    risk_features = []

    # 2. DEĞİŞİKLİK: Yanıtta kullanmak üzere provider bilgisini birleştiriyoruz.
    provider_info = f"{provider}:{version}"

    for lon in lon_points:
        for lat in lat_points:
            point = Point(lon, lat)
            if polygon.contains(point):
                base_risk = np.random.uniform(0.1, 0.8)
                risk_value = min(base_risk + (hourOffset * 0.02), 0.99)
                
                temp_value = np.random.uniform(25.0, 40.0)
                rh_value = np.random.uniform(15, 50)
                
                risk_features.append(
                    RiskPoint(
                        geometry={"type": "Point", "coordinates": [lon, lat]},
                        properties={
                            "risk": round(risk_value, 2),
                            "temp": round(temp_value, 1),
                            "rh": round(rh_value, 0),
                            # 3. DEĞİŞİKLİK: Birleştirilmiş provider bilgisini yanıta ekliyoruz.
                            "provider": provider_info,
                        }
                    )
                )
    
    city_name = polygon_request.properties.get('name', 'Bilinmeyen Şehir')
    print(f"'{city_name}' için (+{hourOffset}h) {len(risk_features)} risk noktası üretildi. (Kaynak: {provider_info})")
    return RiskResponse(features=risk_features)