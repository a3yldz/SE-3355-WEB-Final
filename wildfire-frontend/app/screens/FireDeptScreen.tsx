import React, { useState, useRef, useEffect } from "react";
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
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useUIStore } from "../store/useUIStore";
import { useRiskAlerts, Area } from "../hooks/useRiskAlerts";
import { lookupDistrict } from "../utils/district";

const { width: screenWidth } = Dimensions.get("window");

const AREAS: Area[] = [
  { id: "ist", name: "Istanbul", bbox: { minLon: 28.0, minLat: 40.7, maxLon: 29.8, maxLat: 41.6 } },
  { id: "izmir", name: "Izmir", bbox: { minLon: 26.0, minLat: 38.1, maxLon: 27.5, maxLat: 39.4 } },
  { id: "ank", name: "Ankara", bbox: { minLon: 32.3, minLat: 39.6, maxLon: 33.1, maxLat: 40.1 } },
];

const degToCompass = (deg?: number) => {
  if (deg == null || isNaN(deg)) return "-";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = Math.round(deg / 45) % 8;
  return `${dirs[i]}, ${Math.round(deg)}°`;
};

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

const demoStations: FireStation[] = [
  { id: "FS-01", name: "Konak Central", district: "Konak", status: "dispatched", lastUpdate: "5 min ago", assignedIncident: "INC-24002", vehicles: 3, personnel: 12 },
  { id: "FS-02", name: "Bornova", district: "Bornova", status: "available", lastUpdate: "10 min ago", vehicles: 2, personnel: 8 },
  { id: "FS-03", name: "Karsiyaka", district: "Karsiyaka", status: "available", lastUpdate: "2 min ago", vehicles: 2, personnel: 9 },
  { id: "FS-04", name: "Buca", district: "Buca", status: "maintenance", lastUpdate: "15 min ago", vehicles: 1, personnel: 5 },
  { id: "FS-05", name: "Aliaga", district: "Aliaga", status: "dispatched", lastUpdate: "8 min ago", assignedIncident: "INC-24001", vehicles: 4, personnel: 15 },
  { id: "FS-06", name: "Sisli", district: "Sisli", status: "returning", lastUpdate: "12 min ago", vehicles: 2, personnel: 7 },
];

const demoIncidents: Incident[] = [
  { id: "INC-24001", address: "Rafineri Cd. No:45", district: "Aliaga", riskLevel: "high", status: "active", reportedTime: "15 min ago", assignedStations: ["FS-05"] },
  { id: "INC-24002", address: "Mithatpasa Cd. 128", district: "Konak", riskLevel: "medium", status: "active", reportedTime: "25 min ago", assignedStations: ["FS-01"] },
  { id: "INC-24003", address: "Sanayi Sk. 9", district: "Bornova", riskLevel: "low", status: "contained", reportedTime: "40 min ago", assignedStations: [] },
];

