import React, { useMemo, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Dimensions } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import MapUniversal from "../components/MapUniversal/MapUniversal";
import { useUIStore } from "../store/useUIStore";
import RiskLegend from "../components/overlays/RiskLegend";
import { colorForRisk } from "../utils/colors";
import { useRiskNowcastsByPolygon, Area } from "../hooks/useRiskNowcast";
import { BASE_URL } from "../utils/config";

const AREAS: Area[] = [
  { id: "ist", name: "İstanbul", bbox: { minLon: 28.0, minLat: 40.7, maxLon: 29.8, maxLat: 41.6 } },
  { id: "izmir", name: "İzmir", bbox: { minLon: 26.0, minLat: 38.1, maxLon: 27.5, maxLat: 39.4 } },
  { id: "ankara", name: "Ankara", bbox: { minLon: 32.3, minLat: 39.6, maxLon: 33.1, maxLat: 40.1 } },
];

const degToCompass = (deg?: number) => {
  if (deg == null || isNaN(deg)) return "-";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
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
      } catch (error) { console.error("Error loading city polygons:", error); }
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

  const DetailRow = ({ icon, label, value, color = "#fff" }: any) => (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={color} style={{ marginRight: 6 }} />
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={[styles.detailValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <MapUniversal
        initialCenter={[32.0, 39.5]}
        initialZoom={5.5}
        riskGeoJSON={paintedRisk}
        riskOpacity={riskOpacity}
        markers={markers}
        onMapClick={handleMapClick}
        onRiskCellPress={(p: any) => setCell(p)}
      />

      <View style={styles.topContainer}>
        <View style={styles.glassPanel}>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons name="map-marker-radius" size={20} color="#4ade80" />
            <Text style={styles.headerTitle}>Active AOIs: {AREAS.map(a => a.name).join(", ")}</Text>
          </View>

          <Text style={styles.subText}>Prediction Time: <Text style={{ fontWeight: '700', color: '#fff' }}>Now +{hourOffset}h</Text></Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
            {[0, 1, 3, 6, 12, 24].map((h) => (
              <TouchableOpacity
                key={h}
                onPress={() => setHourOffset(h)}
                style={[styles.timeChip, hourOffset === h && styles.timeChipActive]}
              >
                <Text style={[styles.timeText, hourOffset === h && styles.timeTextActive]}>+{h}h</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity onPress={toggleRisk} style={styles.fabButton}>
          <Ionicons name={layerRiskVisible ? "eye" : "eye-off"} size={22} color="#fff" />
          <Text style={styles.fabText}>{layerRiskVisible ? "Risk Layer On" : "Layer Hidden"}</Text>
        </TouchableOpacity>
      </View>

      {layerRiskVisible && (
        <View style={styles.legendContainer}>
          <RiskLegend />
        </View>
      )}

      <View style={styles.bottomRightContainer}>

        {(anyLoading || anyError) && (
          <View style={[styles.statusBadge, { backgroundColor: anyError ? "#ef4444" : "#f59e0b" }]}>
            <Text style={styles.statusText}>
              {anyLoading ? "🔄 Updating..." : "❌ Connection Lost"}
            </Text>
          </View>
        )}

        {cell && (
          <View style={styles.detailCard}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="fire-alert" size={20} color="#f59e0b" />
                <Text style={styles.cardTitle}>Cell Analysis</Text>
              </View>
              <TouchableOpacity onPress={() => setCell(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.riskIndicator}>
              <Text style={styles.riskLabel}>FIRE RISK PROBABILITY</Text>
              <Text style={[styles.riskValue, { color: Number(cell.risk) > 0.7 ? "#ef4444" : Number(cell.risk) > 0.4 ? "#f59e0b" : "#22c55e" }]}>
                %{(Number(cell.risk) * 100).toFixed(1)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.gridContainer}>
              <View style={styles.gridItem}>
                <DetailRow icon="thermometer" label="Temp" value={`${Number(cell.temp).toFixed(1)}°C`} color="#93c5fd" />
                <DetailRow icon="water" label="Hum" value={`${Number(cell.rh).toFixed(0)}%`} color="#93c5fd" />
              </View>
              <View style={styles.gridItem}>
                <DetailRow icon="speedometer" label="Wind" value={`${Number(cell.wind).toFixed(1)} m/s`} color="#a78bfa" />
                <DetailRow icon="compass" label="Dir" value={degToCompass(cell.wind_dir)} color="#a78bfa" />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.environmentalRow}>
              <Text style={styles.envText}>🌱 Vegetation: <Text style={{ color: '#fff' }}>{cell.vegetation || "N/A"}</Text></Text>
              <Text style={styles.envText}>⛰️ Slope: <Text style={{ color: '#fff' }}>{cell.slope_factor > 1.05 ? "Steep" : "Flat"}</Text></Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e1e1e",
  },
  topContainer: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
  },
  glassPanel: {
    backgroundColor: "rgba(20, 20, 30, 0.85)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  subText: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 12,
  },
  timeScroll: {
    flexGrow: 0,
  },
  timeChip: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  timeChipActive: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderColor: "#22c55e",
  },
  timeText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  timeTextActive: {
    color: "#22c55e",
  },
  fabButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: "#111",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  fabText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
  legendContainer: {
    position: "absolute",
    bottom: 30,
    left: 16,
  },
  bottomRightContainer: {
    position: 'absolute',
    bottom: 30,
    right: 16,
    alignItems: 'flex-end',
    gap: 12,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  detailCard: {
    width: 280,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  closeBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 4,
    borderRadius: 12,
  },
  riskIndicator: {
    alignItems: 'center',
    marginBottom: 12,
  },
  riskLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  riskValue: {
    fontSize: 32,
    fontWeight: "800",
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 1,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 12,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  environmentalRow: {
    marginTop: 4,
    gap: 2,
  },
  envText: {
    color: "#94a3b8",
    fontSize: 11,
  },
});