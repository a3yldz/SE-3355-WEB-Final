# OpenWeather API Entegrasyonu
# Daha detaylı hava durumu verileri ile yangın riski hesaplama

import httpx
import asyncio
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
import json

# OpenWeather API Konfigürasyonu
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "e7e87950d4cbef19404e95fbad64d7d3")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"

class OpenWeatherService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = OPENWEATHER_BASE_URL
    
    async def get_current_weather(self, lat: float, lon: float) -> Dict[str, Any]:
        """Mevcut hava durumu verilerini çek"""
        url = f"{self.base_url}/weather"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.api_key,
            "units": "metric",
            "lang": "tr"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    
    async def get_forecast(self, lat: float, lon: float, days: int = 5) -> Dict[str, Any]:
        """5 günlük hava durumu tahmini"""
        url = f"{self.base_url}/forecast"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.api_key,
            "units": "metric",
            "lang": "tr"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    
    async def get_historical_weather(self, lat: float, lon: float, days_back: int = 1) -> Dict[str, Any]:
        """Geçmiş hava durumu verileri (One Call API 3.0 gerekli)"""
        # Tarih hesaplama
        target_date = datetime.now() - timedelta(days=days_back)
        unix_timestamp = int(target_date.timestamp())
        
        url = f"{self.base_url}/onecall/timemachine"
        params = {
            "lat": lat,
            "lon": lon,
            "dt": unix_timestamp,
            "appid": self.api_key,
            "units": "metric"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError:
            # One Call API yoksa varsayılan değerler
            return self._get_default_historical_data()
    
    def _get_default_historical_data(self) -> Dict[str, Any]:
        """Varsayılan geçmiş veri"""
        return {
            "current": {
                "temp": 20.0,
                "humidity": 60,
                "wind_speed": 5.0,
                "rain": {"1h": 0.0}
            }
        }
    
    def extract_weather_features(self, weather_data: Dict[str, Any], lat: float, lon: float) -> Dict[str, Any]:
        """Hava durumu verilerinden yangın riski için özellikleri çıkar"""
        
        # Zaman bilgisi
        timestamp_unix = weather_data.get("dt", int(datetime.now().timestamp()))
        timestamp_iso = datetime.utcfromtimestamp(timestamp_unix).isoformat() + "Z"
        
        # Ana hava durumu verileri
        main = weather_data.get("main", {})
        wind = weather_data.get("wind", {})
        rain = weather_data.get("rain", {})
        clouds = weather_data.get("clouds", {})
        
        # Temel veriler
        temperature_c = main.get("temp", 20.0)
        relative_humidity = main.get("humidity", 60)
        wind_speed_ms = wind.get("speed", 5.0)
        wind_direction = wind.get("deg", 0)
        precip_1h_mm = rain.get("1h", 0.0)
        air_pressure_hpa = main.get("pressure", 1013.25)
        cloud_cover_percent = clouds.get("all", 0)
        visibility_km = weather_data.get("visibility", 10000) / 1000
        
        # Coğrafi ve çevresel faktörler
        vegetation_type = self._get_vegetation_type(lat, lon)
        fuel_moisture = self._estimate_fuel_moisture(temperature_c, relative_humidity, precip_1h_mm)
        human_activity = self._estimate_human_activity(lat, lon)
        
        # 24 saatlik yağış tahmini (basit hesaplama)
        recent_rain_24h_mm = self._estimate_24h_rainfall(precip_1h_mm, relative_humidity)
        
        return {
            "latitude": lat,
            "longitude": lon,
            "timestamp": timestamp_iso,
            "temperature_c": temperature_c,
            "relative_humidity": relative_humidity,
            "wind_speed_ms": wind_speed_ms,
            "wind_direction": wind_direction,
            "precip_1h_mm": precip_1h_mm,
            "recent_rain_24h_mm": recent_rain_24h_mm,
            "vegetation_type": vegetation_type,
            "fuel_moisture": fuel_moisture,
            "air_pressure_hpa": air_pressure_hpa,
            "cloud_cover_percent": cloud_cover_percent,
            "visibility_km": visibility_km,
            "human_activity": human_activity
        }
    
    def _get_vegetation_type(self, lat: float, lon: float) -> str:
        """Coğrafi konuma göre vejetasyon türü"""
        # Türkiye coğrafi bölgeleri
        if 40.0 <= lat <= 42.0 and 27.0 <= lon <= 30.0:  # Marmara
            return "mixed_forest"
        elif 38.0 <= lat <= 40.0 and 26.0 <= lon <= 30.0:  # Ege
            return "mediterranean_forest"
        elif 36.0 <= lat <= 38.0 and 26.0 <= lon <= 30.0:  # Akdeniz
            return "pine_forest"
        elif 39.0 <= lat <= 42.0 and 30.0 <= lon <= 35.0:  # İç Anadolu
            return "steppe"
        elif 40.0 <= lat <= 42.0 and 35.0 <= lon <= 42.0:  # Karadeniz
            return "deciduous_forest"
        else:
            return "mixed_forest"
    
    def _estimate_fuel_moisture(self, temp: float, humidity: float, rain: float) -> float:
        """Yakıt nem içeriği tahmini - Yağış durumuna göre"""
        
        # Yağış yoksa kuru (düşük nem)
        if rain == 0.0:
            # Kuru koşullar: sıcaklık ve nem etkisi
            base_moisture = 0.1  # Düşük temel nem (kuru)
            temp_factor = max(0, (35 - temp) / 35)  # Yüksek sıcaklık = daha kuru
            humidity_factor = humidity / 100  # Düşük nem = daha kuru
            
            fuel_moisture = base_moisture + (temp_factor * 0.2) + (humidity_factor * 0.3)
            return min(0.4, max(0.0, fuel_moisture))  # Kuru koşullar: 0-0.4 arası
        
        else:
            # Yağış varsa nemli
            base_moisture = 0.5  # Yüksek temel nem (nemli)
            rain_factor = min(1.0, rain / 10)  # 10mm yağış = maksimum nem
            humidity_factor = humidity / 100
            
            fuel_moisture = base_moisture + (rain_factor * 0.4) + (humidity_factor * 0.1)
            return min(1.0, max(0.4, fuel_moisture))  # Nemli koşullar: 0.4-1.0 arası
    
    def _estimate_human_activity(self, lat: float, lon: float) -> str:
        """İnsan aktivitesi tahmini"""
        # Büyük şehirler
        major_cities = [
            (41.0082, 28.9784, "high"),    # İstanbul
            (38.4192, 27.1287, "high"),    # İzmir
            (39.9334, 32.8597, "high"),    # Ankara
            (36.8969, 30.7133, "medium"), # Antalya
            (37.0662, 37.3833, "medium"), # Gaziantep
        ]
        
        for city_lat, city_lon, activity in major_cities:
            distance = ((lat - city_lat) ** 2 + (lon - city_lon) ** 2) ** 0.5
            if distance < 0.5:  # 50km içinde
                return activity
        
        return "low"  # Kırsal alan
    
    def _estimate_24h_rainfall(self, current_rain: float, humidity: float) -> float:
        """24 saatlik yağış tahmini"""
        # Basit tahmin: mevcut yağış + nem bazlı tahmin
        base_rain = current_rain
        humidity_factor = (100 - humidity) / 100 * 2  # Düşük nem = yağış ihtimali
        return base_rain + humidity_factor

# Gelişmiş yangın riski hesaplama
class AdvancedFireRiskCalculator:
    def __init__(self):
        self.vegetation_risk_factors = {
            "pine_forest": 0.9,      # Çam ormanı - yüksek risk
            "mediterranean_forest": 0.8,  # Akdeniz ormanı - yüksek risk
            "mixed_forest": 0.7,     # Karışık orman - orta risk
            "deciduous_forest": 0.6, # Yaprak döken orman - orta risk
            "steppe": 0.4,           # Step - düşük risk
        }
        
        self.human_activity_factors = {
            "high": 0.3,     # Yüksek insan aktivitesi - risk artırır
            "medium": 0.2,   # Orta aktivite
            "low": 0.1,      # Düşük aktivite
        }
    
    def calculate_risk(self, weather_features: Dict[str, Any]) -> float:
        """Gelişmiş yangın riski hesaplama"""
        
        # Temel hava durumu faktörleri
        temp = weather_features["temperature_c"]
        humidity = weather_features["relative_humidity"]
        wind_speed = weather_features["wind_speed_ms"]
        wind_direction = weather_features["wind_direction"]
        rain_1h = weather_features["precip_1h_mm"]
        rain_24h = weather_features["recent_rain_24h_mm"]
        fuel_moisture = weather_features["fuel_moisture"]
        vegetation = weather_features["vegetation_type"]
        human_activity = weather_features["human_activity"]
        
        # 1. Sıcaklık faktörü (30°C üzeri kritik)
        temp_risk = max(0, (temp - 20) / 20)  # 20-40°C arası
        
        # 2. Nem faktörü (düşük nem = yüksek risk)
        humidity_risk = max(0, (100 - humidity) / 100)
        
        # 3. Rüzgar faktörü (güçlü rüzgar = yüksek risk)
        wind_risk = min(1, wind_speed / 15)  # 15 m/s üzeri kritik
        
        # 4. Rüzgar yönü faktörü (güney rüzgarı riskli)
        wind_dir_risk = 1.0
        if 150 <= wind_direction <= 210:  # Güney
            wind_dir_risk = 1.3
        elif 60 <= wind_direction <= 120:  # Doğu
            wind_dir_risk = 1.1
        
        # 5. Yağış faktörü (yağış riski azaltır)
        rain_protection = min(1, (rain_1h + rain_24h) / 20)  # 20mm yağış = maksimum koruma
        
        # 6. Yakıt nem faktörü
        fuel_risk = 1 - fuel_moisture  # Düşük nem = yüksek risk
        
        # 7. Vejetasyon faktörü
        vegetation_risk = self.vegetation_risk_factors.get(vegetation, 0.5)
        
        # 8. İnsan aktivitesi faktörü
        human_risk = self.human_activity_factors.get(human_activity, 0.1)
        
        # 9. Saat faktörü (öğleden sonra riskli)
        hour = datetime.now().hour
        time_risk = 1.0
        if 12 <= hour <= 18:  # Öğleden sonra
            time_risk = 1.2
        elif 6 <= hour <= 12:  # Sabah
            time_risk = 0.8
        
        # Toplam risk hesaplama
        base_risk = (
            temp_risk * 0.25 +
            humidity_risk * 0.20 +
            wind_risk * 0.15 +
            fuel_risk * 0.15 +
            vegetation_risk * 0.15 +
            human_risk * 0.10
        )
        
        # Çarpan faktörler
        total_risk = base_risk * wind_dir_risk * time_risk * (1 - rain_protection)
        
        return min(1.0, max(0.0, total_risk))

# Test fonksiyonu
async def test_openweather_integration():
    """OpenWeather entegrasyonunu test et"""
    service = OpenWeatherService(OPENWEATHER_API_KEY)
    calculator = AdvancedFireRiskCalculator()
    
    # İzmir koordinatları
    lat, lon = 38.4192, 27.1287
    
    try:
        # Mevcut hava durumu
        weather_data = await service.get_current_weather(lat, lon)
        features = service.extract_weather_features(weather_data, lat, lon)
        risk = calculator.calculate_risk(features)
        
        print("🌤️ OpenWeather API Test Sonuçları:")
        print(f"📍 Konum: {lat}, {lon}")
        print(f"🌡️ Sıcaklık: {features['temperature_c']:.1f}°C")
        print(f"💧 Nem: {features['relative_humidity']:.1f}%")
        print(f"💨 Rüzgar: {features['wind_speed_ms']:.1f} m/s")
        print(f"🌧️ Yağış: {features['precip_1h_mm']:.1f} mm")
        print(f"🌲 Vejetasyon: {features['vegetation_type']}")
        print(f"👥 İnsan Aktivitesi: {features['human_activity']}")
        print(f"🔥 Yangın Riski: {risk:.2f} ({risk*100:.1f}%)")
        
        return {
            "success": True,
            "risk": risk,
            "features": features
        }
        
    except Exception as e:
        print(f"❌ Hata: {e}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    print("🌤️ OpenWeather API Entegrasyonu Test Ediliyor...")
    asyncio.run(test_openweather_integration())
