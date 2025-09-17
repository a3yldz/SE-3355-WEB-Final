import React from "react";
import { Platform, View, Text } from "react-native";
import WebMap from "./WebMap";
import RNMap from "./RNMap";

export type MapUniversalProps = {
initialCenter: [number, number]; // [lon, lat]
initialZoom?: number;
riskGeoJSON?: any; // FeatureCollection
riskOpacity?: number;
};

export default function MapUniversal(props: MapUniversalProps) {
if (Platform.OS === "web") return <WebMap {...props} />;
return <RNMap {...props} />;
}