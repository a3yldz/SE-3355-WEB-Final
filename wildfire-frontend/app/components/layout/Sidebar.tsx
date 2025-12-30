import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useNavStore } from "../../store/useNavStore";
import { colors } from "../../theme";

export default function Sidebar() {
  const route = useNavStore((s) => s.route);
  const go = useNavStore((s) => s.go);

  const NavBtn = ({ label, to }: { label: any; to: any }) => (
    <TouchableOpacity
      onPress={() => go(to)}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        marginBottom: 8,
        backgroundColor: route === to ? colors.panelAlt : colors.panel,
        borderWidth: 1,
        borderColor: colors.stroke,
      }}
    >
      <Text style={{ color: colors.text, fontWeight: route === to ? "700" : "500" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View
      style={{
        width: 264,
        backgroundColor: colors.bg,
        padding: 16,
        gap: 12,
        borderRightWidth: 1,
        borderRightColor: colors.stroke,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Image
          source={require("../../../assets/logo.png")}
          style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.forest }}
          defaultSource={undefined as any}
        />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>GreenTopia</Text>
      </View>

      <NavBtn label="Home" to="home" />
      <NavBtn label="Map" to="map" />
      <NavBtn label="Fire Dept" to="fire" />

      <View style={{ marginTop: 16 }}>
        <Text style={{ color: colors.mutetext, fontSize: 12 }}>Features</Text>
        <Text style={{ color: colors.mutetext, fontSize: 12, marginTop: 6 }}>• Ignition Risk</Text>
        <Text style={{ color: colors.mutetext, fontSize: 12, marginTop: 6 }}>• Smoke + Grad-CAM</Text>
        <Text style={{ color: colors.mutetext, fontSize: 12, marginTop: 6 }}>• Spread Simulation</Text>
        <Text style={{ color: colors.mutetext, fontSize: 12, marginTop: 6 }}>• Dispatch & ETA</Text>
      </View>
    </View>
  );
}
