import { useMemo } from "react";

/**
* Demo amaçlı grid üretir (FeatureCollection<Point>)
* İstanbul çevresinde 50x50 hücre, risk= [0,1], property "risk" ve WebMap tarafında "color" eklenir.
*/
export function useMockRiskGrid({ hourOffset = 0 }: { hourOffset?: number }) {
const data = useMemo(() => {
const features: any[] = [];
const minLon = 28.3, maxLon = 29.7;
const minLat = 40.7, maxLat = 41.5;
const nx = 50, ny = 50;

for (let i = 0; i < nx; i++) {
for (let j = 0; j < ny; j++) {
const u = i / (nx - 1);
const v = j / (ny - 1);
const lon = minLon + u * (maxLon - minLon);
const lat = minLat + v * (maxLat - minLat);
// basit dalgalı bir risk alanı; saate göre hafif kaydır
const base = Math.max(0, Math.sin((u * 6.28) + hourOffset * 0.3) * 0.5 + Math.cos((v * 6.28) - hourOffset * 0.2) * 0.5);
const risk = Math.min(1, Math.max(0, 0.4 * base + 0.6 * (u * v)));
features.push({
type: "Feature",
geometry: { type: "Point", coordinates: [lon, lat] },
properties: { risk },
});
}
}

return { type: "FeatureCollection", features };
}, [hourOffset]);

return { data };
}