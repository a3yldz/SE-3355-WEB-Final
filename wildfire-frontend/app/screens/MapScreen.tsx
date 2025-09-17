import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import MapUniversal from "../components/MapUniversal/MapUniversal";
import { useUIStore } from "../store/useUIStore";
import { useMockRiskGrid } from "../hooks/useMockRiskGrid";
import RiskLegend from "../components/overlays/RiskLegend";

export default function MapScreen() {
const { layerRiskVisible, riskOpacity, hourOffset, setHourOffset, toggleRisk } = useUIStore();
const { data: risk } = useMockRiskGrid({ hourOffset });

return (
<View style={{ flex: 1 }}>
<MapUniversal
initialCenter={[29.0, 41.0]}
initialZoom={8}
riskGeoJSON={layerRiskVisible ? risk : undefined}
riskOpacity={riskOpacity}
/>

{/* Top Bar */}
<View style={{ position: "absolute", top: 12, left: 12, right: 12, gap: 8 }}>
<View style={{ backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, padding: 10 }}>
<Text style={{ color: "#fff", fontWeight: "700" }}>AOI: Demo (İstanbul Çevresi)</Text>
<Text style={{ color: "#ddd", marginTop: 2 }}>Saat kaydır: şu an + {hourOffset}h</Text>
<View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
{[0,1,3,6,12,24].map(h => (
<TouchableOpacity key={h} onPress={() => setHourOffset(h)} style={{ backgroundColor: hourOffset===h?"#22c55e":"#333", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}>
<Text style={{ color: "#fff" }}>+{h}h</Text>
</TouchableOpacity>
))}
</View>
</View>

<View style={{ flexDirection: "row", gap: 8 }}>
<TouchableOpacity onPress={toggleRisk} style={{ backgroundColor: "#111", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 }}>
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

{/* Platform hint for native */}
{Platform.OS !== "web" && (
<View style={{ position: "absolute", bottom: 16, right: 12, backgroundColor: "rgba(0,0,0,0.6)", padding: 10, borderRadius: 10, maxWidth: 260 }}>
<Text style={{ color: "#fff" }}>Not: Native MapLibre için Expo Dev Client + @maplibre/maplibre-react-native kurulumu gerekir. Şimdilik placeholder görülür.</Text>
</View>
)}
</View>
);
}
