import httpx
import os
import asyncio
from typing import Optional

ELEVATION_API_URL = "https://api.open-elevation.com/api/v1/lookup"

class TopographyService:
    def __init__(self):
        self.elevation_cache = {}
        self.api_limiter = asyncio.Lock()
    async def get_elevation(self, lat: float, lon: float) -> Optional[float]:
        cache_key = (round(lat, 4), round(lon, 4))
        if cache_key in self.elevation_cache:
            return self.elevation_cache[cache_key]
        async with self.api_limiter:
            await asyncio.sleep(0.2)
            async with httpx.AsyncClient() as client:
                try:
                    r = await client.post(ELEVATION_API_URL, json={"locations": [{"latitude": lat, "longitude": lon}]})
                    r.raise_for_status()
                    data = r.json()
                    elevation = data['results'][0]['elevation']
                    self.elevation_cache[cache_key] = elevation
                    return elevation
                except Exception as e:
                    print(f"Elevation API Error ({lat},{lon}): {e}")
                    self.elevation_cache[cache_key] = None
                    return None
    async def get_slope_factor(self, polygon_bounds) -> float:
        min_lon, min_lat, max_lon, max_lat = polygon_bounds
        points = [(min_lat, min_lon), (max_lat, min_lon), (min_lat, max_lon), (max_lat, max_lon)]
        elevations = await asyncio.gather(*[self.get_elevation(lat, lon) for lat, lon in points])
        valid_elevations = [e for e in elevations if e is not None]
        if len(valid_elevations) < 2:
            return 1.0
        elevation_diff = max(valid_elevations) - min(valid_elevations)
        return 1.0 + min(0.5, (elevation_diff / 100) * 0.1)
