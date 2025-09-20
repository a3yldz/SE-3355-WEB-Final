// app/hooks/useRiskNowcasts.ts
import { useQueries } from "@tanstack/react-query";
import { BASE_URL } from "../utils/config";
import { useQuery } from "@tanstack/react-query";

export type BBox = { minLon:number; minLat:number; maxLon:number; maxLat:number };
export type Area = { id: string; name: string; bbox: BBox };

// app/hooks/useRiskNowcast.ts
export function useRiskNowcast(bbox: BBox, hourOffset = 3, nx = 36, ny = 36, provider: "heuristic" | "ai" = "heuristic") {
  const qs = new URLSearchParams({
    minLon: String(bbox.minLon), minLat: String(bbox.minLat),
    maxLon: String(bbox.maxLon), maxLat: String(bbox.maxLat),
    nx: String(nx), ny: String(ny),
    hourOffset: String(hourOffset),
    provider,                       // 👈 yeni
  }).toString();
  return useQuery({
    queryKey: ["risk-nowcast", qs],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/risk/nowcast?${qs}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 60_000,
  });
}

export function useRiskNowcasts(
  areas: Area[],
  hourOffset = 3,
  nx = 36,
  ny = 36,
  provider = "heuristic"
) {
  return useQueries({
    queries: areas.map((a) => {
      const qs = new URLSearchParams({
        minLon: String(a.bbox.minLon),
        minLat: String(a.bbox.minLat),
        maxLon: String(a.bbox.maxLon),
        maxLat: String(a.bbox.maxLat),
        nx: String(nx),
        ny: String(ny),
        hourOffset: String(hourOffset),
        provider: provider,
      }).toString();

      return {
        queryKey: ["risk-nowcast", a.id, qs],
        queryFn: async () => {
          const r = await fetch(`${BASE_URL}/risk/nowcast?${qs}`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json(); // GeoJSON FeatureCollection<Point>
        },
        staleTime: 60_000,
      };
    }),
  });
}
