// app/hooks/useRiskAlerts.ts
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { BASE_URL } from "../utils/config";
import { lookupDistrict } from "../utils/district";

export type Area = {
  id: string;
  name: string;
  bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number };
};

async function fetchNowcast(qs: string) {
  const r = await fetch(`${BASE_URL}/risk/nowcast?${qs}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export function useRiskAlerts(
  areas: Area[],
  hourOffset: number,
  provider: "heuristic" | "ai",
  threshold = 0.75,
  nx = 28,
  ny = 28
) {
  const queries = useQueries({
    queries: areas.map((a) => {
      const qs = new URLSearchParams({
        minLon: String(a.bbox.minLon),
        minLat: String(a.bbox.minLat),
        maxLon: String(a.bbox.maxLon),
        maxLat: String(a.bbox.maxLat),
        nx: String(nx),
        ny: String(ny),
        hourOffset: String(hourOffset),
        provider,
      }).toString();

      return {
        queryKey: ["risk-nowcast", a.id, hourOffset, provider, nx, ny],
        queryFn: () => fetchNowcast(qs),
        staleTime: 60_000,
      };
    }),
  });

  const anyLoading = queries.some((q) => q.isLoading);
  const anyError = queries.some((q) => q.isError);

  const { urgent, perCity } = useMemo(() => {
    const urgent: any[] = [];
    const perCity: Record<string, any[]> = {};

    const num = (v: any) => (typeof v === "string" ? Number(v) : v);

    areas.forEach((a, idx) => {
      const data: any = queries[idx]?.data;
      if (!data) return;

      // Tüm hücreler (eşiksiz) + ilçe/bölge enrich
      const all = (data.features || []).map((f: any) => {
        const coord = f.geometry?.coordinates as [number, number] | undefined;
        const lon = coord?.[0];
        const lat = coord?.[1];
        const d = lookupDistrict(lon, lat); // ← ilçe/bölge eşle

        return {
          ...f.properties,
          risk: num(f.properties?.risk),
          temp: num(f.properties?.temp),
          rh: num(f.properties?.rh),
          wind: num(f.properties?.wind),
          wind_dir: num(f.properties?.wind_dir),
          coord,
          aoiId: a.id,
          aoiName: a.name,
          // ✅ yeni alanlar:
          districtName: d?.label,     // "Istanbul / Kadıköy" gibi
          districtOnly: d?.district,  // "Kadıköy"
          cityName: d?.city,          // "Istanbul"
          region: d?.region,          // "Kuzey/Güney" vs (varsa)
        };
      });

      // Top-10 = eşiksiz, sadece en yüksek 10
      const sortedAll = all.slice().sort((x: any, y: any) => y.risk - x.risk);
      perCity[a.id] = sortedAll.slice(0, 10);

      // Acil = eşik üstü
      const hot = all.filter(
        (p: any) => typeof p.risk === "number" && p.risk >= threshold
      );
      urgent.push(...hot);
    });

    urgent.sort((a, b) => b.risk - a.risk);
    return { urgent, perCity };
  }, [queries, areas, threshold]);

  return { urgent, perCity, anyLoading, anyError };
}
