# FireDeptScreen Migration Guide

> Bu dosya, FireDeptScreen.tsx'in demo data'dan gerçek API'ye geçişi için rehberdir.

---

## 📊 Özet

| Özellik | Önce | Şimdi |
|---------|------|-------|
| İstasyonlar | `demoStations` (hardcoded) | `GET /fire-stations` (API) |
| Olaylar | `demoIncidents` (hardcoded) | `GET /fire-incidents` (API) |
| Backend Port | - | `8001` |

---

## 📁 Oluşturulacak Dosyalar

### 1. `app/types/api.ts` (YENİ DOSYA)

```typescript
// Backend'den gelen response tipleri

export interface FireStation {
  id: string;
  name: string;
  district: string;
  latitude?: number;
  longitude?: number;
  status: string;  // "available" | "dispatched" | "returning" | "maintenance"
  created_at: string;
}

export interface FireIncident {
  id: string;
  district: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status: string;  // "active" | "contained" | "resolved"
  reported_by?: string;
  assigned_station_id?: string;
  created_at: string;
}
```

---

### 2. `app/hooks/useFireStations.ts` (YENİ DOSYA)

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "../utils/config";
import { FireStation } from "../types/api";

export function useFireStations() {
  return useQuery({
    queryKey: ["fire-stations"],
    queryFn: async (): Promise<FireStation[]> => {
      const response = await fetch(`${BASE_URL}/fire-stations`);
      if (!response.ok) throw new Error("Failed to fetch fire stations");
      return response.json();
    },
    staleTime: 30_000, // 30 saniye cache
  });
}

export function useCreateFireStation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<FireStation>): Promise<FireStation> => {
      const response = await fetch(`${BASE_URL}/fire-stations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create fire station");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fire-stations"] });
    },
  });
}

export function useUpdateFireStation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FireStation> }): Promise<FireStation> => {
      const response = await fetch(`${BASE_URL}/fire-stations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update fire station");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fire-stations"] });
    },
  });
}
```

---

### 3. `app/hooks/useFireIncidents.ts` (YENİ DOSYA)

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "../utils/config";
import { FireIncident } from "../types/api";

export function useFireIncidents() {
  return useQuery({
    queryKey: ["fire-incidents"],
    queryFn: async (): Promise<FireIncident[]> => {
      const response = await fetch(`${BASE_URL}/fire-incidents`);
      if (!response.ok) throw new Error("Failed to fetch fire incidents");
      return response.json();
    },
    staleTime: 10_000, // 10 saniye cache (daha sık güncellenir)
  });
}

export function useCreateFireIncident() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<FireIncident>): Promise<FireIncident> => {
      const response = await fetch(`${BASE_URL}/fire-incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create fire incident");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fire-incidents"] });
    },
  });
}

