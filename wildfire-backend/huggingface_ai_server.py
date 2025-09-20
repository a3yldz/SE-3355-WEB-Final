# Hugging Face AI Servisi - Ücretsiz
# Huawei Cloud ModelArts'e geçiş için hazırlanmış

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import httpx
import os
import json
import uvicorn
import asyncio

app = FastAPI(title="Hugging Face AI Risk Server")

class RiskRequest(BaseModel):
    lat: float
    lon: float
    hour_offset: int
    features: Dict[str, float]

class RiskResponse(BaseModel):
    risk: float
    confidence: Optional[float] = None
    model_used: Optional[str] = None
    processing_time: Optional[float] = None

# ==================== HUGGING FACE KONFİGÜRASYONU ====================

# Hugging Face API Key (ücretsiz)
HF_API_KEY = os.getenv("HF_API_KEY", "hf_your_token_here")
HF_MODEL = os.getenv("HF_MODEL", "microsoft/DialoGPT-medium")
HF_BASE_URL = "https://api-inference.huggingface.co/models"

# ==================== HUGGING FACE SERVİSİ ====================

class HuggingFaceService:
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
        self.base_url = f"{HF_BASE_URL}/{model}"
        self.headers = {"Authorization": f"Bearer {api_key}"}
    
    async def predict_risk(self, request: RiskRequest) -> RiskResponse:
        """Hugging Face ile risk tahmini"""
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Risk hesaplama için özel prompt
            prompt = self._create_risk_prompt(request)
            
            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_length": 50,
                    "temperature": 0.1,
                    "do_sample": True,
                    "return_full_text": False
                }
            }
            
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    self.base_url,
                    headers=self.headers,
                    json=payload
                )
                
                if response.status_code == 503:
                    # Model yükleniyor, biraz bekle
                    await asyncio.sleep(10)
                    response = await client.post(
                        self.base_url,
                        headers=self.headers,
                        json=payload
                    )
                
                response.raise_for_status()
                result = response.json()
                
                # AI yanıtını parse et
                risk_score = self._parse_ai_response(result, request)
                
                processing_time = asyncio.get_event_loop().time() - start_time
                
                return RiskResponse(
                    risk=risk_score,
                    confidence=0.85,
                    model_used=f"HuggingFace {self.model}",
                    processing_time=processing_time
                )
                
        except Exception as e:
            # Hata durumunda fallback hesaplama
            print(f"Hugging Face error: {e}")
            risk_score = self._calculate_fallback_risk(request)
            processing_time = asyncio.get_event_loop().time() - start_time
            
            return RiskResponse(
                risk=risk_score,
                confidence=0.5,
                model_used="fallback",
                processing_time=processing_time
            )
    
    def _create_risk_prompt(self, request: RiskRequest) -> str:
        """Risk hesaplama için prompt oluştur"""
        return f"""
Fire risk analysis:
Location: {request.lat:.2f}N, {request.lon:.2f}E
Time: +{request.hour_offset}h
Temperature: {request.features['temp']:.1f}°C
Humidity: {request.features['rh']:.1f}%
Wind Speed: {request.features['wind']:.1f} m/s
Wind Direction: {request.features['wind_dir']:.1f}°

Calculate fire risk score 0-1. Consider:
- High temp + low humidity = high risk
- Strong wind = high risk
- Afternoon hours = higher risk
- Geographic location matters

Risk score:"""
    
    def _parse_ai_response(self, result: Any, request: RiskRequest) -> float:
        """AI yanıtından risk skorunu çıkar"""
        try:
            if isinstance(result, list) and len(result) > 0:
                # Text generation modeli
                text = result[0].get("generated_text", "")
                # Sayısal değerleri bul
                import re
                numbers = re.findall(r'0\.\d+|\d+\.\d+|\d+', text)
                if numbers:
                    score = float(numbers[0])
                    return min(1.0, max(0.0, score))
            
            elif isinstance(result, dict) and "label" in result:
                # Classification modeli
                label = result["label"]
                score = result.get("score", 0.5)
                # Label'ı risk skoruna çevir
                if "high" in label.lower():
                    return min(1.0, score + 0.3)
                elif "medium" in label.lower():
                    return min(1.0, score)
                elif "low" in label.lower():
                    return max(0.0, score - 0.3)
                else:
                    return score
            
            # Varsayılan fallback
            return self._calculate_fallback_risk(request)
            
        except Exception as e:
            print(f"Parse error: {e}")
            return self._calculate_fallback_risk(request)
    
    def _calculate_fallback_risk(self, request: RiskRequest) -> float:
        """Fallback risk hesaplama"""
        temp = request.features["temp"]
        rh = request.features["rh"]
        wind = request.features["wind"]
        wind_dir = request.features["wind_dir"]
        
        # Sıcaklık faktörü
        temp_factor = max(0, (temp - 15) / 20)  # 15-35°C
        
        # Nem faktörü (düşük nem = yüksek risk)
        humidity_factor = max(0, (100 - rh) / 100)
        
        # Rüzgar faktörü
        wind_factor = min(1, wind / 12)
        
        # Rüzgar yönü faktörü
        wind_dir_factor = 1.0
        if 150 <= wind_dir <= 210:  # Güney
            wind_dir_factor = 1.2
        elif 60 <= wind_dir <= 120:  # Doğu
            wind_dir_factor = 1.1
        
        # Saat faktörü
        hour_factor = 1.0
        if 12 <= (request.hour_offset % 24) <= 18:
            hour_factor = 1.15
        
        # Coğrafi faktör
        geo_factor = 1.0
        if 40 <= request.lat <= 42:  # İstanbul
            geo_factor = 1.1
        elif 38 <= request.lat <= 40:  # İzmir
            geo_factor = 1.05
        
        risk = (
            temp_factor * 0.3 +
            humidity_factor * 0.25 +
            wind_factor * 0.2 +
            wind_dir_factor * 0.1 +
            geo_factor * 0.1 +
            hour_factor * 0.05
        )
        
        return min(1.0, max(0.0, risk))

