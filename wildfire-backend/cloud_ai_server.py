# Bulut AI Modeli Entegrasyonu
# OpenAI, Google AI, Azure AI, AWS Bedrock gibi servislerle çalışır

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import httpx
import os
import json
import uvicorn

app = FastAPI(title="Cloud AI Risk Server")

class RiskRequest(BaseModel):
    lat: float
    lon: float
    hour_offset: int
    features: Dict[str, float]

class RiskResponse(BaseModel):
    risk: float
    confidence: Optional[float] = None
    model_used: Optional[str] = None

# ==================== AI SERVİS KONFİGÜRASYONU ====================

# Ortam değişkenlerinden AI servis bilgilerini al
AI_SERVICE = os.getenv("AI_SERVICE", "openai")  # openai, google, azure, aws, huggingface
AI_API_KEY = os.getenv("AI_API_KEY")
AI_MODEL = os.getenv("AI_MODEL", "gpt-3.5-turbo")
AI_BASE_URL = os.getenv("AI_BASE_URL")  # Özel endpoint için

# ==================== AI SERVİS İMPLEMENTASYONLARI ====================

class OpenAIService:
    def __init__(self, api_key: str, model: str = "gpt-3.5-turbo"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.openai.com/v1"
    
    async def predict_risk(self, request: RiskRequest) -> RiskResponse:
        """OpenAI ile risk tahmini"""
        prompt = self._create_prompt(request)
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "Sen bir yangın riski uzmanısın. Verilen hava durumu verilerine göre 0-1 arası risk skoru ver. Sadece sayısal değer döndür."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.1,
            "max_tokens": 10
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            
            # AI'dan gelen yanıtı parse et
            ai_response = result["choices"][0]["message"]["content"].strip()
            risk_score = float(ai_response)
            
            return RiskResponse(
                risk=min(1.0, max(0.0, risk_score)),
                confidence=0.85,
                model_used=f"OpenAI {self.model}"
            )
    
    def _create_prompt(self, request: RiskRequest) -> str:
        return f"""
Yangın riski analizi için aşağıdaki verileri değerlendir:

Konum: {request.lat}°K, {request.lon}°D
Saat: +{request.hour_offset} saat
Sıcaklık: {request.features['temp']}°C
Nem: {request.features['rh']}%
Rüzgar Hızı: {request.features['wind']} m/s
Rüzgar Yönü: {request.features['wind_dir']}°

Bu verilere göre 0-1 arası yangın risk skoru ver (0=çok düşük, 1=çok yüksek).
Sadece sayısal değer döndür.
"""

class GoogleAIService:
    def __init__(self, api_key: str, model: str = "gemini-pro"):
        self.api_key = api_key
        self.model = model
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    
    async def predict_risk(self, request: RiskRequest) -> RiskResponse:
        """Google AI ile risk tahmini"""
        prompt = self._create_prompt(request)
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 10
            }
        }
        
        params = {"key": self.api_key}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                params=params,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            
            ai_response = result["candidates"][0]["content"]["parts"][0]["text"].strip()
            risk_score = float(ai_response)
            
            return RiskResponse(
                risk=min(1.0, max(0.0, risk_score)),
                confidence=0.80,
                model_used=f"Google AI {self.model}"
            )
    
    def _create_prompt(self, request: RiskRequest) -> str:
        return f"""
Yangın riski analizi:
Konum: {request.lat}°K, {request.lon}°D
Saat: +{request.hour_offset}h
Sıcaklık: {request.features['temp']}°C
Nem: {request.features['rh']}%
Rüzgar: {request.features['wind']} m/s, {request.features['wind_dir']}°

0-1 arası risk skoru ver (sadece sayı).
"""

