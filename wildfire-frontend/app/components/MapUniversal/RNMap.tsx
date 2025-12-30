import React from "react";
import { View, Text } from "react-native";
import type { MapUniversalProps } from "./MapUniversal";

const RNMap: React.FC<MapUniversalProps> = () => {
  return (
    <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", textAlign: "center", padding: 16 }}>
        Native MapLibre requires Expo Dev Client + @maplibre/maplibre-react-native installation.
      </Text>
    </View>
  );
};

export default RNMap;