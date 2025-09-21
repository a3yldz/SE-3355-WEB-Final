from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import httpx, time, asyncio, os, json, base64
from typing import Dict, Tuple, Optional, List
from contextlib import asynccontextmanager
from math import cos, sin, atan2, pi

# ----------------- Cache & bucket -----------------
# (latBucket, lonBucket, hourOffset) -> (temp, rh, wind, wind_dir, ts)
_CACHE: Dict[Tuple[float, float, int], Tuple[float, float, float, float, float]] = {}
BUCKET = 0.25        # ~25-30 km
TTL_SEC = 300        # 5 dk cache
MAX_RETRIES = 3
RETRY_BASE_MS = 250

def bucketize(v: float, step: float) -> float:
    return round(round(v / step) * step, 3)

# ----------------- Roboflow API Configuration -----------------
ROBOFLOW_API_URL = "https://detect.roboflow.com"
ROBOFLOW_API_KEY = "XoNbKefV5xjEal7LJ744"
ROBOFLOW_MODEL_ID = "smoke-detection-5tkur/3"

# ----------------- App & HTTP client -----------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(timeout=10)
    # district polygons opsiyonel: data/tr_districts.geojson varsa yükler
    app.state.districts = load_districts("data/tr_districts.geojson")
    yield
    await app.state.http.aclose()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True, "ts": time.time()}

# ----------------- Smoke Detection API -----------------
@app.post("/smoke/detect")
async def detect_smoke(file: UploadFile = File(...)):
    """Roboflow API ile duman tespiti yap"""
    try:
        # Dosyayı oku
        contents = await file.read()
        
        # Roboflow Detect API: https://detect.roboflow.com/{model}/{version}?api_key=KEY
        detect_url = f"{ROBOFLOW_API_URL}/{ROBOFLOW_MODEL_ID}"
        params = {"api_key": ROBOFLOW_API_KEY}
        files = {"file": (file.filename or "upload.jpg", contents, file.content_type or "application/octet-stream")}
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(detect_url, params=params, files=files)
            response.raise_for_status()
            result = response.json()
        
        # En yüksek confidence değerini bul
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
        
        # Risk puanı = confidence * 100
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

# ----------------- OpenWeather API Integration -----------------
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "e7e87950d4cbef19404e95fbad64d7d3")

async def fetch_meteo(lat_b: float, lon_b: float, hour_offset: int):
    """OpenWeather API ile gelişmiş hava durumu verisi çek"""
    key = (lat_b, lon_b, hour_offset)
    now = time.time()

    hit = _CACHE.get(key)
    if hit and now - hit[4] < TTL_SEC:
        if len(hit) > 5:  # Yeni format (ek bilgilerle)
            return hit[0], hit[1], hit[2], hit[3], hit[5], hit[6], hit[7], hit[8], hit[9], hit[10], hit[11], hit[12], hit[13]
        else:  # Eski format
            return hit[0], hit[1], hit[2], hit[3], 1013.25, 10.0, 0, 0, 0, 0, hit[0], hit[0]-5, "Bilinmeyen"

    # OpenWeather API kullan
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat_b,
        "lon": lon_b,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric",
        "lang": "tr"
    }
    
    last_err: Optional[Exception] = None
    for i in range(MAX_RETRIES):
        try:
            r = await app.state.http.get(url, params=params)
            r.raise_for_status()
            js = r.json()
            
            # OpenWeather API'den veri çıkar
            temp = float(js["main"]["temp"])
            rh = float(js["main"]["humidity"])
            wind = float(js["wind"]["speed"])
            wdir = float(js["wind"].get("deg", 0))
            
            # Ek hava durumu bilgileri
            pressure = float(js["main"].get("pressure", 1013.25))
            visibility = float(js.get("visibility", 10000)) / 1000  # km cinsinden
            cloud_cover = float(js["clouds"].get("all", 0))
            rain_1h = float(js.get("rain", {}).get("1h", 0))
            snow_1h = float(js.get("snow", {}).get("1h", 0))
            uv_index = float(js.get("uvi", 0))
            feels_like = float(js["main"].get("feels_like", temp))
            dew_point = float(js["main"].get("dew_point", temp - 5))
            
            # Hava durumu açıklaması
            weather_desc = js["weather"][0]["description"] if js.get("weather") else "Bilinmeyen"
            
            # Saat kaydırma için basit tahmin (gerçek uygulamada forecast API kullanılabilir)
            if hour_offset > 0:
                temp += hour_offset * 0.5  # Saat başına 0.5°C artış
                rh -= hour_offset * 2      # Saat başına %2 nem azalış
                wind += hour_offset * 0.1  # Saat başına 0.1 m/s rüzgar artışı
            
            # Cache'e ek bilgileri de ekle
            _CACHE[key] = (temp, rh, wind, wdir, now, pressure, visibility, cloud_cover, rain_1h, snow_1h, uv_index, feels_like, dew_point, weather_desc)
            return temp, rh, wind, wdir, pressure, visibility, cloud_cover, rain_1h, snow_1h, uv_index, feels_like, dew_point, weather_desc
            
        except Exception as e:
            last_err = e
            await asyncio.sleep((RETRY_BASE_MS * (2 ** i)) / 1000)

    if hit:  # stale fallback
        if len(hit) > 5:  # Yeni format
            return hit[0], hit[1], hit[2], hit[3], hit[5], hit[6], hit[7], hit[8], hit[9], hit[10], hit[11], hit[12], hit[13]
        else:  # Eski format
            return hit[0], hit[1], hit[2], hit[3], 1013.25, 10.0, 0, 0, 0, 0, hit[0], hit[0]-5, "Bilinmeyen"
    raise HTTPException(status_code=502, detail=f"OpenWeather API failed: {type(last_err).__name__}")

