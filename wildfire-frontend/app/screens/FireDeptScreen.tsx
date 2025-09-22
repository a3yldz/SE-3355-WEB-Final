// app/screens/FireDeptScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useUIStore } from "../store/useUIStore";
import { useRiskAlerts, Area } from "../hooks/useRiskAlerts";
import { lookupDistrict } from "../utils/district";

const { width: screenWidth } = Dimensions.get("window");

const AREAS: Area[] = [
  { id: "ist",   name: "Istanbul", bbox: { minLon: 28.0, minLat: 40.7, maxLon: 29.8, maxLat: 41.6 } },
  { id: "izmir", name: "Izmir",    bbox: { minLon: 26.0, minLat: 38.1, maxLon: 27.5, maxLat: 39.4 } },
  { id: "ank",   name: "Ankara",   bbox: { minLon: 32.3, minLat: 39.6, maxLon: 33.1, maxLat: 40.1 } },
];

function degToCompass(deg?: number) {
  if (deg == null || isNaN(deg)) return "-";
  const dirs = ["K","KD","D","GD","G","GB","B","KB"];
  const i = Math.round(deg / 45) % 8;
  return `${dirs[i]}, ${Math.round(deg)}°`;
}

type StationStatus = "available" | "dispatched" | "returning" | "maintenance";

type FireStation = {
  id: string;
  name: string;
  district: string;
  status: StationStatus;
  lastUpdate: string;
  assignedIncident?: string;
  vehicles: number;
  personnel: number;
};

type Incident = {
  id: string;
  address: string;
  district: string;
  riskLevel: "high" | "medium" | "low";
  status: "active" | "contained" | "resolved";
  reportedTime: string;
  assignedStations: string[];
};

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  priority: "high" | "medium" | "low";
  read: boolean;
};

// Demo data
const demoStations: FireStation[] = [
  { id: "FS-01", name: "Konak Merkez", district: "Konak", status: "dispatched", lastUpdate: "5 min ago", assignedIncident: "INC-24002", vehicles: 3, personnel: 12 },
  { id: "FS-02", name: "Bornova", district: "Bornova", status: "available", lastUpdate: "10 min ago", vehicles: 2, personnel: 8 },
  { id: "FS-03", name: "Karşıyaka", district: "Karşıyaka", status: "available", lastUpdate: "2 min ago", vehicles: 2, personnel: 9 },
  { id: "FS-04", name: "Buca", district: "Buca", status: "maintenance", lastUpdate: "15 min ago", vehicles: 1, personnel: 5 },
  { id: "FS-05", name: "Aliağa", district: "Aliağa", status: "dispatched", lastUpdate: "8 min ago", assignedIncident: "INC-24001", vehicles: 4, personnel: 15 },
  { id: "FS-06", name: "Çişli", district: "Çişli", status: "returning", lastUpdate: "12 min ago", vehicles: 2, personnel: 7 },
];

const demoIncidents: Incident[] = [
  { id: "INC-24001", address: "Rafineri Cd. No:45", district: "Aliağa", riskLevel: "high", status: "active", reportedTime: "15 min ago", assignedStations: ["FS-05"] },
  { id: "INC-24002", address: "Mithatpaşa Cd. 128", district: "Konak", riskLevel: "medium", status: "active", reportedTime: "25 min ago", assignedStations: ["FS-01"] },
  { id: "INC-24003", address: "Sanayi Sk. 9", district: "Bornova", riskLevel: "low", status: "contained", reportedTime: "40 min ago", assignedStations: [] },
];

const demoNotifications: Notification[] = [
  { id: "N-01", title: "High Fire Risk", message: "Aliağa Rafineri bölgesinde yüksek yangın riski tespit edildi", time: "10 min ago", priority: "high", read: false },
  { id: "N-02", title: "Station Dispatched", message: "Konak Merkez istasyonu yangın mahalline sevk edildi", time: "15 min ago", priority: "medium", read: true },
  { id: "N-03", title: "Maintenance Complete", message: "Buca istasyonu bakımı tamamlandı, hazır durumda", time: "30 min ago", priority: "low", read: true },
];

const statsData = {
  totalStations: demoStations.length,
  availableStations: demoStations.filter(s => s.status === "available").length,
  dispatchedStations: demoStations.filter(s => s.status === "dispatched").length,
  activeIncidents: demoIncidents.filter(i => i.status === "active").length,
};