const demoNotifications: Notification[] = [
  { id: "N-01", title: "High Fire Risk", message: "High fire risk detected in Aliaga Refinery area", time: "10 min ago", priority: "high", read: false },
  { id: "N-02", title: "Station Dispatched", message: "Konak Central station has been dispatched to fire scene", time: "15 min ago", priority: "medium", read: true },
  { id: "N-03", title: "Maintenance Complete", message: "Buca station maintenance completed, ready status", time: "30 min ago", priority: "low", read: true },
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const { urgent, perCity, anyLoading } = useRiskAlerts(
    AREAS,
    hourOffset,
    provider,
    threshold,
    28,
    28
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.heroWrapper}>
          <ImageBackground
            source={require("../../assets/fire.-hero.jpg")}
            style={styles.heroBackground}
            imageStyle={{ opacity: 0.6 }}
          >
            <LinearGradient
              colors={["transparent", "#0f172a"]}
              style={styles.heroGradient}
            />

            <Animated.View style={[styles.heroContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.badgeContainer}>
                <View style={styles.activeDot} />
                <Text style={styles.badgeText}>OPERATIONS CENTER</Text>
              </View>

              <Text style={styles.heroTitle}>
                Fire Dept &{"\n"}
                <Text style={{ color: "#f97316" }}>Dispatch Panel</Text>
              </Text>

              <Text style={styles.heroSubtitle}>
                Real-time situational awareness, resource allocation, and predictive risk monitoring for rapid response.
              </Text>
            </Animated.View>
          </ImageBackground>
        </View>

        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {["overview", "stations", "incidents", "notifications"].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab as any)}
                style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 20 }}>
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function OverviewTab({ urgent, perCity, anyLoading, threshold, provider, setProvider, setThreshold }: any) {
  return (
    <View style={{ gap: 24 }}>
      <View style={styles.statsRow}>
        <StatCard
          label="Total Stations"
          value={statsData.totalStations.toString()}
          icon="office-building"
          color="#94a3b8"
        />
        <StatCard
          label="Available"
          value={statsData.availableStations.toString()}
          icon="check-circle"
          color="#22c55e"
        />
        <StatCard
          label="Dispatched"
          value={statsData.dispatchedStations.toString()}
          icon="fire-truck"
          color="#f59e0b"
        />
        <StatCard
          label="Active Fires"
          value={statsData.activeIncidents.toString()}
          icon="fire-alert"
          color="#ef4444"
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="tune" size={20} color="#38bdf8" />
          <Text style={styles.cardTitle}>Prediction Parameters</Text>
        </View>

        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Algorithm:</Text>
          <View style={styles.toggleGroup}>
            {(["heuristic", "ai"] as const).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setProvider(p)}
                style={[styles.toggleBtn, provider === p && { backgroundColor: '#38bdf8', borderColor: '#38bdf8' }]}
              >
                <Text style={[styles.toggleText, provider === p && { color: '#fff' }]}>
                  {p === 'heuristic' ? 'Standard' : 'AI Model'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.controlRow, { marginTop: 12 }]}>
          <Text style={styles.controlLabel}>Threshold:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[0.7, 0.75, 0.8, 0.85, 0.9].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setThreshold(t)}
                style={[styles.chip, threshold === t && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }]}
              >
                <Text style={[styles.chipText, threshold === t && { color: '#fff' }]}>
                  ≥{(t * 100).toFixed(0)}%
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.splitLayout}>
        <View style={styles.colLeft}>
          <SectionHeader title="High Risk Zones" icon="alert-octagon" color="#ef4444" />

          {demoIncidents.filter(i => i.riskLevel === "high").map((incident) => (
            <IncidentAlert key={incident.id} data={incident} />
          ))}

          {anyLoading ? (
            <Text style={styles.loadingText}>Fetching risk data...</Text>
          ) : urgent.length > 0 ? (
            urgent.slice(0, 5).map((p: any, i: number) => <RiskCell key={i} p={p} />)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark" size={24} color="#22c55e" />
              <Text style={styles.emptyText}>No urgent risks detected</Text>
            </View>
          )}
        </View>

        <View style={styles.colRight}>
          <View style={styles.card}>
            <Text style={styles.cardTitleSmall}>Quick Dispatch</Text>
            <TouchableOpacity style={styles.actionBtn}>
              <MaterialCommunityIcons name="phone-alert" size={20} color="#ef4444" />
              <Text style={styles.actionText}>Emergency Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <MaterialCommunityIcons name="map-marker-path" size={20} color="#38bdf8" />
              <Text style={styles.actionText}>Route Planning</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <MaterialCommunityIcons name="file-document-edit" size={20} color="#f59e0b" />
              <Text style={styles.actionText}>Log Report</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitleSmall}>Vehicle Overview</Text>
            <View style={styles.vehicleRow}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.vehicleCount}>12</Text>
                <Text style={styles.vehicleLabel}>Total</Text>
              </View>
              <View style={{ height: 20, width: 1, backgroundColor: '#334155' }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.vehicleCount, { color: '#f59e0b' }]}>3</Text>
                <Text style={styles.vehicleLabel}>Active</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function StationsTab() {
  return (
    <View style={styles.listContainer}>
      {demoStations.map((station) => (
        <StationCard key={station.id} data={station} />
      ))}
    </View>
  );
}

function IncidentsTab() {
  return (
    <View style={styles.listContainer}>
      {demoIncidents.map((incident) => (
        <IncidentCard key={incident.id} data={incident} />
      ))}
    </View>
  );
}

function NotificationsTab() {
  return (
    <View style={styles.listContainer}>
      {demoNotifications.map((notification) => (
        <NotificationCard key={notification.id} data={notification} />
      ))}
    </View>
  );
}