# ----------------- Risk providers -----------------
def heuristic_risk(temp: float, rh: float, wind: float) -> float:
    """Basit heuristik risk hesaplama"""
    t = max(0.0, min(1.0, (temp - 10.0) / 25.0))   # 10–35°C
    h = max(0.0, min(1.0, 1.0 - rh / 100.0))       # düşük nem ↑ risk
    w = max(0.0, min(1.0, wind / 12.0))            # 0–12 m/s
    return max(0.0, min(1.0, 0.5*t + 0.3*h + 0.2*w))

def advanced_risk(temp: float, rh: float, wind: float, wind_dir: float, lat: float, lon: float) -> float:
    """Gelişmiş risk hesaplama - OpenWeather verileri ile"""
    
    # 1. Sıcaklık faktörü (30°C üzeri kritik)
    temp_risk = max(0, (temp - 20) / 20)  # 20-40°C arası
    
    # 2. Nem faktörü (düşük nem = yüksek risk)
    humidity_risk = max(0, (100 - rh) / 100)
    
    # 3. Rüzgar faktörü (güçlü rüzgar = yüksek risk)
    wind_risk = min(1, wind / 15)  # 15 m/s üzeri kritik
    
    # 4. Rüzgar yönü faktörü (güney rüzgarı riskli)
    wind_dir_risk = 1.0
    if 150 <= wind_dir <= 210:  # Güney
        wind_dir_risk = 1.3
    elif 60 <= wind_dir <= 120:  # Doğu
        wind_dir_risk = 1.1
    
    # 5. Coğrafi faktör (Türkiye bölgeleri)
    geo_risk = 1.0
    if 40.0 <= lat <= 42.0 and 27.0 <= lon <= 30.0:  # Marmara
        geo_risk = 1.1
    elif 38.0 <= lat <= 40.0 and 26.0 <= lon <= 30.0:  # Ege
        geo_risk = 1.2  # Akdeniz iklimi - yüksek risk
    elif 36.0 <= lat <= 38.0 and 26.0 <= lon <= 30.0:  # Akdeniz
        geo_risk = 1.3  # En yüksek risk
    elif 39.0 <= lat <= 42.0 and 30.0 <= lon <= 35.0:  # İç Anadolu
        geo_risk = 0.9  # Daha düşük risk
    
    # 6. Saat faktörü (öğleden sonra riskli)
    current_hour = time.localtime().tm_hour
    time_risk = 1.0
    if 12 <= current_hour <= 18:  # Öğleden sonra
        time_risk = 1.2
    elif 6 <= current_hour <= 12:  # Sabah
        time_risk = 0.8
    
    # Toplam risk hesaplama
    base_risk = (
        temp_risk * 0.3 +
        humidity_risk * 0.25 +
        wind_risk * 0.2 +
        wind_dir_risk * 0.15 +
        geo_risk * 0.1
    )
    
    total_risk = base_risk * time_risk
    
    return min(1.0, max(0.0, total_risk))

