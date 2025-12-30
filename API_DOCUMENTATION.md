# Wildfire Backend - API Dokümantasyonu

> Son Güncelleme: 30 Aralık 2024  
> Base URL: `http://localhost:8001`

---

## 📊 Genel Bakış

| Kategori | Endpoint Sayısı |
|----------|-----------------|
| Health | 1 |
| Smoke Detection | 3 |
| Fire Reports | 5 |
| Fire Incidents | 5 |
| Fire Stations | 5 |
| Risk Analysis | 1 |
| **TOPLAM** | **20** |

---

## 🏥 Health Check

### `GET /health`
Sistem durumunu kontrol eder.

**Request:** Yok

**Response:**
```json
{
  "ok": true,
  "ts": 1767126419.90642
}
```

---

## 💨 Smoke Detection (Duman Tespiti)

### `POST /smoke/detect`
Fotoğrafı AI'a gönderir, duman analizi yapar.

**Önemli:** 
- Sonucu `smoke_detections` tablosuna kaydeder
- Risk > 50% ise otomatik `fire_report` oluşturur

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Query Params (opsiyonel):
  - `latitude`: float - Konum enlemi
  - `longitude`: float - Konum boylamı
  - `district`: string - İlçe/bölge adı

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | ✅ | Fotoğraf dosyası (JPG, PNG) |
| latitude | float | ❌ | Enlem |
| longitude | float | ❌ | Boylam |
| district | string | ❌ | İlçe adı |

**Response:**
```json
{
  "success": true,
  "risk_score": 75.5,
  "confidence": 0.755,
  "detections": [
    {
      "confidence": 0.755,
      "class": "smoke",
      "bbox": {}
    }
  ],
  "detection_count": 1,
  "detection_id": "uuid-xxx-xxx",
  "report_created": true,
  "report_id": 123,
  "raw_result": {...}
}
```

| Field | Type | Description |
|-------|------|-------------|
| success | bool | İşlem başarılı mı |
| risk_score | float | Risk puanı (0-100) |
| confidence | float | AI güven skoru (0-1) |
| detection_id | string | DB kaydı UUID |
| report_created | bool | Otomatik rapor oluşturuldu mu |
| report_id | int | Oluşturulan rapor ID (varsa) |

---

### `GET /smoke/detections`
Tüm duman tespitlerini listeler.

**Request:**
- Query Params:
  - `skip`: int (default: 0) - Atlama sayısı
  - `limit`: int (default: 100) - Limit

**Response:**
```json
[
  {
    "id": "uuid-xxx",
    "image_url": "image.jpg",
    "latitude": "41.0082",
    "longitude": "28.9784",
    "district": "Kadikoy",
    "risk_score": "0.75",
    "status": "confirmed",
    "created_at": "2024-12-30T20:00:00"
  }
]
```

---

### `GET /smoke/detections/{detection_id}`
Tek duman tespiti getirir.

**Request:**
- Path Param: `detection_id` (UUID)

**Response:** Tek SmokeDetection objesi

---

## 📋 Fire Reports (Yangın Raporları)

### `POST /fire-reports`
Yeni yangın raporu oluşturur.

