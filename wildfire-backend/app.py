from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx, time, asyncio, os, json
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

# ----------------- Meteo fetch -----------------
async def fetch_meteo(lat_b: float, lon_b: float, hour_offset: int):
    key = (lat_b, lon_b, hour_offset)
    now = time.time()

    hit = _CACHE.get(key)
    if hit and now - hit[4] < TTL_SEC:
        return hit[0], hit[1], hit[2], hit[3]

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat_b}&longitude={lon_b}"
        "&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m"
        "&wind_speed_unit=ms"
        "&forecast_days=2&timezone=auto"
    )
    last_err: Optional[Exception] = None
    for i in range(MAX_RETRIES):
        try:
            r = await app.state.http.get(url)
            r.raise_for_status()
            js = r.json()
            tarr = js["hourly"]["temperature_2m"]
            harr = js["hourly"]["relative_humidity_2m"]
            warr = js["hourly"]["wind_speed_10m"]
            darr = js["hourly"]["wind_direction_10m"]
            idx = max(0, min(hour_offset, len(tarr) - 1))
            temp = float(tarr[idx]); rh = float(harr[idx]); wind = float(warr[idx]); wdir = float(darr[idx])
            _CACHE[key] = (temp, rh, wind, wdir, now)
            return temp, rh, wind, wdir
        except Exception as e:
            last_err = e
            await asyncio.sleep((RETRY_BASE_MS * (2 ** i)) / 1000)

    if hit:  # stale fallback
        return hit[0], hit[1], hit[2], hit[3]
    raise HTTPException(status_code=502, detail=f"upstream fetch failed: {type(last_err).__name__}")

# ----------------- Risk providers -----------------
def heuristic_risk(temp: float, rh: float, wind: float) -> float:
    t = max(0.0, min(1.0, (temp - 10.0) / 25.0))   # 10–35°C
    h = max(0.0, min(1.0, 1.0 - rh / 100.0))       # düşük nem ↑ risk
    w = max(0.0, min(1.0, wind / 12.0))            # 0–12 m/s
    return max(0.0, min(1.0, 0.5*t + 0.3*h + 0.2*w))

class HeuristicProvider:
    name = "heuristic"
    async def score(self, *, temp: float, rh: float, wind: float, **_):
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
    meteo: Dict[Tuple[float, float], Tuple[float, float, float, float]] = {}
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
            temp, rh, wind, wdir = m
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