class HeuristicProvider:
    name = "heuristic"
    async def score(self, *, temp: float, rh: float, wind: float, wind_dir: float = 0, lat: float = 0, lon: float = 0, **_):
        # OpenWeather verileri varsa gelişmiş hesaplama kullan
        if lat != 0 and lon != 0:
            return advanced_risk(temp, rh, wind, wind_dir, lat, lon)
        else:
            return heuristic_risk(temp, rh, wind)

class AIRemoteProvider:
    """Dış bir AI servisine POST eder. Ortam değişkenleri:
       AI_RISK_URL (zorunlu), AI_RISK_API_KEY (opsiyonel)"""
    name = "ai"
    def __init__(self, client: httpx.AsyncClient):
        self.client = client
        self.base = os.getenv("AI_RISK_URL")  # örn: http://localhost:9000
        self.key  = os.getenv("AI_RISK_API_KEY")

    async def score(self, *, lat: float, lon: float, hour_offset: int,
                    temp: float, rh: float, wind: float, wind_dir: float, **_):
        if not self.base:
            # AI URL yoksa heuristik fallback
            return heuristic_risk(temp, rh, wind)
        headers = {"Authorization": f"Bearer {self.key}"} if self.key else {}
        payload = {
            "lat": lat, "lon": lon, "hour_offset": hour_offset,
            "features": {"temp": temp, "rh": rh, "wind": wind, "wind_dir": wind_dir}
        }
        r = await self.client.post(f"{self.base}/score", json=payload, headers=headers)
        r.raise_for_status()
        js = r.json()
        return float(js.get("risk", 0.0))

def get_provider(name: str) -> object:
    name = (name or os.getenv("RISK_PROVIDER", "heuristic")).lower()
    if name == "ai":
        return AIRemoteProvider(app.state.http)
    return HeuristicProvider()

# ----------------- Utils -----------------
def linspace(a: float, b: float, n: int):
    if n <= 1: return [a]
    step = (b - a) / (n - 1)
    return [a + i*step for i in range(n)]

def load_districts(path: str):
    """İsteğe bağlı: data/tr_districts.geojson okunursa (Polygon/MultiPolygon, props: city, district)"""
    if not os.path.exists(path): return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            gj = json.load(f)
        # hafiflet: sadece lazım olan alanları tut
        feats = []
        for ft in gj.get("features", []):
            props = ft.get("properties", {})
            city = props.get("city") or props.get("il") or props.get("CITY")
            dist = props.get("district") or props.get("ilce") or props.get("DISTRICT")
            geom = ft.get("geometry", {})
            if city and dist and geom:
                feats.append({"city": str(city), "district": str(dist), "geometry": geom})
        return feats
    except Exception:
        return None

def point_in_polygon(pt, polygon) -> bool:
    """Ray casting — polygon: [ [x,y], ... ] kapalı halka, MultiPolygons da desteklenir."""
    x, y = pt
    def ring_contains(ring):
        inside = False
        for i in range(len(ring)):
            x1, y1 = ring[i]
            x2, y2 = ring[(i+1) % len(ring)]
            if ((y1 > y) != (y2 > y)) and (x < (x2 - x1)*(y - y1) / (y2 - y1 + 1e-12) + x1):
                inside = not inside
        return inside
    gtype = polygon.get("type")
    if gtype == "Polygon":
        coords = polygon["coordinates"]
        return ring_contains(coords[0]) and all(not ring_contains(h) for h in coords[1:])
    if gtype == "MultiPolygon":
        for poly in polygon["coordinates"]:
            if ring_contains(poly[0]) and all(not ring_contains(h) for h in poly[1:]):
                return True
        return False
    return False