**Request:**
```json
{
  "title": "Orman yangını bildirimi",
  "description": "Kadıköy bölgesinde duman görüldü",
  "location": "Kadikoy, Istanbul",
  "image_url": "https://example.com/image.jpg",
  "user_id": "user-uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | ✅ | Rapor başlığı |
| description | string | ❌ | Detaylı açıklama |
| location | string | ❌ | Konum bilgisi |
| image_url | string | ❌ | Görsel URL'i |
| user_id | string | ❌ | Bildiren kullanıcı ID |

**Response:**
```json
{
  "id": 1,
  "title": "Orman yangını bildirimi",
  "description": "...",
  "location": "Kadikoy, Istanbul",
  "image_url": "...",
  "status": "pending",
  "user_id": null,
  "created_at": "2024-12-30T20:00:00",
  "updated_at": "2024-12-30T20:00:00"
}
```

---

### `GET /fire-reports`
Tüm raporları listeler.

**Response:** FireReport[] dizisi

---

### `GET /fire-reports/{report_id}`
Tek rapor getirir.

**Request:** Path param `report_id` (int)

**Response:** Tek FireReport objesi

---

### `PUT /fire-reports/{report_id}`
Rapor günceller.

**Request:**
```json
{
  "status": "confirmed",
  "description": "Güncellenen açıklama"
}
```

**Response:** Güncellenmiş FireReport

---

### `DELETE /fire-reports/{report_id}`
Rapor siler.

**Response:**
```json
{
  "message": "Fire report deleted successfully"
}
```

---

## 🔥 Fire Incidents (Yangın Olayları)

### `POST /fire-incidents`
Yeni yangın olayı oluşturur.

**Request:**
```json
{
  "district": "Kadikoy",
  "address": "Moda Caddesi No:45",
  "latitude": 40.9876,
  "longitude": 29.1234,
  "status": "active"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| district | string | ✅ | İlçe adı |
| address | string | ❌ | Tam adres |
| latitude | float | ❌ | Enlem |
| longitude | float | ❌ | Boylam |
| status | string | ❌ | active/contained/resolved |

**Response:**
```json
{
  "id": "uuid-xxx",
  "district": "Kadikoy",
  "address": "Moda Caddesi No:45",
  "latitude": "40.9876",
  "longitude": "29.1234",
  "status": "active",
  "reported_by": null,
  "assigned_station_id": null,
  "created_at": "2024-12-30T20:00:00"
}
```

---

### `GET /fire-incidents`
Tüm olayları listeler.

---

### `GET /fire-incidents/{incident_id}`
Tek olay getirir.

---

### `PUT /fire-incidents/{incident_id}`
Olay günceller (örn: istasyon ata).

**Request:**
```json
{
  "status": "contained",
  "assigned_station_id": "station-uuid"
}
```

---

### `DELETE /fire-incidents/{incident_id}`
Olay siler.

---

## 🚒 Fire Stations (İtfaiye İstasyonları)

### `POST /fire-stations`
Yeni istasyon oluşturur.

**Request:**
```json
{
  "name": "Kadikoy Merkez",
  "district": "Kadikoy",
  "latitude": 40.9876,
  "longitude": 29.1234,
  "status": "available"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ✅ | İstasyon adı |
| district | string | ✅ | İlçe |
| latitude | float | ❌ | Enlem |
| longitude | float | ❌ | Boylam |
| status | string | ❌ | available/dispatched/maintenance |

---

### `GET /fire-stations`
Tüm istasyonları listeler.

---

### `GET /fire-stations/{station_id}`
Tek istasyon getirir.

---

### `PUT /fire-stations/{station_id}`
İstasyon günceller.

---

### `DELETE /fire-stations/{station_id}`
İstasyon siler.

---

## 📊 Risk Analysis (Risk Analizi)

### `POST /risk/nowcast_by_polygon`
Polygon içindeki risk analizi yapar.

**Önemli:**
- OpenWeather API'den hava durumu alır
- Risk > 70% ise otomatik `fire_incident` oluşturur

**Request:**
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[29.0, 41.0], [29.1, 41.0], [29.1, 41.1], [29.0, 41.1], [29.0, 41.0]]]
  },
  "properties": {
    "name": "Istanbul"
  }
}
```

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| hourOffset | int | 0 | Saat ofset (0, 1, 3, 6, 12, 24) |
| provider | string | "hyper_model_vpd" | Algoritma |
| version | int | 7 | Versiyon |

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [29.05, 41.05]
      },
      "properties": {
        "risk": 0.72,
        "temp": 32.5,
        "rh": 45,
        "wind": 5.2,
        "wind_dir": 180,
        "fuel_moisture": 0.35,
        "vegetation": "pine_forest",
        "slope_factor": 1.05,
        "drought_factor": 1.2,
        "dry_days": 5,
        "provider": "hyper_model_vpd:v7"
      }
    }
  ],
  "incident_created": true,
  "incident_id": "uuid-xxx"
}
```

| Field | Type | Description |
|-------|------|-------------|
| features | RiskPoint[] | Grid noktaları |
| incident_created | bool | Otomatik incident oluşturuldu mu |
| incident_id | string | Oluşturulan incident ID (varsa) |

---

## 🔄 Otomatik Akışlar

### Smoke Detection → Fire Report
```
POST /smoke/detect (risk > 50%)
    ↓
smoke_detections tablosuna kaydet
    ↓
Otomatik fire_reports tablosuna kaydet
```

### Risk Analysis → Fire Incident
```
POST /risk/nowcast_by_polygon (risk > 70%)
    ↓
Risk hesapla
    ↓
Eğer bölgede aktif incident yoksa:
    → Otomatik fire_incidents tablosuna kaydet
```

---

## 🗂️ DB Tabloları

| Tablo | Açıklama |
|-------|----------|
| users | Kullanıcılar |
| fire_reports | Kullanıcı raporları |
| fire_incidents | Yangın olayları |
| fire_stations | İtfaiye istasyonları |
| smoke_detections | AI duman tespitleri |
