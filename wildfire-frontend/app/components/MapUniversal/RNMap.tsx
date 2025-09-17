import React from "react";
import { View, Text } from "react-native";
import type { MapUniversalProps } from "./MapUniversal";

// Native MapLibre henüz kurulmadıysa placeholder gösteriyoruz
const RNMap: React.FC<MapUniversalProps> = () => {
  return (
    <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", textAlign: "center", padding: 16 }}>
        Native MapLibre için Expo Dev Client + @maplibre/maplibre-react-native kurulumu gerekir.
      </Text>
    </View>
  );
};

export default RNMap;
