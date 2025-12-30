import React from "react";
import { Platform, View, Text } from "react-native";
import WebMap from "./WebMap";

type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number };

export type MapUniversalProps = {
  initialCenter: [number, number];
  initialZoom?: number;
  riskGeoJSON?: any;
  riskOpacity?: number;
  hotThreshold?: number;
  onRiskCellPress?: (p: any) => void;
  onViewportChange?: (bbox: BBox) => void;
  onMapClick?: (lngLat: [number, number]) => void;
  markers?: Array<{ id: string; coord: [number, number] }>;
};

export default function MapUniversal(props: MapUniversalProps) {
  if (Platform.OS === "web") {
    return (
      <WebMap
        initialCenter={props.initialCenter}
        initialZoom={props.initialZoom}
        riskGeoJSON={props.riskGeoJSON}
        riskOpacity={props.riskOpacity}
        hotThreshold={props.hotThreshold}
        onRiskCellPress={props.onRiskCellPress}
        onViewportChange={props.onViewportChange}
        onMapClick={props.onMapClick}
        markers={props.markers}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0b1220" }}>
      <Text style={{ color: "#fff", padding: 12 }}>
        Native map placeholder — iOS/Android will use MapLibre/Mapbox.
      </Text>
    </View>
  );
}