const StatCard = ({ label, value, icon, color }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
    </View>
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const RiskCell = ({ p }: any) => {
  const city = p.cityName || p.aoiName;
  return (
    <View style={styles.riskCell}>
      <View style={styles.riskCellHeader}>
        <Text style={styles.riskCellCity}>{city}</Text>
        <Text style={[styles.riskCellPercent, { color: '#ef4444' }]}>
          Risk: {(p.risk * 100).toFixed(0)}%
        </Text>
      </View>
      <View style={styles.riskCellMeta}>
        <Text style={styles.metaText}>🌡 {p.temp?.toFixed(1)}°C</Text>
        <Text style={styles.metaText}>💧 {Math.round(p.rh)}%</Text>
        <Text style={styles.metaText}>💨 {p.wind?.toFixed(1)} m/s</Text>
      </View>
    </View>
  )
}

const StationCard = ({ data }: { data: FireStation }) => {
  const colors: any = { available: "#22c55e", dispatched: "#f59e0b", returning: "#3b82f6", maintenance: "#94a3b8" };
  const color = colors[data.status] || "#94a3b8";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.stationName}>{data.name}</Text>
          <Text style={styles.stationDistrict}>{data.district}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${color}20`, borderColor: color }]}>
          <Text style={[styles.statusText, { color }]}>{data.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.stationStats}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="truck" size={16} color="#94a3b8" />
          <Text style={styles.statText}>{data.vehicles} Vehicles</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="account-group" size={16} color="#94a3b8" />
          <Text style={styles.statText}>{data.personnel} Personnel</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#94a3b8" />
          <Text style={styles.statText}>{data.lastUpdate}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.btnSecondary}>
          <Text style={styles.btnTextSec}>Details</Text>
        </TouchableOpacity>
        {data.status === "available" && (
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#22c55e' }]}>
            <Text style={styles.btnTextPrim}>Dispatch</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
};

const IncidentCard = ({ data }: { data: Incident }) => {
  const riskColor = data.riskLevel === "high" ? "#ef4444" : data.riskLevel === "medium" ? "#f59e0b" : "#22c55e";

  return (
    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: riskColor }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.incidentId, { color: riskColor }]}>{data.id}</Text>
          <Text style={styles.incidentAddress}>{data.address}, {data.district}</Text>
        </View>
        {data.status === 'active' && (
          <View style={styles.pulseDot} />
        )}
      </View>

      <View style={styles.incidentMeta}>
        <Text style={styles.metaText}>Reported: {data.reportedTime}</Text>
        <Text style={[styles.metaText, { color: riskColor, fontWeight: '700' }]}>
          {data.riskLevel.toUpperCase()} RISK
        </Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#ef4444', flex: 1 }]}>
          <MaterialCommunityIcons name="alarm-light" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.btnTextPrim}>RESPOND NOW</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
};

const IncidentAlert = ({ data }: { data: Incident }) => (
  <View style={styles.alertCard}>
    <MaterialCommunityIcons name="alert-decagram" size={24} color="#ef4444" />
    <View style={{ flex: 1 }}>
      <Text style={styles.alertTitle}>INCIDENT AT {data.district.toUpperCase()}</Text>
      <Text style={styles.alertSub}>{data.address}</Text>
    </View>
    <TouchableOpacity style={styles.alertAction}>
      <Ionicons name="arrow-forward" size={16} color="#fff" />
    </TouchableOpacity>
  </View>
);

const NotificationCard = ({ data }: { data: Notification }) => (
  <View style={[styles.card, !data.read && { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={[styles.dot, { backgroundColor: data.priority === 'high' ? '#ef4444' : '#22c55e' }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.notifTitle}>{data.title}</Text>
        <Text style={styles.notifMsg}>{data.message}</Text>
        <Text style={styles.notifTime}>{data.time}</Text>
      </View>
    </View>
  </View>
);

const SectionHeader = ({ title, icon, color }: any) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
    <MaterialCommunityIcons name={icon} size={18} color={color} />
    <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>{title.toUpperCase()}</Text>
  </View>
);

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroWrapper: {
    height: 320,
    width: '100%',
    position: 'relative',
    marginBottom: 20,
  },
  heroBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.3)",
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f97316",
    marginRight: 8,
  },
  badgeText: {
    color: "#fb923c",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 38,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 20,
    maxWidth: 600,
  },
  tabContainer: {
    marginBottom: 24,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
  },
  tabButtonActive: {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
  },
  tabText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#38bdf8",
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#e2e8f0",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: "#e2e8f0",
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 8,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlLabel: {
    width: 80,
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 4,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toggleText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  chipText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  splitLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  colLeft: {
    flex: 2,
    minWidth: 300,
  },
  colRight: {
    flex: 1,
    minWidth: 200,
  },
  alertCard: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  alertTitle: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "800",
  },
  alertSub: {
    color: "#fca5a5",
    fontSize: 11,
  },
  alertAction: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskCell: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  riskCellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  riskCellCity: {
    color: "#e2e8f0",
    fontWeight: "600",
    fontSize: 14,
  },
  riskCellPercent: {
    fontSize: 12,
    fontWeight: "700",
  },
  riskCellMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaText: {
    color: "#64748b",
    fontSize: 11,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
    opacity: 0.5,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  cardTitleSmall: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  actionText: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "500",
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  vehicleCount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  vehicleLabel: {
    fontSize: 10,
    color: "#64748b",
    textTransform: 'uppercase',
  },
  listContainer: {
    gap: 12,
  },
  stationName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  stationDistrict: {
    color: "#94a3b8",
    fontSize: 12,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 12,
  },
  stationStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  btnTextSec: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "600",
  },
  btnPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnTextPrim: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  incidentId: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  incidentAddress: {
    color: "#e2e8f0",
    fontSize: 13,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  incidentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  notifTitle: {
    color: "#e2e8f0",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 2,
  },
  notifMsg: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 6,
  },
  notifTime: {
    color: "#64748b",
    fontSize: 11,
  },
});