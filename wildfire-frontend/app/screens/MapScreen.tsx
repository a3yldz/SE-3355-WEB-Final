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

  // --- Çoklu AOI fetch (paralel) - Backend'den gerçek veri (OpenWeather entegrasyonu)
  const results = useRiskNowcasts(AREAS, hourOffset, 28, 28, "heuristic"); // OpenWeather ile gelişmiş heuristik
  const anyLoading = results.some((q) => q.isLoading);
  const anyError   = results.some((q) => q.isError);
  
  // Debug: Backend response kontrolü
  console.log("🔍 Backend Response Debug:", {
    resultsCount: results.length,
    anyLoading,
    anyError,
    results: results.map((r, i) => ({
      index: i,
      isLoading: r.isLoading,
      isError: r.isError,
      error: r.error,
      dataLength: r.data?.features?.length || 0,
      hasData: !!r.data
    }))
  });

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
        onRiskCellPress={(p: any) => {
          // Koordinatları doğru şekilde geç
          const cellData = {
            ...p,
            lon: p.coord?.[0] || p.coordinates?.[0] || p.lon || 0,
            lat: p.coord?.[1] || p.coordinates?.[1] || p.lat || 0,
            coordinates: p.coord || p.coordinates || [p.lon || 0, p.lat || 0]
          };
          console.log("🔍 Hücre Tıklandı:", {
            original: p,
            processed: cellData,
            coord: p.coord,
            coordinates: p.coordinates,
            lon: cellData.lon,
            lat: cellData.lat
          });
          setCell(cellData);
        }}
      />

      {/* Top Bar */}
      <View style={{ position: "absolute", top: 12, left: 12, right: 12, gap: 8 }}>
        <View style={{ backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, padding: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            AOI'ler: {AREAS.map(a => a.name).join(" • ")}
          </Text>
          <Text style={{ color: "#ddd", marginTop: 2 }}>Saat kaydır: şu an + {hourOffset}h</Text>
          <Text style={{ color: "#9ae6b4", fontSize: 10, marginTop: 2 }}>
            💡 Saat barı ile gelecekteki yangın riskini tahmin edin
          </Text>

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

      {/* Detaylı Hücre Bilgi Kartı */}
      {(cell || stats) && (
        <View style={{ position: "absolute", bottom: 16, right: 12, backgroundColor: "rgba(0,0,0,0.9)", padding: 16, borderRadius: 12, width: 350, maxHeight: 400 }}>
          {cell && (
            <>
              {/* Hücre Başlığı */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                  🔥 Hücre Detayları
                </Text>
                <TouchableOpacity 
                  onPress={() => setCell(null)}
                  style={{ backgroundColor: "#444", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                >
                  <Text style={{ color: "#fff", fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Konum Bilgisi */}
              <View style={{ backgroundColor: "#333", padding: 6, borderRadius: 6, marginBottom: 8 }}>
                <Text style={{ color: "#4ade80", fontWeight: "600", marginBottom: 2, fontSize: 11 }}>📍 Konum</Text>
                <Text style={{ color: "#fff", fontSize: 10 }}>
                  Koordinat: {Number(cell.coord?.[0] || cell.coordinates?.[0] || cell.lon || 0).toFixed(4)}, {Number(cell.coord?.[1] || cell.coordinates?.[1] || cell.lat || 0).toFixed(4)}
                </Text>
                <Text style={{ color: "#fff", fontSize: 10 }}>
                  Bölge: {cell.aoiName ?? cell.aoiId ?? "Bilinmeyen"}
                </Text>
              </View>

              {/* Risk Analizi */}
              <View style={{ backgroundColor: "#333", padding: 6, borderRadius: 6, marginBottom: 8 }}>
                <Text style={{ color: "#f59e0b", fontWeight: "600", marginBottom: 2, fontSize: 11 }}>⚠️ Yangın Riski</Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                  <Text style={{ color: "#fff", fontSize: 10 }}>Risk Seviyesi: </Text>
                  <Text style={{ 
                    color: Number(cell.risk) > 0.7 ? "#ef4444" : Number(cell.risk) > 0.4 ? "#f59e0b" : "#22c55e",
                    fontWeight: "700",
                    fontSize: 10
                  }}>
                    {(Number(cell.risk) * 100).toFixed(1)}%
                  </Text>
                </View>
                <Text style={{ color: "#fff", fontSize: 10 }}>
                  Risk Kaynağı: {cell.risk_source || "heuristic"}
                </Text>
              </View>

              {/* Hava Durumu */}
              <View style={{ backgroundColor: "#333", padding: 6, borderRadius: 6, marginBottom: 8 }}>
                <Text style={{ color: "#3b82f6", fontWeight: "600", marginBottom: 2, fontSize: 11 }}>🌤️ Hava Durumu</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 9 }}>🌡️ Sıcaklık: {Number(cell.temp).toFixed(1)}°C</Text>
                    <Text style={{ color: "#fff", fontSize: 9 }}>💧 Nem: {Number(cell.rh).toFixed(0)}%</Text>
                    <Text style={{ color: "#fff", fontSize: 9 }}>🌡️ Hissedilen: {cell.feels_like ? Number(cell.feels_like).toFixed(1) + "°C" : "çekilemedi"}</Text>
                    <Text style={{ color: "#fff", fontSize: 9 }}>💧 Çiğ Noktası: {cell.dew_point ? Number(cell.dew_point).toFixed(1) + "°C" : "çekilemedi"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 9 }}>💨 Rüzgar: {Number(cell.wind).toFixed(1)} m/s</Text>
                    <Text style={{ color: "#fff", fontSize: 9 }}>🧭 Yön: {degToCompass(Number(cell.wind_dir))}</Text>
                    <Text style={{ color: "#fff", fontSize: 9 }}>☁️ Bulut: {cell.cloud_cover ? Number(cell.cloud_cover).toFixed(0) + "%" : "çekilemedi"}</Text>
                    <Text style={{ color: "#fff", fontSize: 9 }}>👁️ Görüş: {cell.visibility ? Number(cell.visibility).toFixed(1) + " km" : "çekilemedi"}</Text>
                  </View>
                </View>
              </View>

              {/* Basınç ve Yağış */}
              <View style={{ backgroundColor: "#333", padding: 6, borderRadius: 6, marginBottom: 8 }}>
                <Text style={{ color: "#06b6d4", fontWeight: "600", marginBottom: 2, fontSize: 11 }}>🌧️ Basınç & Yağış</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 9 }}>📊 Basınç: {cell.pressure ? Number(cell.pressure).toFixed(0) + " hPa" : "çekilemedi"}</Text>
                    <Text style={{ color: "#fff", fontSize: 9 }}>🌧️ Yağış: {cell.rain_1h ? Number(cell.rain_1h).toFixed(1) + " mm/h" : "çekilemedi"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 9 }}>❄️ Kar: {cell.snow_1h ? Number(cell.snow_1h).toFixed(1) + " mm/h" : "çekilemedi"}</Text>
                    <Text style={{ color: "#fff", fontSize: 9 }}>☀️ UV İndeks: {cell.uv_index ? Number(cell.uv_index).toFixed(0) : "çekilemedi"}</Text>
                  </View>
                </View>
              </View>

              {/* Ek Bilgiler */}
              <View style={{ backgroundColor: "#333", padding: 6, borderRadius: 6 }}>
                <Text style={{ color: "#8b5cf6", fontWeight: "600", marginBottom: 2, fontSize: 11 }}>📊 Ek Bilgiler</Text>
                <Text style={{ color: "#fff", fontSize: 9 }}>
                  Saat Kaydırma: +{hourOffset}h
                </Text>
                <Text style={{ color: "#fff", fontSize: 9 }}>
                  Veri Kaynağı: OpenWeather API
                </Text>
                <Text style={{ color: "#fff", fontSize: 9 }}>
                  Hesaplama: Gelişmiş Heuristik
                </Text>
                <Text style={{ color: "#fff", fontSize: 9 }}>
                  Hava Durumu: {cell.weather_desc || "çekilemedi"}
                </Text>
              </View>
            </>
          )}

          {/* Birleşik AOI Ortalama */}
          {stats && (
            <View style={{ marginTop: 8, backgroundColor: "#1a4d3a", padding: 6, borderRadius: 6 }}>
              <Text style={{ color: "#22c55e", fontWeight: "700", marginBottom: 2, fontSize: 11 }}>📈 Tüm Bölge Ortalaması</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#9ae6b4", fontSize: 9 }}>🌡️ Ort. Sıcaklık: {stats.tAvg.toFixed(1)}°C</Text>
                  <Text style={{ color: "#9ae6b4", fontSize: 9 }}>💧 Ort. Nem: {stats.rhAvg.toFixed(0)}%</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#9ae6b4", fontSize: 9 }}>💨 Ort. Rüzgar: {stats.wsAvg.toFixed(1)} m/s</Text>
                  <Text style={{ color: "#9ae6b4", fontSize: 9 }}>🧭 Ort. Yön: {degToCompass(stats.dirAvg)}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
