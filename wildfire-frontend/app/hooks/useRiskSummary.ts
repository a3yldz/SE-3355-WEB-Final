import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "../utils/config";
import type { BBox } from "./useRiskNowcast";

export function useRiskSummary(bbox: BBox, hourOffset = 0, provider: "heuristic" | "ai" = "heuristic", city?: string) {
  const qs = new URLSearchParams({
    minLon: String(bbox.minLon), minLat: String(bbox.minLat),
    maxLon: String(bbox.maxLon), maxLat: String(bbox.maxLat),
    hourOffset: String(hourOffset),
    provider,
    ...(city ? { city } : {}),
  }).toString();
  return useQuery({
    queryKey: ["risk-summary", qs],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/risk/summary?${qs}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 60_000,
  });
}
