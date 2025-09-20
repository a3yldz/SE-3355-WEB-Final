# AI Risk Server Örneği
# Bu dosyayı çalıştırmak için: python ai_server_example.py

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import uvicorn

app = FastAPI(title="AI Risk Server")

class RiskRequest(BaseModel):
    lat: float
    lon: float
    hour_offset: int
    features: Dict[str, float]

class RiskResponse(BaseModel):
    risk: float

@app.post("/score", response_model=RiskResponse)
async def calculate_risk(request: RiskRequest):
    """
    AI tabanlı risk hesaplama
    Bu örnekte basit bir formül kullanıyoruz, gerçek AI modeli buraya entegre edilebilir
    """
    temp = request.features["temp"]
    rh = request.features["rh"]
    wind = request.features["wind"]
    wind_dir = request.features["wind_dir"]
    
    # Basit AI benzeri hesaplama (gerçek AI modeli buraya konulabilir)
    # Bu örnekte daha karmaşık bir formül kullanıyoruz
    
    # Sıcaklık faktörü (30°C üzeri risk artırır)
    temp_factor = max(0, (temp - 20) / 15)  # 20-35°C arası
    
    # Nem faktörü (düşük nem risk artırır)
    humidity_factor = max(0, (100 - rh) / 100)  # 0-100% arası
    
    # Rüzgar faktörü (güçlü rüzgar risk artırır)
    wind_factor = min(1, wind / 15)  # 0-15 m/s arası
    
    # Rüzgar yönü faktörü (güney rüzgarı risk artırır)
    wind_dir_factor = 1.0
    if 150 <= wind_dir <= 210:  # Güney rüzgarı
        wind_dir_factor = 1.2
    elif 60 <= wind_dir <= 120:  # Doğu rüzgarı
        wind_dir_factor = 1.1
    
    # Coğrafi faktör (enlem/boylam bazlı)
    lat_factor = 1.0
    if 40 <= request.lat <= 42:  # İstanbul bölgesi
        lat_factor = 1.1
    elif 38 <= request.lat <= 40:  # İzmir bölgesi
        lat_factor = 1.05
    
    # AI modeli (gerçek AI burada olacak)
    risk = (
        temp_factor * 0.3 +
        humidity_factor * 0.25 +
        wind_factor * 0.2 +
        wind_dir_factor * 0.15 +
        lat_factor * 0.1
    )
    
    # Saat faktörü (öğleden sonra risk artar)
    hour_factor = 1.0
    if 12 <= (request.hour_offset % 24) <= 18:
        hour_factor = 1.2
    
    final_risk = min(1.0, max(0.0, risk * hour_factor))
    
    return RiskResponse(risk=final_risk)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-risk-server"}

if __name__ == "__main__":
    print("AI Risk Server başlatılıyor...")
    print("Backend'i AI modunda çalıştırmak için:")
    print("set AI_RISK_URL=http://localhost:9000")
    print("python -m uvicorn app:app --host 127.0.0.1 --port 8080")
    uvicorn.run(app, host="127.0.0.1", port=9000)
