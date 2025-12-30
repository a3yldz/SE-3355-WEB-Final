import { point, booleanPointInPolygon } from "@turf/turf";
import trDistricts from "../data/tr_districts.json";

type FeatureProps = { city?: string; district?: string; region?: string };
type DistrictFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  FeatureProps
>;

const FEATURES = (trDistricts as any).features as DistrictFeature[];

export type DistrictLookup = {
  city?: string;
  district?: string;
  region?: string;
  label: string;
};

export function lookupDistrict(lon?: number, lat?: number): DistrictLookup | null {
  if (typeof lon !== "number" || typeof lat !== "number") return null;

  const pt = point([lon, lat]);

  for (const f of FEATURES) {
    if (!f?.geometry) continue;
    // @ts-ignore
    if (booleanPointInPolygon(pt, f)) {
      const { city, district, region } = f.properties ?? {};
      const label =
        [city, district].filter(Boolean).join(" / ") || "Unknown District";
      return { city, district, region, label };
    }
  }
  return null;
}