# ==================== HUAWEI CLOUD MODELARTS HAZIRLIK ====================

class HuaweiModelArtsService:
    """Huawei Cloud ModelArts entegrasyonu için hazırlık"""
    
    def __init__(self, endpoint_url: str, api_key: str):
        self.endpoint_url = endpoint_url
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    async def predict_risk(self, request: RiskRequest) -> RiskResponse:
        """Huawei ModelArts ile risk tahmini"""
        # Bu kısım Huawei Cloud'a deploy edildiğinde aktif olacak
        payload = {
            "inputs": {
                "lat": request.lat,
                "lon": request.lon,
                "hour_offset": request.hour_offset,
                "temp": request.features["temp"],
                "rh": request.features["rh"],
                "wind": request.features["wind"],
                "wind_dir": request.features["wind_dir"]
            }
        }
        
        # Şimdilik fallback kullan
        return RiskResponse(
            risk=0.5,
            confidence=0.0,
            model_used="Huawei ModelArts (not deployed)",
            processing_time=0.0
        )

# ==================== SERVİS FABRİKASI ====================

def get_ai_service():
    """AI servisini seç"""
    service_type = os.getenv("AI_SERVICE_TYPE", "huggingface")
    
    if service_type == "huggingface":
        if not HF_API_KEY or HF_API_KEY == "hf_your_token_here":
            raise HTTPException(
                status_code=500, 
                detail="HF_API_KEY environment variable is required for Hugging Face"
            )
        return HuggingFaceService(HF_API_KEY, HF_MODEL)
    
    elif service_type == "huawei":
        endpoint_url = os.getenv("HUAWEI_ENDPOINT_URL")
        api_key = os.getenv("HUAWEI_API_KEY")
        if not endpoint_url or not api_key:
            raise HTTPException(
                status_code=500,
                detail="HUAWEI_ENDPOINT_URL and HUAWEI_API_KEY required for Huawei ModelArts"
            )
        return HuaweiModelArtsService(endpoint_url, api_key)
    
    else:
        raise HTTPException(status_code=500, detail=f"Unknown service type: {service_type}")

# ==================== API ENDPOİNTLERİ ====================

@app.post("/score", response_model=RiskResponse)
async def calculate_risk(request: RiskRequest):
    """AI ile risk hesaplama"""
    try:
        ai_service = get_ai_service()
        result = await ai_service.predict_risk(request)
        return result
    except Exception as e:
        # Son çare fallback
        risk = calculate_emergency_fallback(request)
        return RiskResponse(
            risk=risk,
            confidence=0.3,
            model_used="emergency_fallback",
            processing_time=0.0
        )

def calculate_emergency_fallback(request: RiskRequest) -> float:
    """Acil durum fallback hesaplama"""
    temp = request.features["temp"]
    rh = request.features["rh"]
    wind = request.features["wind"]
    
    # Çok basit hesaplama
    temp_risk = max(0, (temp - 20) / 15)
    humidity_risk = max(0, (100 - rh) / 100)
    wind_risk = min(1, wind / 10)
    
    return min(1.0, max(0.0, (temp_risk + humidity_risk + wind_risk) / 3))

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "huggingface-ai-risk-server",
        "ai_service": os.getenv("AI_SERVICE_TYPE", "huggingface"),
        "model": HF_MODEL,
        "ready_for_huawei": True
    }

@app.get("/models")
async def list_models():
    """Desteklenen modeller"""
    return {
        "huggingface": [
            "microsoft/DialoGPT-medium",
            "microsoft/DialoGPT-large",
            "gpt2",
            "distilgpt2"
        ],
        "huawei_modelarts": [
            "custom_fire_risk_model",
            "tensorflow_fire_model",
            "pytorch_fire_model"
        ]
    }

@app.get("/huawei/setup")
async def huawei_setup_guide():
    """Huawei Cloud ModelArts kurulum rehberi"""
    return {
        "steps": [
            "1. Huawei Cloud hesabı oluşturun",
            "2. ModelArts servisini aktifleştirin",
            "3. Model'inizi upload edin",
            "4. Endpoint oluşturun",
            "5. Ortam değişkenlerini ayarlayın:",
            "   AI_SERVICE_TYPE=huawei",
            "   HUAWEI_ENDPOINT_URL=your_endpoint_url",
            "   HUAWEI_API_KEY=your_api_key"
        ],
        "documentation": "https://www.huaweicloud.com/en-us/product/modelarts.html"
    }

if __name__ == "__main__":
    print("🤗 Hugging Face AI Risk Server başlatılıyor...")
    print("📋 Gerekli ortam değişkenleri:")
    print("   HF_API_KEY=hf_your_token_here")
    print("   HF_MODEL=microsoft/DialoGPT-medium")
    print("   AI_SERVICE_TYPE=huggingface")
    print("\n🔗 Hugging Face Token almak için:")
    print("   https://huggingface.co/settings/tokens")
    print("\n🚀 Huawei Cloud ModelArts için:")
    print("   AI_SERVICE_TYPE=huawei")
    print("   HUAWEI_ENDPOINT_URL=your_endpoint")
    print("   HUAWEI_API_KEY=your_key")
    
    uvicorn.run(app, host="127.0.0.1", port=9000)