export default function FireDeptScreen() {
  const { hourOffset } = useUIStore();
  const [provider, setProvider] = useState<"heuristic" | "ai">("heuristic");
  const [threshold, setThreshold] = useState(0.75);
  const [activeTab, setActiveTab] = useState<"overview" | "stations" | "incidents" | "notifications">("overview");
  const [fade] = useState(new Animated.Value(0));
  const [slide] = useState(new Animated.Value(30));

  const { urgent, perCity, anyLoading } = useRiskAlerts(
    AREAS,
    hourOffset,
    provider,
    threshold,
    28,
    28
  );

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // küçük yardımcı: ilçe adı/bölgeyi objeden ya da fallback olarak turf'ten al
  const districtLabel = (p: any) => {
    if (p?.districtName) return p.districtName as string;
    if (Array.isArray(p?.coord)) {
      const d = lookupDistrict(p.coord[0], p.coord[1]);
      if (d?.label) return d.label;
    }
    return null;
  };
  const districtOnly = (p: any) => {
    if (p?.districtOnly) return p.districtOnly as string;
    if (Array.isArray(p?.coord)) {
      const d = lookupDistrict(p.coord[0], p.coord[1]);
      if (d?.district) return d.district;
    }
    return null;
  };
  const regionOf = (p: any) => {
    if (p?.region) return p.region as string;
    if (Array.isArray(p?.coord)) {
      const d = lookupDistrict(p.coord[0], p.coord[1]);
      if (d?.region) return d.region;
    }
    return null;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* HERO SECTION */}
      <View style={styles.heroWrap}>
        <ImageBackground
          source={require("../../assets/fire.-hero.jpg")}
          style={styles.heroBg}
          imageStyle={styles.heroBgImage}
          resizeMode="cover"
        >
          <Animated.View
            style={[styles.heroContent, { opacity: fade, transform: [{ translateY: slide }] }]}
          >
            <Text style={styles.projectName}>İtfaiye & Sevk Paneli</Text>
            <Text style={styles.heroTitle}>Akıllı Müdahale, Anlık Takip</Text>
            <Text style={styles.heroParagraph}>
              Yangın riski yüksek bölgeleri anlık izleyin, ekipleri optimize şekilde yönlendirin.
              GreenTopia ile yangınları erken tespit edin ve müdahale süreçlerini yönetin.
            </Text>
          </Animated.View>
        </ImageBackground>
      </View>

      {/* NAVIGATION TABS */}
      <View style={styles.tabContainer}>
        <TabButton
          label="Genel Bakış"
          active={activeTab === "overview"}
          onPress={() => setActiveTab("overview")}
        />
        <TabButton
          label="İstasyonlar"
          active={activeTab === "stations"}
          onPress={() => setActiveTab("stations")}
        />
        <TabButton
          label="Olaylar"
          active={activeTab === "incidents"}
          onPress={() => setActiveTab("incidents")}
        />
        <TabButton
          label="Bildirimler"
          active={activeTab === "notifications"}
          onPress={() => setActiveTab("notifications")}
        />
      </View>

      {/* CONTENT BASED ON ACTIVE TAB */}
      <Animated.View style={{ opacity: fade }}>
        {activeTab === "overview" && (
          <OverviewTab
            urgent={urgent}
            perCity={perCity}
            anyLoading={anyLoading}
            threshold={threshold}
            provider={provider}
            setProvider={setProvider}
            setThreshold={setThreshold}
          />
        )}
        {activeTab === "stations" && <StationsTab />}
        {activeTab === "incidents" && <IncidentsTab />}
        {activeTab === "notifications" && <NotificationsTab />}
      </Animated.View>
    </ScrollView>
  );

}

function StationsTab() {
  return (
    <Panel title="İstasyon Durumları">
      {demoStations.map((station) => (
        <StationCard key={station.id} data={station} />
      ))}
    </Panel>
  );
}

function IncidentsTab() {
  return (
    <Panel title="Aktif Yangın Olayları">
      {demoIncidents
        .filter(i => i.status === "active")
        .map((incident) => (
          <IncidentCard key={incident.id} data={incident} />
        ))}
    </Panel>
  );
}

function NotificationsTab() {
  return (
    <Panel title="Bildirimler">
      {demoNotifications.map((notification) => (
        <NotificationCard key={notification.id} data={notification} />
      ))}
    </Panel>
  );
}

/* ────────────────── COMPONENTS ────────────────── */

