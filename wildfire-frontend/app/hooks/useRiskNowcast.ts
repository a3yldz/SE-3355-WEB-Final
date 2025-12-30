import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "../utils/config";

export type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number };
export type Area = { id: string; name: string; bbox: BBox };

export function useRiskNowcastsByPolygon(
  cityPolygons: any[],
  hourOffset = 0,
  provider = "heuristic",
  version = 1
) {
  return useQuery({
    queryKey: ["risk-nowcast-by-polygon", cityPolygons.map(p => p.properties.name), hourOffset, provider, version],

    queryFn: async () => {
      console.log(`Fetching risk data for ${cityPolygons.length} polygons...`);

      const promises = cityPolygons.map(async (polygon) => {
        const url = `${BASE_URL}/risk/nowcast_by_polygon?hourOffset=${hourOffset}&provider=${provider}&version=${version}`;

        console.log(`Sending request: POST ${url}`);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(polygon),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${polygon.properties.name}`);
        }
        const data = await response.json();

        data.features.forEach((feature: any) => {
          feature.properties.aoiName = polygon.properties.name;
          feature.properties.aoiId = polygon.properties.name.toLowerCase().replace('I', 'i');
        });

        return data.features;
      });

      const allFeatures = (await Promise.all(promises)).flat();

      console.log(`Total ${allFeatures.length} risk points received.`);
      return { type: "FeatureCollection", features: allFeatures };
    },

    enabled: cityPolygons.length > 0,
    staleTime: 60_000,
  });
}