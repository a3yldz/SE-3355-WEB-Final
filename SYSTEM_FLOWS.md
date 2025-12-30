# Sistem Akışları ve DB Entegrasyonu

## 🖥️ Mevcut Ekranlar ve Akışları

---

## 1️⃣ HomeScreen + UploadScreen (Duman Tespiti)

### Mevcut Akış (DB YOK)
```
Kullanıcı fotoğraf yükler
       ↓
POST /smoke/detect (Roboflow AI)
       ↓
Sonuç ekranda gösterilir
       ↓
❌ KAYIT YOK - Kapanınca kaybolur
```

### Olması Gereken Akış (DB İLE)
```
Kullanıcı fotoğraf yükler
       ↓
POST /smoke/detect (Roboflow AI)
       ↓
Sonuç ekranda gösterilir
       ↓
✅ smoke_detections tablosuna kaydet
       ↓
Eğer risk > 0.5:
  → Kullanıcıya "Rapor oluştur?" sor
  → fire_reports tablosuna kaydet
```

**DB Tabloları:**
- `smoke_detections` - AI tespit sonuçları
- `fire_reports` - Kullanıcı raporları

---

## 2️⃣ MapScreen (Risk Haritası)

### Mevcut Akış (DB YOK)
```
Sayfa yüklenir
       ↓
GeoJSON polygon'ları yükle (turkey-admin.geojson)
       ↓
Her şehir için POST /risk/nowcast_by_polygon
       ↓
OpenWeather API → Risk hesapla
       ↓
Harita üzerinde göster
       ↓
❌ KAYIT YOK - Her seferinde API çağrısı
```

### Olması Gereken Akış (DB İLE)
```
Sayfa yüklenir
       ↓
POST /risk/nowcast_by_polygon
       ↓
Risk hesapla + Haritada göster
       ↓
✅ risk_cache tablosuna kaydet (opsiyonel caching)
       ↓
Eğer risk > threshold:
  → fire_incidents tablosuna "auto-detected" kaydet
  → Bildirim oluştur
```

**DB Tabloları (opsiyonel):**
- `risk_cache` - API sonuçlarını cache'leme
- `fire_incidents` - Otomatik tespit edilen yüksek riskler

---

## 3️⃣ FireDeptScreen (İtfaiye Paneli)

### Mevcut Akış (DEMO DATA)
```
Sayfa yüklenir
       ↓
Hardcoded demo veriler gösterilir:
  - demoStations (6 istasyon)
  - demoIncidents (3 olay)
  - demoNotifications (3 bildirim)
       ↓
❌ VERİTABANI YOK - Statik demo
```

### Olması Gereken Akış (DB İLE)
```
Sayfa yüklenir
       ↓
GET /fire-stations → Gerçek istasyonlar
GET /fire-incidents → Gerçek olaylar
POST /risk/... → Anlık risk verileri
       ↓
✅ Veritabanından gerçek veriler
       ↓
"Dispatch" butonuna basınca:
  → PUT /fire-incidents/{id} (station ata)
  → PUT /fire-stations/{id} (status: dispatched)
```

**DB Tabloları:**
- `fire_stations` - İtfaiye istasyonları
- `fire_incidents` - Yangın olayları  
- `users` (itfaiye personeli)

---

## 4️⃣ DonateScreen (Bağış)

### Mevcut Akış (DEMO DATA)
```
Sayfa yüklenir
       ↓
Hardcoded demo veriler gösterilir:
  - monthPoolTL = 1860
  - treesPlanted = 210
  - animalsHelped = 37
       ↓
"Donate" butonları → Alert gösterir
       ↓
❌ VERİTABANI YOK - Sadece UI
```

### Olması Gereken Akış (DB İLE)
```
Sayfa yüklenir
       ↓
GET /donations/stats → Gerçek istatistikler
GET /users/me/points → Kullanıcı puanları
       ↓
"Donate" butonuna basınca:
  → POST /donations (puan dönüştür)
  → Bakiye güncelle
```

**DB Tabloları (gelecekte):**
- `donations` - Bağış kayıtları
- `user_points` - Puan sistemi

---

## 📊 Özet: DB Entegrasyonları

| Ekran | Mevcut | DB İle |
|-------|--------|--------|
| HomeScreen | AI tespiti (kayıt yok) | ✅ smoke_detections kaydet |
| UploadScreen | AI tespiti (kayıt yok) | ✅ smoke_detections + fire_reports |
| MapScreen | Risk hesaplama (her seferinde API) | ✅ Opsiyonel caching |
| FireDeptScreen | Demo data | ✅ fire_stations + fire_incidents |
| DonateScreen | Demo data | 🔮 Gelecekte: donations |

---

## 🔗 Yeni CRUD Endpoint Kullanımları

### FireDeptScreen İçin
```typescript
// Stations Tab
const { data: stations } = useFireStations();

// Incidents Tab  
const { data: incidents } = useFireIncidents();

// Dispatch butonu
const dispatchMutation = useUpdateFireIncident();
dispatchMutation.mutate({ 
  id: incidentId, 
  data: { assigned_station_id: stationId } 
});
```

### UploadScreen İçin (Sonra eklenecek)
```typescript
// AI tespit sonrası rapor oluştur
const createReport = useCreateFireReport();
createReport.mutate({
  title: "Duman tespit edildi",
  description: `Risk: ${score}%`,
  location: currentLocation,
  image_url: uploadedImageUrl
});
```

---

## 📋 Yapılacaklar (Öncelik Sırası)

1. ✅ **CRUD endpoint'leri** - TAMAMLANDI
2. ⏳ **FireDeptScreen** - Demo data → DB bağlantısı
3. ⏳ **UploadScreen** - Tespit sonrası rapor oluşturma
4. ⏳ **MapScreen** - Yüksek risk otomatik incident oluşturma
5. 🔮 **DonateScreen** - Puan sistemi (gelecekte)