class HuggingFaceService:
    def __init__(self, api_key: str, model: str = "microsoft/DialoGPT-medium"):
        self.api_key = api_key
        self.model = model
        self.base_url = f"https://api-inference.huggingface.co/models/{model}"
    
    async def predict_risk(self, request: RiskRequest) -> RiskResponse:
        """Hugging Face ile risk tahmini"""
        # Hugging Face için özel prompt
        prompt = f"Fire risk: temp={request.features['temp']}C, humidity={request.features['rh']}%, wind={request.features['wind']}m/s. Risk score 0-1:"
        
        headers = {"Authorization": f"Bearer {self.api_key}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                headers=headers,
                json={"inputs": prompt},
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            
            # Hugging Face yanıtını parse et
            if isinstance(result, list) and len(result) > 0:
                ai_response = result[0].get("generated_text", "0.5")
                # Sayısal değeri çıkar
                import re
                numbers = re.findall(r'0\.\d+|\d+\.\d+|\d+', ai_response)
                risk_score = float(numbers[0]) if numbers else 0.5
            else:
                risk_score = 0.5
            
            return RiskResponse(
                risk=min(1.0, max(0.0, risk_score)),
                confidence=0.75,
                model_used=f"HuggingFace {self.model}"
            )

# ==================== SERVİS FABRİKASI ====================

def get_ai_service() -> Any:
    """AI servisini ortam değişkenlerine göre döndür"""
    if not AI_API_KEY:
        raise HTTPException(status_code=500, detail="AI_API_KEY environment variable is required")
    
    if AI_SERVICE.lower() == "openai":
        return OpenAIService(AI_API_KEY, AI_MODEL)
    elif AI_SERVICE.lower() == "google":
        return GoogleAIService(AI_API_KEY, AI_MODEL)
    elif AI_SERVICE.lower() == "huggingface":
        return HuggingFaceService(AI_API_KEY, AI_MODEL)
    else:
        raise HTTPException(status_code=500, detail=f"Unsupported AI service: {AI_SERVICE}")

# ==================== API ENDPOİNTLERİ ====================

@app.post("/score", response_model=RiskResponse)
async def calculate_risk(request: RiskRequest):
    """Bulut AI modeli ile risk hesaplama"""
    try:
        ai_service = get_ai_service()
        result = await ai_service.predict_risk(request)
        return result
    except Exception as e:
        # AI servisi hata verirse fallback hesaplama
        risk = calculate_fallback_risk(request)
        return RiskResponse(
            risk=risk,
            confidence=0.5,
            model_used="fallback"
        )

def calculate_fallback_risk(request: RiskRequest) -> float:
    """AI servisi çalışmazsa kullanılacak basit hesaplama"""
    temp = request.features["temp"]
    rh = request.features["rh"]
    wind = request.features["wind"]
    
    temp_factor = max(0, (temp - 20) / 15)
    humidity_factor = max(0, (100 - rh) / 100)
    wind_factor = min(1, wind / 15)
    
    return min(1.0, max(0.0, temp_factor * 0.4 + humidity_factor * 0.4 + wind_factor * 0.2))

@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "service": "cloud-ai-risk-server",
        "ai_service": AI_SERVICE,
        "model": AI_MODEL
    }

@app.get("/models")
async def list_models():
    """Desteklenen AI modellerini listele"""
    return {
        "openai": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
        "google": ["gemini-pro", "gemini-pro-vision"],
        "huggingface": ["microsoft/DialoGPT-medium", "microsoft/DialoGPT-large"]
    }

if __name__ == "__main__":
    print("🌐 Cloud AI Risk Server başlatılıyor...")
    print("📋 Gerekli ortam değişkenleri:")
    print("   AI_SERVICE=openai|google|huggingface")
    print("   AI_API_KEY=your_api_key")
    print("   AI_MODEL=model_name")
    print("   AI_BASE_URL=optional_custom_url")
    print("\n🚀 Örnek kullanım:")
    print("   set AI_SERVICE=openai")
    print("   set AI_API_KEY=sk-...")
    print("   set AI_MODEL=gpt-3.5-turbo")
    print("   python cloud_ai_server.py")
    
    uvicorn.run(app, host="127.0.0.1", port=9000)