export function useUpdateFireIncident() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FireIncident> }): Promise<FireIncident> => {
      const response = await fetch(`${BASE_URL}/fire-incidents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update fire incident");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fire-incidents"] });
    },
  });
}
```

---

## ✏️ FireDeptScreen.tsx Değişiklikleri

### DEĞİŞİKLİK 1: Import ekle (dosya başına)

```typescript
// YENİ IMPORTLAR EKLE
import { useFireStations, useUpdateFireStation } from "../hooks/useFireStations";
import { useFireIncidents, useUpdateFireIncident } from "../hooks/useFireIncidents";
import { ActivityIndicator } from "react-native"; // Loading için
```

---

### DEĞİŞİKLİK 2: Demo data SİL (satır 67-93)

```typescript
// ❌ BU BLOĞU SİL (satır 67-93)
const demoStations: FireStation[] = [
  { id: "FS-01", name: "Konak Central", ... },
  ...
];

const demoIncidents: Incident[] = [
  { id: "INC-24001", address: "Rafineri Cd.", ... },
  ...
];

const statsData = {
  totalStations: demoStations.length,
  ...
};
```

---

### DEĞİŞİKLİK 3: Component içinde hook kullan

**ÖNCE (satır 95-100 civarı):**
```typescript
export default function FireDeptScreen() {
  const { hourOffset } = useUIStore();
  const [provider, setProvider] = useState<"heuristic" | "ai">("heuristic");
  const [threshold, setThreshold] = useState(0.75);
  const [activeTab, setActiveTab] = useState<"overview" | "stations" | "incidents" | "notifications">("overview");
```

**SONRA:**
```typescript
export default function FireDeptScreen() {
  const { hourOffset } = useUIStore();
  const [provider, setProvider] = useState<"heuristic" | "ai">("heuristic");
  const [threshold, setThreshold] = useState(0.75);
  const [activeTab, setActiveTab] = useState<"overview" | "stations" | "incidents" | "notifications">("overview");

  // ✅ YENİ: API'den veri çek
  const { data: stations = [], isLoading: stationsLoading } = useFireStations();
  const { data: incidents = [], isLoading: incidentsLoading } = useFireIncidents();
  
  // ✅ YENİ: Dinamik stats hesapla
  const statsData = {
    totalStations: stations.length,
    availableStations: stations.filter(s => s.status === "available").length,
    dispatchedStations: stations.filter(s => s.status === "dispatched").length,
    activeIncidents: incidents.filter(i => i.status === "active").length,
  };
  
  const isLoading = stationsLoading || incidentsLoading;
```

---

### DEĞİŞİKLİK 4: StationsTab'ı güncelle

**ÖNCE (StationsTab function, satır ~325):**
```typescript
function StationsTab() {
  return (
    <View style={styles.listContainer}>
      {demoStations.map((station) => (
        <StationCard key={station.id} data={station} />
      ))}
    </View>
  );
}
```

**SONRA:**
```typescript
function StationsTab({ stations, isLoading }: { stations: FireStation[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={{ color: '#94a3b8', marginTop: 12 }}>Loading stations...</Text>
      </View>
    );
  }
  
  if (stations.length === 0) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <Text style={{ color: '#94a3b8' }}>No stations found</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.listContainer}>
      {stations.map((station) => (
        <StationCard key={station.id} data={station} />
      ))}
    </View>
  );
}
```

---

### DEĞİŞİKLİK 5: IncidentsTab'ı güncelle

**ÖNCE:**
```typescript
function IncidentsTab() {
  return (
    <View style={styles.listContainer}>
      {demoIncidents.map((incident) => (
        <IncidentCard key={incident.id} data={incident} />
      ))}
    </View>
  );
}
```

**SONRA:**
```typescript
function IncidentsTab({ incidents, isLoading }: { incidents: FireIncident[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={{ color: '#94a3b8', marginTop: 12 }}>Loading incidents...</Text>
      </View>
    );
  }
  
  if (incidents.length === 0) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <Text style={{ color: '#22c55e' }}>✓ No active incidents</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.listContainer}>
      {incidents.map((incident) => (
        <IncidentCard key={incident.id} data={incident} />
      ))}
    </View>
  );
}
```

---

### DEĞİŞİKLİK 6: Tab render kısmını güncelle

**ÖNCE (satır ~186):**
```typescript
{activeTab === "stations" && <StationsTab />}
{activeTab === "incidents" && <IncidentsTab />}
```

**SONRA:**
```typescript
{activeTab === "stations" && <StationsTab stations={stations} isLoading={stationsLoading} />}
{activeTab === "incidents" && <IncidentsTab incidents={incidents} isLoading={incidentsLoading} />}
```

---

## ⚙️ config.ts Değişikliği

**Dosya:** `app/utils/config.ts`

```typescript
// PORT'u 8001 yap (yeni backend)
const androidApiUrl = 'http://10.0.2.2:8001';
const defaultApiUrl = 'http://localhost:8001';

export const BASE_URL = Platform.OS === 'android' ? androidApiUrl : defaultApiUrl;
```

---

## 🧪 Test

1. Backend çalışıyor mu?: `curl http://localhost:8001/health`
2. İstasyonlar: `curl http://localhost:8001/fire-stations`
3. Olaylar: `curl http://localhost:8001/fire-incidents`

---

## 📝 Notlar

- `demoNotifications` şimdilik kalabilir (notification endpoint henüz yok)
- Frontend, backend'deki field isimleriyle uyumlu olmalı (`status`, `district`, vs.)
- `created_at` -> `lastUpdate` dönüşümü frontend'de yapılabilir
