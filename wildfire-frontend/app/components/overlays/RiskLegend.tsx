import React from "react";
import { View, Text } from "react-native";

export default function RiskLegend() {
return (
<View style={{ backgroundColor: "rgba(0,0,0,0.6)", padding: 12, borderRadius: 12, width: 220 }}>
<Text style={{ color: "#fff", fontWeight: "700", marginBottom: 8 }}>Ignition Risk</Text>
<View style={{ height: 8, borderRadius: 4, backgroundColor: "#0f0" }} />
<View style={{ height: 8, marginTop: -8, borderRadius: 4, backgroundColor: "#ff0", opacity: 0.66 }} />
<View style={{ height: 8, marginTop: -8, borderRadius: 4, backgroundColor: "#f00", opacity: 0.33 }} />
<View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
<Text style={{ color: "#ddd", fontSize: 12 }}>0</Text>
<Text style={{ color: "#ddd", fontSize: 12 }}>1</Text>
</View>
</View>
);
}