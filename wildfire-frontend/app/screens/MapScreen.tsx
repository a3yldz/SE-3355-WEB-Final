// app/screens/MapScreen.tsx
import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import MapUniversal from "../components/MapUniversal/MapUniversal";
import { useUIStore } from "../store/useUIStore";
import RiskLegend from "../components/overlays/RiskLegend";
import { colorForRisk } from "../utils/colors";
import { useRiskNowcasts, Area } from "../hooks/useRiskNowcast";

// --- AOI'ler (BBOX'ları dilediğin gibi ayarla)
const AREAS: Area[] = [
  {
    id: "ist",
    name: "İstanbul",
    bbox: { minLon: 28.0, minLat: 40.7, maxLon: 29.8, maxLat: 41.6 },
  },
  {
    id: "izmir",
    name: "İzmir",
    bbox: { minLon: 26.0, minLat: 38.1, maxLon: 27.5, maxLat: 39.4 },
  },
  {
    id: "ankara",
    name: "Ankara",
    bbox: { minLon: 32.3, minLat: 39.6, maxLon: 33.1, maxLat: 40.1 },
  },
];

// Rüzgâr yönü etiketi
const degToCompass = (deg?: number) => {
  if (deg == null || isNaN(deg)) return "-";
  const dirs = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"];
  const i = Math.round(deg / 45) % 8;
  return `${dirs[i]}, ${Math.round(deg)}°`;
};