function OverviewTab({ urgent, perCity, anyLoading, threshold, provider, setProvider, setThreshold }: any) {
  return (
    <View>
      {/* STATS GRID */}
      <View style={styles.statsGrid}>
        <StatCard title="Toplam İstasyon" value={statsData.totalStations.toString()} />
        <StatCard title="Müsait İstasyon" value={statsData.availableStations.toString()} status="good" />
        <StatCard title="Sevkteki İstasyon" value={statsData.dispatchedStations.toString()} status="warn" />
        <StatCard title="Aktif Yangın" value={statsData.activeIncidents.toString()} status="bad" />
      </View>

      {/* Risk Analizi Kontrolleri */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Risk Analizi Ayarları</Text>
        <Text style={{ color: "#334155", marginBottom: 12 }}>
          Eşik üstü (≥ {(threshold * 100).toFixed(0)}%) hücreler acil öncelik olarak listelenir.
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {(["heuristic", "ai"] as const).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setProvider(p)}
              style={{
                backgroundColor: provider === p ? "#0ea5e9" : "#e5e7eb",
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: provider === p ? "#fff" : "#111" }}>{p}</Text>
            </TouchableOpacity>
          ))}
          {[0.7, 0.75, 0.8, 0.85, 0.9].map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setThreshold(t)}
              style={{
                backgroundColor: threshold === t ? "#16a34a" : "#e5e7eb",
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: threshold === t ? "#fff" : "#111" }}>
                ≥ {(t * 100).toFixed(0)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.leftColumn}>
          <Panel title="Yüksek Riskli Bölgeler">
            {demoIncidents
              .filter(i => i.riskLevel === "high")
              .map((incident) => (
                <IncidentAlert key={incident.id} data={incident} />
              ))}
          </Panel>

          <Panel title="Acil Alarmlar">
            {anyLoading && <Text>Yükleniyor…</Text>}
            {!anyLoading && urgent.length === 0 && <Text>Şu an eşik üstü hücre yok.</Text>}
            {!anyLoading &&
              urgent.slice(0, 5).map((p: any, i: number) => {
                const label = p?.districtName ? p.districtName as string : 
                  Array.isArray(p?.coord) ? (() => {
                    const d = lookupDistrict(p.coord[0], p.coord[1]);
                    return d?.label || null;
                  })() : null;
                const reg = p?.region ? p.region as string :
                  Array.isArray(p?.coord) ? (() => {
                    const d = lookupDistrict(p.coord[0], p.coord[1]);
                    return d?.region || null;
                  })() : null;
                const city = p.cityName || p.aoiName;
                return (
                  <View key={i} style={{ paddingVertical: 8, borderBottomColor: "#eee", borderBottomWidth: 1 }}>
                    <Text style={{ fontWeight: "700" }}>
                      {label ?? city} — Risk {(p.risk * 100).toFixed(0)}%
                    </Text>
                    <Text>
                      {reg ? `Bölge: ${reg} · ` : ""}
                      Şehir: {city}
                    </Text>
                    <Text>
                      Sıcaklık: {p.temp?.toFixed?.(1)}°C · Nem: {Math.round(p.rh)}% · Rüzgâr:{" "}
                      {p.wind?.toFixed?.(1)} m/s ({degToCompass(p.wind_dir)})
                    </Text>
                  </View>
                );
              })}
          </Panel>
        </View>

        <View style={styles.rightColumn}>
          <Panel title="Araç Durumu">
            <View style={styles.vehicleStatus}>
              <View style={styles.vehicleStat}>
                <Text style={styles.vehicleStatValue}>12</Text>
                <Text style={styles.vehicleStatLabel}>Aktif Araç</Text>
              </View>
              <View style={styles.vehicleStat}>
                <Text style={styles.vehicleStatValue}>3</Text>
                <Text style={styles.vehicleStatLabel}>Sevkte</Text>
              </View>
              <View style={styles.vehicleStat}>
                <Text style={styles.vehicleStatValue}>1</Text>
                <Text style={styles.vehicleStatLabel}>Bakımda</Text>
              </View>
            </View>
          </Panel>

          <Panel title="Hızlı Erişim">
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialIcons name="warning" size={18} color="#F4CE14" />
              <Text style={styles.quickActionText}>Yeni Olay Bildir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialIcons name="fire-truck" size={18} color="#ef4444" />
              <Text style={styles.quickActionText}>İstasyon Yönetimi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialIcons name="map" size={18} color="#3B82F6" />
              <Text style={styles.quickActionText}>Risk Haritası</Text>
            </TouchableOpacity>
          </Panel>
        </View>
      </View>
    </View>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  );
}

