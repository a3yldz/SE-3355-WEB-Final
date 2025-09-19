from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx, time, asyncio
from typing import Dict, Tuple, Optional
from contextlib import asynccontextmanager

# ----------------- Cache & bucket -----------------
# (latBucket, lonBucket, hourOffset) -> (temp, rh, wind, wind_dir, ts)
_CACHE: Dict[Tuple[float, float, int], Tuple[float, float, float, float, float]] = {}
BUCKET = 0.25       # ~25-30 km
TTL_SEC = 300       # 5 dk
MAX_RETRIES = 3
RETRY_BASE_MS = 250

def bucketize(v: float, step: float) -> float:
    return round(round(v / step) * step, 3)

# ----------------- App & HTTP client -----------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # http2 şart değil; basit tutuyoruz
    app.state.http = httpx.AsyncClient(timeout=10)
    yield
    await app.state.http.aclose()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True, "ts": time.time()}

# ----------------- Upstream fetch -----------------
async def fetch_meteo(lat_b: float, lon_b: float, hour_offset: int) -> Tuple[float, float, float, float]:
    """lat_b/lon_b zaten bucket'lanmış değerler."""
    key = (lat_b, lon_b, hour_offset)
    now = time.time()

    # fresh cache
    hit = _CACHE.get(key)
    if hit and now - hit[4] < TTL_SEC:
        # cache: (temp, rh, wind, wind_dir, ts)
        return hit[0], hit[1], hit[2], hit[3]

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat_b}&longitude={lon_b}"
        "&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m"
        "&wind_speed_unit=ms"
        "&forecast_days=2"           # +24h için güvenli marj
        "&timezone=auto"
    )

    # retry with exponential backoff
    last_err: Optional[Exception] = None
    for i in range(MAX_RETRIES):
        try:
            r = await app.state.http.get(url)
            r.raise_for_status()
            js = r.json()
            temp_arr = js["hourly"]["temperature_2m"]
            rh_arr   = js["hourly"]["relative_humidity_2m"]
            wind_arr = js["hourly"]["wind_speed_10m"]
            dir_arr  = js["hourly"]["wind_direction_10m"]
            idx = max(0, min(hour_offset, len(temp_arr) - 1))
            temp = float(temp_arr[idx])
            rh   = float(rh_arr[idx])
            wind = float(wind_arr[idx])
            wind_dir = float(dir_arr[idx])
            _CACHE[key] = (temp, rh, wind, wind_dir, now)
            return temp, rh, wind, wind_dir
        except Exception as e:
            last_err = e
            await asyncio.sleep((RETRY_BASE_MS * (2 ** i)) / 1000)

    # retry'lar bitti -> stale cache varsa onu kullan
    if hit:
        return hit[0], hit[1], hit[2], hit[3]

    # hiç yoksa hatayı yükselt
    raise HTTPException(status_code=502, detail=f"upstream fetch failed: {type(last_err).__name__}")

def heuristic_risk(temp: float, rh: float, wind: float) -> float:
    # sıcaklık ↑, nem ↓, rüzgâr ↑ → risk ↑
    t = max(0.0, min(1.0, (temp - 10.0) / 25.0))  # 10–35°C → 0–1
    h = max(0.0, min(1.0, 1.0 - rh / 100.0))      # düşük nem = risk
    w = max(0.0, min(1.0, wind / 12.0))           # 0–12 m/s → 0–1
    return max(0.0, min(1.0, 0.5 * t + 0.3 * h + 0.2 * w))

def linspace(a: float, b: float, n: int):
    if n <= 1: return [a]
    step = (b - a) / (n - 1)
    return [a + i * step for i in range(n)]

# ----------------- API -----------------
@app.get("/risk/nowcast")
async def risk_nowcast(
    minLon: float, minLat: float, maxLon: float, maxLat: float,
    nx: int = 36, ny: int = 36, hourOffset: int = 0
):
    lons = linspace(minLon, maxLon, nx)
    lats = linspace(minLat, maxLat, ny)

    # 1) Unique bucket'lar (dış API yükünü düşür)
    buckets = set(
        (bucketize(lat, BUCKET), bucketize(lon, BUCKET))
        for lon in lons for lat in lats
    )

    # 2) Her bucket için meteo verisi
    results: Dict[Tuple[float, float], Tuple[float, float, float, float]] = {}
    for (lat_b, lon_b) in buckets:
        try:
            t, h, w, d = await fetch_meteo(lat_b, lon_b, hourOffset)
            results[(lat_b, lon_b)] = (t, h, w, d)
        except HTTPException:
            # bu bucket için veri alamadık; atla (grid'de birkaç boşluk olabilir)
            continue

    # 3) Feature grid oluştur
    features = []
    for lon in lons:
        for lat in lats:
            key2 = (bucketize(lat, BUCKET), bucketize(lon, BUCKET))
            meteo = results.get(key2)
            if not meteo:
                continue
            temp, rh, wind, wind_dir = meteo
            risk = heuristic_risk(temp, rh, wind)
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "risk": risk,
                    "temp": temp,
                    "rh": rh,
                    "wind": wind,
                    "wind_dir": wind_dir,
                }
            })

    return {"type": "FeatureCollection", "features": features}
