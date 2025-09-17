// app/App.tsx
import React from "react";
import { SafeAreaView, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNavStore } from "./store/useNavStore";
import Sidebar from "./components/layout/Sidebar";
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import FireDeptScreen from "./screens/FireDeptScreen";
import { colors } from "./theme";

const qc = new QueryClient();

export default function App() {
  const route = useNavStore((s) => s.route);
  return (
    <QueryClientProvider client={qc}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, flexDirection: "row" }}>
          <Sidebar />
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            {route === "home" && <HomeScreen />}
            {route === "map" && <MapScreen />}
            {route === "fire" && <FireDeptScreen />}
          </View>
        </View>
      </SafeAreaView>
    </QueryClientProvider>
  );
}
