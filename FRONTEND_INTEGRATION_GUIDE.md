# Frontend-Backend Entegrasyon Rehberi

## 🔄 Eski vs Yeni Yapı

| Özellik | Eski (main.py root) | Yeni (app/ modüler yapı) |
|---------|---------------------|-------------------------|
| Port | 8000 | **8001** (veya 8000 eğer eski kapatılırsa) |
| Endpoint'ler | 3 | **20** |
| CRUD | ❌ | ✅ |

---

## ✅ Frontend'in Şu An Kullandığı Endpoint'ler

Frontend (`wildfire-frontend`) şu endpoint'leri çağırıyor:

### 1. `/smoke/detect` (POST)
**Dosya:** `app/hooks/useSmokeDetectMock.ts`
✅ **Yeni backend'de AYNI** - Değişiklik gerekmez.

### 2. `/risk/nowcast_by_polygon` (POST)
**Dosya:** `app/hooks/useRiskNowcast.ts`
✅ **Yeni backend'de AYNI** - Değişiklik gerekmez.

### 3. `/health` (GET)
✅ **Yeni backend'de AYNI** - Değişiklik gerekmez.

---

## ⚙️ ADIM 1: Port Değişikliği

**Dosya:** `wildfire-frontend/app/utils/config.ts`

```diff
- const androidApiUrl = 'http://10.0.2.2:8000';
- const defaultApiUrl = 'http://localhost:8000';
+ const androidApiUrl = 'http://10.0.2.2:8001';
+ const defaultApiUrl = 'http://localhost:8001';
```

---

## 📁 ADIM 2: Types Dosyası Oluştur

**Yeni dosya oluştur:** `wildfire-frontend/app/types/api.ts`

```typescript
// Fire Report Tipleri
export interface FireReport {
  id: number;
  title: string;
  description?: string;
  location?: string;
  image_url?: string;
  status: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FireReportCreate {
  title: string;
  description?: string;
  location?: string;
  image_url?: string;
  user_id?: string;
}

export interface FireReportUpdate {
  title?: string;
  description?: string;
  location?: string;
  status?: string;
}

// Fire Incident Tipleri
export interface FireIncident {
  id: string;
  district: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  reported_by?: string;
  assigned_station_id?: string;
  created_at: string;
}

export interface FireIncidentCreate {
  district: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
}

// Fire Station Tipleri
export interface FireStation {
  id: string;
  name: string;
  district: string;
  latitude?: number;
  longitude?: number;
  status: string;
  created_at: string;
}

export interface FireStationCreate {
  name: string;
  district: string;
  latitude?: number;
  longitude?: number;
  status?: string;
}
```

---

## 🪝 ADIM 3: Hook Dosyaları Oluştur

### 3.1 Fire Reports Hook

**Yeni dosya oluştur:** `wildfire-frontend/app/hooks/useFireReports.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "../utils/config";
import { FireReport, FireReportCreate, FireReportUpdate } from "../types/api";

// Tüm raporları getir
export function useFireReports() {
  return useQuery({
    queryKey: ["fire-reports"],
    queryFn: async (): Promise<FireReport[]> => {
      const response = await fetch(`${BASE_URL}/fire-reports`);
      if (!response.ok) throw new Error("Failed to fetch fire reports");
      return response.json();
    },
  });
}

// Tek rapor getir
export function useFireReport(id: number) {
  return useQuery({
    queryKey: ["fire-reports", id],
    queryFn: async (): Promise<FireReport> => {
      const response = await fetch(`${BASE_URL}/fire-reports/${id}`);
      if (!response.ok) throw new Error("Fire report not found");
      return response.json();
    },
    enabled: !!id,
  });
}

// Yeni rapor oluştur
export function useCreateFireReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: FireReportCreate): Promise<FireReport> => {
      const response = await fetch(`${BASE_URL}/fire-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create fire report");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fire-reports"] });
    },
  });
}

// Rapor güncelle
export function useUpdateFireReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FireReportUpdate }): Promise<FireReport> => {
      const response = await fetch(`${BASE_URL}/fire-reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update fire report");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fire-reports"] });
    },
  });
}

// Rapor sil
export function useDeleteFireReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`${BASE_URL}/fire-reports/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete fire report");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fire-reports"] });
    },
  });
}
```

---

### 3.2 Fire Incidents Hook

**Yeni dosya oluştur:** `wildfire-frontend/app/hooks/useFireIncidents.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "../utils/config";
import { FireIncident, FireIncidentCreate } from "../types/api";

export function useFireIncidents() {
  return useQuery({
    queryKey: ["fire-incidents"],
    queryFn: async (): Promise<FireIncident[]> => {
      const response = await fetch(`${BASE_URL}/fire-incidents`);
      if (!response.ok) throw new Error("Failed to fetch fire incidents");
      return response.json();
    },
  });
}

export function useCreateFireIncident() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: FireIncidentCreate): Promise<FireIncident> => {
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

export function useDeleteFireIncident() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`${BASE_URL}/fire-incidents/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete fire incident");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fire-incidents"] });
    },
  });
}
```

---

### 3.3 Fire Stations Hook

**Yeni dosya oluştur:** `wildfire-frontend/app/hooks/useFireStations.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "../utils/config";
import { FireStation, FireStationCreate } from "../types/api";

export function useFireStations() {
  return useQuery({
    queryKey: ["fire-stations"],
    queryFn: async (): Promise<FireStation[]> => {
      const response = await fetch(`${BASE_URL}/fire-stations`);
      if (!response.ok) throw new Error("Failed to fetch fire stations");
      return response.json();
    },
  });
}

export function useCreateFireStation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: FireStationCreate): Promise<FireStation> => {
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

export function useDeleteFireStation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`${BASE_URL}/fire-stations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete fire station");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fire-stations"] });
    },
  });
}
```

---

## 🖥️ ADIM 4: Screen'de Kullanım Örneği

**Örnek:** `FireDeptScreen.tsx` içinde istasyonları listele

```typescript
import { useFireStations } from "../hooks/useFireStations";

export default function FireDeptScreen() {
  const { data: stations, isLoading, error } = useFireStations();

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error loading stations</Text>;

  return (
    <View>
      {stations?.map((station) => (
        <View key={station.id}>
          <Text>{station.name}</Text>
          <Text>{station.district}</Text>
        </View>
      ))}
    </View>
  );
}
```

---

## 📊 Dosya Yapısı Sonuç

```
wildfire-frontend/
└── app/
    ├── hooks/
    │   ├── useMockRiskGrid.ts        (mevcut)
    │   ├── useRiskAlerts.ts          (mevcut)
    │   ├── useRiskNowcast.ts         (mevcut)
    │   ├── useRiskSummary.ts         (mevcut)
    │   ├── useSmokeDetectMock.ts     (mevcut)
    │   ├── useFireReports.ts         🆕 YENİ
    │   ├── useFireIncidents.ts       🆕 YENİ
    │   └── useFireStations.ts        🆕 YENİ
    ├── types/
    │   ├── index.ts                  (mevcut)
    │   └── api.ts                    🆕 YENİ
    └── utils/
        └── config.ts                 ✏️ PORT DEĞİŞTİR

```

---

## 🧪 Test Komutları

```bash
# Backend çalışıyor mu?
curl http://localhost:8001/health

# Fire stations listele
curl http://localhost:8001/fire-stations

# Fire station oluştur
curl -X POST http://localhost:8001/fire-stations \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Station", "district": "Kadikoy"}'
```
