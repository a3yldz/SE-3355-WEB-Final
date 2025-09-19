import React from "react";
import { Platform, View, Text } from "react-native";
import WebMap from "./WebMap";

type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number };

export type MapUniversalProps = {
  initialCenter: [number, number];
  initialZoom?: number;
  riskGeoJSON?: any;      // GeoJSON FC<Point,...>
  riskOpacity?: number;

  // ✅ yeni propslar
  onRiskCellPress?: (p: any) => void;
  onViewportChange?: (bbox: BBox) => void;
};

export default function MapUniversal(props: MapUniversalProps) {
  if (Platform.OS === "web") {
    return (
      <WebMap
        initialCenter={props.initialCenter}
        initialZoom={props.initialZoom}
        riskGeoJSON={props.riskGeoJSON}
        riskOpacity={props.riskOpacity}
        onRiskCellPress={props.onRiskCellPress}     // ✅ forward
        onViewportChange={props.onViewportChange}   // ✅ forward (opsiyonel)
      />
    );
  }

  // Native placeholder
  return (
    <View style={{ flex: 1, backgroundColor: "#0b1220" }}>
      <Text style={{ color: "#fff", padding: 12 }}>
        Native harita placeholder — iOS/Android için MapLibre/Mapbox'a geçilecek.
      </Text>
    </View>
  );
}