# ----------------- APIs -----------------
@app.get("/risk/nowcast")
async def risk_nowcast(
    minLon: float, minLat: float, maxLon: float, maxLat: float,
    nx: int = 36, ny: int = 36, hourOffset: int = 0,
    provider: str = Query(default="heuristic", description="heuristic | ai"),
):
    prov = get_provider(provider)

    lons = linspace(minLon, maxLon, nx)
    lats = linspace(minLat, maxLat, ny)

    # unique buckets -> upstream çağrılarını minimize et
    buckets = set((bucketize(lat, BUCKET), bucketize(lon, BUCKET)) for lon in lons for lat in lats)

    # her bucket için meteo
    meteo: Dict[Tuple[float, float], Tuple] = {}
    for (lat_b, lon_b) in buckets:
        try:
            meteo[(lat_b, lon_b)] = await fetch_meteo(lat_b, lon_b, hourOffset)
        except HTTPException:
            continue

    # grid -> features + risk(provider)
    features = []
    for lon in lons:
        for lat in lats:
            key2 = (bucketize(lat, BUCKET), bucketize(lon, BUCKET))
            m = meteo.get(key2)
            if not m: continue
            
            # Temel veriler
            temp, rh, wind, wdir = m[0], m[1], m[2], m[3]
            
            # Ek hava durumu bilgileri (varsa)
            pressure = m[4] if len(m) > 4 else 1013.25
            visibility = m[5] if len(m) > 5 else 10.0
            cloud_cover = m[6] if len(m) > 6 else 0
            rain_1h = m[7] if len(m) > 7 else 0
            snow_1h = m[8] if len(m) > 8 else 0
            uv_index = m[9] if len(m) > 9 else 0
            feels_like = m[10] if len(m) > 10 else temp
            dew_point = m[11] if len(m) > 11 else temp - 5
            weather_desc = m[12] if len(m) > 12 else "Bilinmeyen"
            
            # Debug: Ek bilgileri kontrol et
            print(f"Debug - lat:{lat}, lon:{lon}, pressure:{pressure}, visibility:{visibility}, cloud_cover:{cloud_cover}")
            
            risk = await prov.score(
                lat=lat, lon=lon, hour_offset=hourOffset,
                temp=temp, rh=rh, wind=wind, wind_dir=wdir
            )
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "risk": float(max(0.0, min(1.0, risk))),
                    "temp": temp, "rh": rh, "wind": wind, "wind_dir": wdir,
                    "pressure": pressure, "visibility": visibility, "cloud_cover": cloud_cover,
                    "rain_1h": rain_1h, "snow_1h": snow_1h, "uv_index": uv_index,
                    "feels_like": feels_like, "dew_point": dew_point, "weather_desc": weather_desc,
                    "risk_source": getattr(prov, "name", "custom"),
                }
            })

    return {"type": "FeatureCollection", "features": features}

@app.get("/risk/summary")
async def risk_summary(
    minLon: float, minLat: float, maxLon: float, maxLat: float,
    nx: int = 28, ny: int = 28, hourOffset: int = 0,
    provider: str = "heuristic",
    city: Optional[str] = Query(default=None, description="Örn: Izmir, Istanbul, Ankara"),
):
    """Kuzey/Güney/Doğu/Batı özetleri + (varsa) ilçe bazlı ortalama."""
    fc = await risk_nowcast(minLon, minLat, maxLon, maxLat, nx, ny, hourOffset, provider)  # type: ignore
    feats = fc["features"]

    # 1) N/E/S/W (bbox merkezine göre)
    cx = (minLon + maxLon) / 2.0
    cy = (minLat + maxLat) / 2.0
    zones = {"Kuzey": [], "Guney": [], "Dogu": [], "Bati": []}
    for f in feats:
        lon, lat = f["geometry"]["coordinates"]
        risk = f["properties"]["risk"]
        if lat >= cy: zones["Kuzey"].append(risk)
        else:         zones["Guney"].append(risk)
        if lon >= cx: zones["Dogu"].append(risk)
        else:         zones["Bati"].append(risk)

    zone_stats = [
        {"zone": z, "meanRisk": (sum(vals)/len(vals) if vals else None), "n": len(vals)}
        for z, vals in zones.items()
    ]

    # 2) İlçe bazlı (opsiyonel veri dosyası varsa)
    district_stats: List[dict] = []
    if app.state.districts and city:
        city_norm = city.strip().lower()
        pts = [(f["geometry"]["coordinates"], f["properties"]["risk"]) for f in feats]
        for ft in app.state.districts:
            if ft["city"].strip().lower() != city_norm: continue
            total = 0.0; n = 0
            for (lon, lat), r in pts:
                if point_in_polygon((lon, lat), ft["geometry"]):
                    total += r; n += 1
            if n > 0:
                district_stats.append({
                    "city": ft["city"], "district": ft["district"],
                    "meanRisk": total/n, "n": n
                })
        # yüksekten düşüğe sırala, top-10 dön
        district_stats.sort(key=lambda x: x["meanRisk"], reverse=True)
        district_stats = district_stats[:10]

    return {
        "zones": zone_stats,
        "districts": district_stats,  # boş liste olabilir
        "count": len(feats),
        "provider": provider,
    }
