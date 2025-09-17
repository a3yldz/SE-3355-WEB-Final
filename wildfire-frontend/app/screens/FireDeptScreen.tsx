// app/screens/FireDeptScreen.tsx
import React from "react";
import { View, Text } from "react-native";
import { colors } from "../theme";

export default function FireDeptScreen() {
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <View style={{ backgroundColor: colors.panel, borderRadius: 14, borderWidth: 1, borderColor: colors.stroke, padding: 16 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>İtfaiye Bildirim Paneli</Text>
        <Text style={{ color: colors.mutetext, marginTop: 6 }}>
          Bu ekranda “yangın skoruna” göre ekip sayısı, en yakın istasyon, rota ve ETA gösterilir. Alarm geldiğinde burada listelenir.
        </Text>
      </View>

      <View style={{ marginTop: 16, backgroundColor: colors.panel, borderRadius: 12, borderWidth: 1, borderColor: colors.stroke, padding: 16 }}>
        <Text style={{ color: colors.text, fontWeight: "800" }}>Aktif Alarmlar</Text>
        <Text style={{ color: colors.mutetext, marginTop: 6 }}>Şimdilik demo verisi yok. Harita/analiz sonrası burada görünecek.</Text>
      </View>
    </View>
  );
}