export default function MapScreen() {
  const { layerRiskVisible, riskOpacity, hourOffset, setHourOffset, toggleRisk } = useUIStore();

  // --- Çoklu AOI fetch (paralel)
  const results = useRiskNowcasts(AREAS, hourOffset, 28, 28); // performans için 28x28
  const anyLoading = results.some((q) => q.isLoading);
  const anyError   = results.some((q) => q.isError);

  // --- Tüm AOI'leri tek FeatureCollection'da birleştir
  const merged = useMemo(() => {
    const features: any[] = [];
    results.forEach((q, idx) => {
      const data = q.data;
      if (!data) return;
      const area = AREAS[idx];
      for (const f of data.features) {
        features.push({
          ...f,
          properties: { ...f.properties, aoiId: area.id, aoiName: area.name },
        });
      }
    });
    return { type: "FeatureCollection", features } as any;
  }, [results]);

  // --- Boya (risk -> renk)
  const paintedRisk = useMemo(() => {
    if (!merged || !layerRiskVisible) return undefined as any;
    return {
      ...merged,
      features: merged.features.map((f: any) => ({
        ...f,
        properties: {
          ...f.properties,
          color: colorForRisk(Number(f.properties?.risk ?? 0), riskOpacity),
        },
      })),
    };
  }, [merged, layerRiskVisible, riskOpacity]);

  // ----- Hücre kartı + AOI ortalaması -----
  const [cell, setCell] = useState<any | null>(null);

  const stats = useMemo(() => {
    const feats = (paintedRisk?.features ?? []) as any[];
    if (!feats.length) return null;

    let t = 0, rh = 0, ws = 0, sx = 0, sy = 0, n = 0;
    feats.forEach((f) => {
      const p = f.properties || {};
      if (typeof p.temp === "number" && typeof p.rh === "number" && typeof p.wind === "number") {
        t += p.temp; rh += p.rh; ws += p.wind; n++;
      }
      if (typeof p.wind_dir === "number") {
        const rad = (p.wind_dir * Math.PI) / 180;
        sx += Math.cos(rad); sy += Math.sin(rad);
      }
    });
    if (n === 0) return null;
    const tAvg = t / n, rhAvg = rh / n, wsAvg = ws / n;
    const dirAvg = (Math.atan2(sy / n, sx / n) * 180) / Math.PI;
    const dirAvg360 = (dirAvg + 360) % 360;
    return { tAvg, rhAvg, wsAvg, dirAvg: dirAvg360 };
  }, [paintedRisk]);

  return (
    <View style={{ flex: 1 }}>
      <MapUniversal
        initialCenter={[29.0, 41.0]}
        initialZoom={6.2} // 3 şehri birden görmek için biraz uzaklaş
        riskGeoJSON={paintedRisk}
        riskOpacity={riskOpacity}
        onRiskCellPress={(p: any) => setCell(p)}
      />

      {/* Top Bar */}
      <View style={{ position: "absolute", top: 12, left: 12, right: 12, gap: 8 }}>
        <View style={{ backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, padding: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            AOI’ler: {AREAS.map(a => a.name).join(" • ")}
          </Text>
          <Text style={{ color: "#ddd", marginTop: 2 }}>Saat kaydır: şu an + {hourOffset}h</Text>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {[0, 1, 3, 6, 12, 24].map((h) => (
              <TouchableOpacity
                key={h}
                onPress={() => setHourOffset(h)}
                style={{
                  backgroundColor: hourOffset === h ? "#22c55e" : "#333",
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  marginBottom: 6,
                }}
              >
                <Text style={{ color: "#fff" }}>+{h}h</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={toggleRisk}
            style={{ backgroundColor: "#111", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 }}
          >
            <Text style={{ color: "#fff" }}>{layerRiskVisible ? "Risk Katmanını Gizle" : "Risk Katmanını Göster"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legend */}
      {layerRiskVisible && (
        <View style={{ position: "absolute", bottom: 16, left: 12 }}>
          <RiskLegend />
        </View>
      )}

      {/* Backend durumu */}
      {(anyLoading || anyError) && (
        <View style={{ position: "absolute", bottom: 16, right: 12, backgroundColor: "rgba(0,0,0,0.6)", padding: 10, borderRadius: 10, maxWidth: 280 }}>
          <Text style={{ color: "#fff", fontWeight: "700", marginBottom: 4 }}>
            {anyLoading ? "Risk katmanları yükleniyor..." : "Backend'e bağlanılamadı"}
          </Text>
          <Text style={{ color: "#ddd" }}>
            {Platform.OS === "android" ? "Emülatörde BASE_URL: http://10.0.2.2:8080" : "Masaüstünde BASE_URL: http://localhost:8080"}
          </Text>
        </View>
      )}

      {/* Hücre + birleşik ortalama kartı */}
      {(cell || stats) && (
        <View style={{ position: "absolute", bottom: 16, right: 12, backgroundColor: "rgba(0,0,0,0.8)", padding: 12, borderRadius: 10, width: 300 }}>
          {cell && (
            <>
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                Hücre — {cell.aoiName ?? cell.aoiId ?? ""}
              </Text>
              <Text style={{ color: "#fff" }}>Risk: {(Number(cell.risk) * 100).toFixed(0)}%</Text>
              <Text style={{ color: "#fff" }}>Sıcaklık: {Number(cell.temp).toFixed(1)}°C</Text>
              <Text style={{ color: "#fff" }}>Nem: {Number(cell.rh).toFixed(0)}%</Text>
              <Text style={{ color: "#fff" }}>
                Rüzgâr: {Number(cell.wind).toFixed(1)} m/s ({degToCompass(Number(cell.wind_dir))})
              </Text>
              <View style={{ height: 8 }} />
            </>
          )}
          {stats && (
            <>
              <Text style={{ color: "#9ae6b4", fontWeight: "700" }}>Birleşik AOI Ortalama</Text>
              <Text style={{ color: "#9ae6b4" }}>Sıcaklık: {stats.tAvg.toFixed(1)}°C</Text>
              <Text style={{ color: "#9ae6b4" }}>Nem: {stats.rhAvg.toFixed(0)}%</Text>
              <Text style={{ color: "#9ae6b4" }}>
                Rüzgâr: {stats.wsAvg.toFixed(1)} m/s ({degToCompass(stats.dirAvg)})
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}
