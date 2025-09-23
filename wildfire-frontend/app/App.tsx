// app/App.tsx
import React from "react";
import { SafeAreaView, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNavStore } from "./store/useNavStore";
import Topbar from "./components/layout/Topbar";
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import FireDeptScreen from "./screens/FireDeptScreen";
import DonateScreen from "./screens/DonateScreen";
import { colors } from "./theme";

function getQueryClient() {
  const g = globalThis as any;
  if (!g.__WILDFIRE_QC__) {
    g.__WILDFIRE_QC__ = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          retry: 1,
          refetchOnWindowFocus: false,
          refetchOnReconnect: true,
        },
      },
    });
  }
  return g.__WILDFIRE_QC__ as QueryClient;
}

const qc = getQueryClient();

export default function App() {
  const route = useNavStore((s) => s.route);
  return (
    <QueryClientProvider client={qc}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Topbar />
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {route === "home" && <HomeScreen />}
          {route === "map" && <MapScreen />}
          {route === "fire" && <FireDeptScreen />}
          {route === "donate" && <DonateScreen />}
        </View>
      </SafeAreaView>
    </QueryClientProvider>
  );
}
