// app/components/layout/Topbar.tsx
import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useNavStore } from "../../store/useNavStore";
import { colors } from "../../theme";

export default function Topbar() {
  const route = useNavStore((s) => s.route);
  const go = useNavStore((s) => s.go);

  const NavBtn = ({ label, to }: { label: string; to: any }) => (
    <TouchableOpacity
      onPress={() => go(to)}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: route === to ? colors.panelAlt : "transparent",
        borderWidth: 1,
        borderColor: route === to ? colors.stroke : "transparent",
        marginLeft: 8,
      }}
    >
      <Text style={{ color: colors.text, fontWeight: route === to ? "800" : "600" }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View
      style={{
        height: 56,
        backgroundColor: colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: colors.stroke,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Image
          source={require("../../../assets/logo.png")}
          style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: colors.forest }}
          defaultSource={undefined as any}
        />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>GreenTopia</Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <NavBtn label="Ana Sayfa" to="home" />
        <NavBtn label="Risk Haritası" to="map" />
        <NavBtn label="İtfaiye & Sevk" to="fire" />
      </View>
    </View>
  );
}


