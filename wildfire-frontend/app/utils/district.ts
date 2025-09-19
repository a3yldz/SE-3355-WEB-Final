// app/utils/district.ts
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

/** (lon, lat) -> "Istanbul / Kadıköy" (+ region) */
export function lookupDistrict(lon?: number, lat?: number): DistrictLookup | null {
  if (typeof lon !== "number" || typeof lat !== "number") return null;

  const pt = point([lon, lat]);

  for (const f of FEATURES) {
    if (!f?.geometry) continue;
    // turf tipleri/GeoJSON tipleri küçük uyumsuz olabiliyor, runtime güvenli:
    // @ts-ignore
    if (booleanPointInPolygon(pt, f)) {
      const { city, district, region } = f.properties ?? {};
      const label =
        [city, district].filter(Boolean).join(" / ") || "Bilinmeyen İlçe";
      return { city, district, region, label };
    }
  }
  return null;
}
