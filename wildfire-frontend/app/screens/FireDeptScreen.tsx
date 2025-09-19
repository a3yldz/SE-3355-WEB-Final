// app/screens/FireDeptScreen.tsx
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useUIStore } from "../store/useUIStore";
import { useRiskAlerts, Area } from "../hooks/useRiskAlerts";
import { lookupDistrict } from "../utils/district";

const AREAS: Area[] = [
  { id: "ist",   name: "Istanbul", bbox: { minLon: 28.0, minLat: 40.7, maxLon: 29.8, maxLat: 41.6 } },
  { id: "izmir", name: "Izmir",    bbox: { minLon: 26.0, minLat: 38.1, maxLon: 27.5, maxLat: 39.4 } },
  { id: "ank",   name: "Ankara",   bbox: { minLon: 32.3, minLat: 39.6, maxLon: 33.1, maxLat: 40.1 } },
];

function degToCompass(deg?: number) {
  if (deg == null || isNaN(deg)) return "-";
  const dirs = ["K","KD","D","GD","G","GB","B","KB"];
  const i = Math.round(deg / 45) % 8;
  return `${dirs[i]}, ${Math.round(deg)}°`;
}

export default function FireDeptScreen() {
  const { hourOffset } = useUIStore();
  const [provider, setProvider] = useState<"heuristic" | "ai">("heuristic");
  const [threshold, setThreshold] = useState(0.75);

  const { urgent, perCity, anyLoading } = useRiskAlerts(
    AREAS,
    hourOffset,
    provider,
    threshold,
    28,
    28
  );

  // küçük yardımcı: ilçe adı/bölgeyi objeden ya da fallback olarak turf'ten al
  const districtLabel = (p: any) => {
    if (p?.districtName) return p.districtName as string;
    if (Array.isArray(p?.coord)) {
      const d = lookupDistrict(p.coord[0], p.coord[1]);
      if (d?.label) return d.label;
    }
    return null;
  };
  const districtOnly = (p: any) => {
    if (p?.districtOnly) return p.districtOnly as string;
    if (Array.isArray(p?.coord)) {
      const d = lookupDistrict(p.coord[0], p.coord[1]);
      if (d?.district) return d.district;
    }
    return null;
  };
  const regionOf = (p: any) => {
    if (p?.region) return p.region as string;
    if (Array.isArray(p?.coord)) {
      const d = lookupDistrict(p.coord[0], p.coord[1]);
      if (d?.region) return d.region;
    }
    return null;
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 8 }}>
        İtfaiye Bildirim Paneli
      </Text>
      <Text style={{ color: "#334155", marginBottom: 12 }}>
        Eşik üstü (≥ {(threshold * 100).toFixed(0)}%) hücreler acil öncelik olarak listelenir.
      </Text>

      {/* kontroller */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {(["heuristic", "ai"] as const).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setProvider(p)}
            style={{
              backgroundColor: provider === p ? "#0ea5e9" : "#e5e7eb",
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: provider === p ? "#fff" : "#111" }}>{p}</Text>
          </TouchableOpacity>
        ))}
        {[0.7, 0.75, 0.8, 0.85, 0.9].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setThreshold(t)}
            style={{
              backgroundColor: threshold === t ? "#16a34a" : "#e5e7eb",
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: threshold === t ? "#fff" : "#111" }}>
              ≥ {(t * 100).toFixed(0)}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ACİL ALARMLAR */}
      <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 8 }}>Acil Alarmlar</Text>
        {anyLoading && <Text>Yükleniyor…</Text>}
        {!anyLoading && urgent.length === 0 && <Text>Şu an eşik üstü hücre yok.</Text>}

        {!anyLoading &&
          urgent.slice(0, 30).map((p: any, i: number) => {
            const label = districtLabel(p);         // "Istanbul / Kadıköy"
            const reg   = regionOf(p);              // "Kuzey" vs (varsa)
            const city  = p.cityName || p.aoiName;  // şehir adı fallback
            return (
              <View key={i} style={{ paddingVertical: 8, borderBottomColor: "#eee", borderBottomWidth: 1 }}>
                <Text style={{ fontWeight: "700" }}>
                  {label ?? city} — Risk {(p.risk * 100).toFixed(0)}%
                </Text>
                <Text>
                  {reg ? `Bölge: ${reg} · ` : ""}
                  Şehir: {city}
                </Text>
                <Text>
                  Sıcaklık: {p.temp?.toFixed?.(1)}°C · Nem: {Math.round(p.rh)}% · Rüzgâr:{" "}
                  {p.wind?.toFixed?.(1)} m/s ({degToCompass(p.wind_dir)})
                </Text>
                {!label && Array.isArray(p.coord) && (
                  <Text style={{ color: "#64748b" }}>
                    Koord: {p.coord[1].toFixed(3)}°, {p.coord[0].toFixed(3)}°
                  </Text>
                )}
              </View>
            );
          })}
      </View>

      {/* Şehir başına Top-10 */}
      {AREAS.map((a) => (
        <View key={a.id} style={{ backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 6 }}>
            {a.name} — Top-10 Riskli Hücre
          </Text>

          {(perCity[a.id] ?? []).length === 0 && <Text>Veri yok.</Text>}

          {(perCity[a.id] ?? []).map((p: any, i: number) => {
            const name = districtOnly(p) || districtLabel(p) || "İlçe yok";
            const reg  = regionOf(p);
            return (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 6,
                  borderBottomColor: "#eee",
                  borderBottomWidth: 1,
                }}
              >
                <Text style={{ width: 36 }}>{i + 1}.</Text>
                <Text style={{ width: 64 }}>{(p.risk * 100).toFixed(0)}%</Text>
                <Text style={{ flex: 1, textAlign: "left" }}>
                  {name}{reg ? ` · ${reg}` : ""}
                </Text>
                <Text style={{ width: 160, textAlign: "right" }}>
                  {p.temp?.toFixed?.(1)}°C · {Math.round(p.rh)}% · {p.wind?.toFixed?.(1)} m/s
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