function StatCard({ title, value, status }: { title: string; value: string; status?: "good" | "warn" | "bad" }) {
  const statusColor = status === "good" ? "#22c55e" : status === "warn" ? "#f59e0b" : status === "bad" ? "#ef4444" : "#1F2937";

  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: statusColor }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StationCard({ data }: { data: FireStation }) {
  const statusConfig = {
    available: { text: "Müsait", color: "#22c55e", icon: "check-circle" },
    dispatched: { text: "Sevkte", color: "#f59e0b", icon: "directions-car" },
    returning: { text: "Dönüşte", color: "#22c55e", icon: "keyboard-return" },
    maintenance: { text: "Bakımda", color: "#9aa1ab", icon: "build" },
  };

  const status = statusConfig[data.status];

  return (
    <View style={styles.stationCard}>
      <View style={styles.stationHeader}>
        <View>
          <Text style={styles.stationName}>{data.name}</Text>
          <Text style={styles.stationDistrict}>{data.district}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <MaterialIcons name={status.icon as any} size={14} color="white" />
          <Text style={styles.statusText}>{status.text}</Text>
        </View>
      </View>

      <View style={styles.stationDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="local-shipping" size={14} color="#9aa1ab" />
          <Text style={styles.detailText}>Araç: {data.vehicles}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="people" size={14} color="#9aa1ab" />
          <Text style={styles.detailText}>Personel: {data.personnel}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="access-time" size={14} color="#9aa1ab" />
          <Text style={styles.detailText}>Son güncelleme: {data.lastUpdate}</Text>
        </View>
        {data.assignedIncident && (
          <View style={styles.detailRow}>
            <MaterialIcons name="warning" size={14} color="#f59e0b" />
            <Text style={styles.assignedIncident}>Atanan olay: {data.assignedIncident}</Text>
          </View>
        )}
      </View>

      <View style={styles.stationActions}>
        <TouchableOpacity style={styles.smallButton}>
          <MaterialIcons name="info" size={14} color="#d7f5e6" />
          <Text style={styles.smallButtonText}>Detay</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallButton}>
          <MaterialIcons name="location-on" size={14} color="#d7f5e6" />
          <Text style={styles.smallButtonText}>Konum</Text>
        </TouchableOpacity>
        {data.status === "available" && (
          <TouchableOpacity style={[styles.smallButton, { backgroundColor: "#2a6b4b" }]}>
            <MaterialIcons name="send" size={14} color="white" />
            <Text style={[styles.smallButtonText, { color: 'white' }]}>Sevk Et</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function IncidentCard({ data }: { data: Incident }) {
  const riskColor = data.riskLevel === "high" ? "#ef4444" : data.riskLevel === "medium" ? "#f59e0b" : "#22c55e";

  return (
    <View style={styles.incidentCard}>
      <View style={styles.incidentHeader}>
        <Text style={styles.incidentId}>{data.id}</Text>
        <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
          <Text style={styles.riskText}>
            {data.riskLevel === "high" ? "Yüksek Risk" : data.riskLevel === "medium" ? "Orta Risk" : "Düşük Risk"}
          </Text>
        </View>
      </View>

      <Text style={styles.incidentAddress}>{data.address}, {data.district}</Text>
      <View style={styles.incidentTimeRow}>
        <MaterialIcons name="access-time" size={14} color="#9aa1ab" />
        <Text style={styles.incidentTime}>Bildirim: {data.reportedTime}</Text>
      </View>

      <View style={styles.incidentActions}>
        <TouchableOpacity style={styles.smallButton}>
          <MaterialIcons name="info" size={14} color="#d7f5e6" />
          <Text style={styles.smallButtonText}>Detaylar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallButton}>
          <MaterialIcons name="location-on" size={14} color="#d7f5e6" />
          <Text style={styles.smallButtonText}>Konum</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.smallButton, { backgroundColor: "#ef4444" }]}>
          <MaterialIcons name="local-fire-department" size={14} color="white" />
          <Text style={[styles.smallButtonText, { color: 'white' }]}>Müdahale Et</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NotificationCard({ data }: { data: Notification }) {
  const priorityColor = data.priority === "high" ? "#ef4444" : data.priority === "medium" ? "#f59e0b" : "#22c55e";

  return (
    <View style={[styles.notificationCard, !data.read && styles.unreadNotification]}>
      <View style={styles.notificationHeader}>
        <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
        <Text style={styles.notificationTitle}>{data.title}</Text>
        <Text style={styles.notificationTime}>{data.time}</Text>
      </View>
      <Text style={styles.notificationMessage}>{data.message}</Text>
    </View>
  );
}

function IncidentAlert({ data }: { data: Incident }) {
  return (
    <View style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <MaterialIcons name="warning" size={16} color="#ef4444" />
        <Text style={styles.alertTitle}>Yüksek Risk!</Text>
        <Text style={styles.alertDistrict}>{data.district}</Text>
      </View>
      <Text style={styles.alertAddress}>{data.address}</Text>
      <View style={styles.alertTimeRow}>
        <MaterialIcons name="access-time" size={12} color="#9aa1ab" />
        <Text style={styles.alertTime}>{data.reportedTime}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071a14" },
  contentContainer: { paddingBottom: 24 },

  // HERO
  heroWrap: {
    height: 400,
    justifyContent: "center",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  heroBg: {
    width: '100%',
    height: '100%',
    justifyContent: "center",
  },
  heroBgImage: {
    opacity: 0.7,
  },
  heroContent: { paddingHorizontal: 20, alignItems: "center" },
  projectName: { color: "#cfe9d9", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  heroTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  heroParagraph: {
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 22,
    fontSize: 14,
    maxWidth: 760,
    marginBottom: 18,
  },

  // TABS
  tabContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  tabButtonActive: {
    backgroundColor: "#2a6b4b",
  },
  tabButtonText: {
    color: "#d7f5e6",
    fontWeight: "600",
    fontSize: 12,
  },
  tabButtonTextActive: {
    color: "white",
  },

  // STATS
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  statCard: {
    backgroundColor: "#0b241a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    minWidth: "47%",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  statTitle: {
    color: "#b6c8c1",
    marginTop: 4,
    fontSize: 12,
  },

  // LAYOUT
  contentRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 12,
  },
  leftColumn: {
    flex: 2,
    gap: 16,
  },
  rightColumn: {
    flex: 1,
    gap: 16,
  },

  // PANEL
  panel: {
    backgroundColor: "#0b241a",
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  panelTitle: {
    color: "#e3f6ec",
    fontWeight: "800",
    marginBottom: 12,
    fontSize: 16,
  },

  // STATION CARD
  stationCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  stationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stationName: {
    color: "#e3f6ec",
    fontWeight: "700",
    fontSize: 16,
  },
  stationDistrict: {
    color: "#b6c8c1",
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  stationDetails: {
    marginBottom: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    color: "#b6c8c1",
    fontSize: 12,
  },
  assignedIncident: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "600",
  },
  stationActions: {
    flexDirection: "row",
    gap: 8,
  },

  // INCIDENT CARD
  incidentCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  incidentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  incidentId: {
    color: "#e3f6ec",
    fontWeight: "700",
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  incidentAddress: {
    color: "#e3f6ec",
    marginBottom: 4,
  },
  incidentTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  incidentTime: {
    color: "#b6c8c1",
    fontSize: 12,
  },
  incidentActions: {
    flexDirection: "row",
    gap: 8,
  },

  // NOTIFICATION CARD
  notificationCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    opacity: 0.8,
  },
  unreadNotification: {
    opacity: 1,
    borderLeftWidth: 3,
    borderLeftColor: "#2a6b4b",
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationTitle: {
    color: "#e3f6ec",
    fontWeight: "700",
    flex: 1,
  },
  notificationTime: {
    color: "#b6c8c1",
    fontSize: 12,
  },
  notificationMessage: {
    color: "#b6c8c1",
    fontSize: 12,
  },

  // ALERT CARD
  alertCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  alertTitle: {
    color: "#ef4444",
    fontWeight: "700",
    marginRight: 'auto',
  },
  alertDistrict: {
    color: "#e3f6ec",
    fontWeight: "600",
  },
  alertAddress: {
    color: "#e3f6ec",
    marginBottom: 4,
  },
  alertTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  alertTime: {
    color: "#b6c8c1",
    fontSize: 12,
  },

  // VEHICLE STATUS
  vehicleStatus: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  vehicleStat: {
    alignItems: "center",
  },
  vehicleStatValue: {
    color: "#e3f6ec",
    fontSize: 24,
    fontWeight: "800",
  },
  vehicleStatLabel: {
    color: "#b6c8c1",
    fontSize: 12,
  },

  // BUTTONS
  smallButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#0b241a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  smallButtonText: {
    color: "#d7f5e6",
    fontSize: 12,
    fontWeight: "600",
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#0b241a",
    borderRadius: 8,
    marginBottom: 8,
  },
  quickActionText: {
    color: "#e3f6ec",
    fontWeight: "600",
  },
});
