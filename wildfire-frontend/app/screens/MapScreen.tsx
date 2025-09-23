import React, { useMemo, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import MapUniversal from "../components/MapUniversal/MapUniversal";
import { useUIStore } from "../store/useUIStore";
import RiskLegend from "../components/overlays/RiskLegend";
import { colorForRisk } from "../utils/colors";
import { useRiskNowcastsByPolygon, Area } from "../hooks/useRiskNowcast"; 
import { BASE_URL } from "../utils/config"; // Sadece hata ayıklama metni için import ediyoruz



const AREAS: Area[] = [
  { id: "ist", name: "İstanbul", bbox: { minLon: 28.0, minLat: 40.7, maxLon: 29.8, maxLat: 41.6 } },
  { id: "izmir", name: "İzmir", bbox: { minLon: 26.0, minLat: 38.1, maxLon: 27.5, maxLat: 39.4 } },
  { id: "ankara", name: "Ankara", bbox: { minLon: 32.3, minLat: 39.6, maxLon: 33.1, maxLat: 40.1 } },
];
const degToCompass = (deg?: number) => {
  if (deg == null || isNaN(deg)) return "-";
  const dirs = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"];
  const i = Math.round(deg / 45) % 8;
  return `${dirs[i]}, ${Math.round(deg)}°`;
};

export default function MapScreen() {
  const { layerRiskVisible, riskOpacity, hourOffset, setHourOffset, toggleRisk } = useUIStore();
  const [markers, setMarkers] = useState<Array<{ id: string; coord: [number, number] }>>([]);
  const [cityPolygons, setCityPolygons] = useState<any[]>([]);
  const [cell, setCell] = useState<any | null>(null);

  useEffect(() => {
    const loadCityPolygons = async () => {
      try {
        const response = await fetch('/turkey-admin-level-4.geojson');
        const turkeyProvinces = await response.json();
        const cityNames = AREAS.map(a => a.name);
        const polygons = turkeyProvinces.features.filter((f: any) => cityNames.includes(f.properties.name));
        setCityPolygons(polygons);
        console.log("✅ Şehir poligonları başarıyla yüklendi.");
      } catch (error) { console.error("❌ Şehir poligonları yüklenirken hata:", error); }
    };
    loadCityPolygons();
  }, []);

  const { data: riskData, isLoading: anyLoading, isError: anyError } = useRiskNowcastsByPolygon(cityPolygons, hourOffset);


  const paintedRisk = useMemo(() => {
    if (!riskData || !layerRiskVisible) return undefined;
    return {
      ...riskData,
      features: riskData.features.map((f: any) => ({
        ...f,
        properties: { ...f.properties, color: colorForRisk(Number(f.properties?.risk ?? 0), riskOpacity) },
      })),
    };
  }, [riskData, layerRiskVisible, riskOpacity]);



  const stats = useMemo(() => {
    const feats = (paintedRisk?.features ?? []) as any[];
    if (!feats.length) return null;
    let t = 0, rh = 0, ws = 0, sx = 0, sy = 0, n = 0;
    feats.forEach((f) => {
      const p = f.properties || {};
      if (typeof p.temp === "number") { t += p.temp; n++; }
      if (typeof p.rh === "number") rh += p.rh;
      if (typeof p.wind === "number") ws += p.wind;
      if (typeof p.wind_dir === "number") {
        const rad = (p.wind_dir * Math.PI) / 180;
        sx += Math.cos(rad); sy += Math.sin(rad);
      }
    });
    if (n === 0) return null;
    const tAvg = t / n, rhAvg = rh / n, wsAvg = ws / n;
    const dirAvg = (Math.atan2(sy, sx) * 180) / Math.PI;
    const dirAvg360 = (dirAvg + 360) % 360;
    return { tAvg, rhAvg, wsAvg, dirAvg: dirAvg360 };
  }, [paintedRisk]);

  const handleMapClick = (lngLat: [number, number]) => {
    const id = `fs-${Date.now()}`;
    setMarkers((prev) => [...prev, { id, coord: lngLat }]);
  };

  return (
    <View style={{ flex: 1 }}>
      <MapUniversal
        initialCenter={[32.0, 39.5]} initialZoom={5.5} riskGeoJSON={paintedRisk}
        riskOpacity={riskOpacity} markers={markers} onMapClick={handleMapClick}
        onRiskCellPress={(p: any) => setCell(p)}
      />

      {/* <<<<<<<<<<<<<<<< SAAT KAYDIRMA BUTONLARI BURAYA GERİ EKLENDİ >>>>>>>>>>>>>>>>> */}
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
      {/* <<<<<<<<<<<<<<<< EKLEME BİTTİ >>>>>>>>>>>>>>>>> */}

      {/* Legend */}
      {layerRiskVisible && (
        <View style={{ position: "absolute", bottom: 16, left: 12 }}>
          <RiskLegend />
        </View>
      )}

    {/* ======================= ÇÖZÜM BURADA BAŞLIYOR ======================= */}
    {/*
      Sağ alttaki TÜM elemanlar için TEK BİR kapsayıcı oluşturuyoruz.
      - position: 'absolute' ile sağ alta sabitliyoruz.
      - alignItems: 'flex-end' ile içindeki kartları sağa yaslıyoruz.
      - gap: 8 ile kartlar arasında 8 piksellik dikey boşluk bırakıyoruz.
    */}
    <View style={{ position: 'absolute', bottom: 16, right: 12, alignItems: 'flex-end', gap: 8 }}>
      
      {/* Backend Durum Kartı */}
      {(anyLoading || anyError) && (
        <View style={{ backgroundColor: "rgba(0,0,0,0.7)", padding: 10, borderRadius: 10, maxWidth: 280 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {anyLoading ? "🔄 Risk katmanları yükleniyor..." : "❌ Backend'e bağlanılamadı."}
          </Text>
        </View>
      )}

      {/* Hücre Detay Kartı (Sadece 'cell' verisi varsa gösterilir) */}
      {cell && (
        // BU VIEW'DEN "position: absolute" KALDIRILDI. Pozisyonunu artık üstteki kapsayıcı belirliyor.
        <View style={{ backgroundColor: "rgba(20,20,20,0.9)", padding: 16, borderRadius: 12, width: 350, gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>🔥 Hücre Detayları</Text>
            <TouchableOpacity onPress={() => setCell(null)} style={{ backgroundColor: "#444", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
              <Text style={{ color: "#fff", fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Konum Bilgisi */}
          <View style={{ backgroundColor: "#333", padding: 8, borderRadius: 8 }}>
            <Text style={{ color: "#4ade80", fontWeight: "600", fontSize: 12, marginBottom: 4 }}>📍 Konum</Text>
            <Text style={{ color: "#fff" }}>Koordinat: {Number(cell.coord?.[0] || 0).toFixed(4)}, {Number(cell.coord?.[1] || 0).toFixed(4)}</Text>
            <Text style={{ color: "#fff" }}>Bölge: {cell.aoiName ?? "Bilinmeyen"}</Text>
          </View>

          {/* Yangın Riski Bilgisi */}
          <View style={{ backgroundColor: "#333", padding: 8, borderRadius: 8 }}>
            <Text style={{ color: "#f59e0b", fontWeight: "600", fontSize: 12, marginBottom: 4 }}>⚠️ Yangın Riski</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
              <Text style={{ color: "#fff" }}>Risk Seviyesi: </Text>
              <Text style={{ color: Number(cell.risk) > 0.7 ? "#ef4444" : Number(cell.risk) > 0.4 ? "#f59e0b" : "#22c55e", fontWeight: "700" }}>
                {(Number(cell.risk) * 100).toFixed(1)}%
              </Text>
            </View>
            <Text style={{ color: "#fff" }}>Yakıt Nemi: {(Number(cell.fuel_moisture) * 100).toFixed(0)}%</Text>
            <Text style={{ color: "#fff" }}>Bitki Örtüsü: {cell.vegetation || "bilinmiyor"}</Text>
          </View>

          {/* Hava Durumu Bilgisi */}
          <View style={{ backgroundColor: "#333", padding: 8, borderRadius: 8 }}>
            <Text style={{ color: "#3b82f6", fontWeight: "600", fontSize: 12, marginBottom: 4 }}>🌤️ Hava Durumu</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={{ color: "#fff" }}>🌡️ Sıcaklık: {Number(cell.temp).toFixed(1)}°C</Text>
                <Text style={{ color: "#fff" }}>💧 Nem: {Number(cell.rh).toFixed(0)}%</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: "#fff" }}>💨 Rüzgar: {Number(cell.wind).toFixed(1)} m/s</Text>
                <Text style={{ color: "#fff" }}>🧭 Yön: {degToCompass(cell.wind_dir)}</Text>
              </View>
            </View>
          </View>
          
          {/* Çevresel Faktörler */}
          <View style={{ backgroundColor: "#333", padding: 8, borderRadius: 8 }}>
              <Text style={{ color: "#a78bfa", fontWeight: "600", fontSize: 12, marginBottom: 4 }}>🌍 Çevresel Faktörler</Text>
              <Text style={{ color: "#fff" }}>
                  Kuraklık Durumu: {cell.dry_days > 2 ? `${cell.dry_days} gündür yağış yok` : "Nemli"}
              </Text>
              <Text style={{ color: "#fff" }}>
                  Arazi Eğimi Etkisi: {cell.slope_factor > 1.05 ? "Yüksek" : "Düşük"}
              </Text>
          </View>

          {/* Bölge Ortalaması (Sadece 'stats' verisi varsa gösterilir) */}
          {stats && (
            <View style={{ marginTop: 4, backgroundColor: "#1a4d3a", padding: 8, borderRadius: 8 }}>
              <Text style={{ color: "#22c55e", fontWeight: "700", marginBottom: 4, fontSize: 12 }}>📈 Tüm Bölge Ortalaması</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#9ae6b4" }}>🌡️ Ort. Sıcaklık: {stats.tAvg.toFixed(1)}°C</Text>
                  <Text style={{ color: "#9ae6b4" }}>💧 Ort. Nem: {stats.rhAvg.toFixed(0)}%</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ color: "#9ae6b4" }}>💨 Ort. Rüzgar: {stats.wsAvg.toFixed(1)} m/s</Text>
                  <Text style={{ color: "#9ae6b4" }}>🧭 Ort. Yön: {degToCompass(stats.dirAvg)}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
    {/* ======================== ÇÖZÜMÜN SONU ======================== */}
  </View>
);

}