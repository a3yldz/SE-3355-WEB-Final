# Huawei Cloud ModelArts Entegrasyon Rehberi

## 🏗️ **Huawei Cloud ModelArts Kurulumu**

### **1. Huawei Cloud Hesabı**
- [Huawei Cloud](https://www.huaweicloud.com) hesabı oluşturun
- ModelArts servisini aktifleştirin
- Kredi kartı bilgilerinizi ekleyin (ücretsiz tier mevcut)

### **2. Model Hazırlama**

#### **A. TensorFlow Modeli**
```python
# model_training.py
import tensorflow as tf
import numpy as np
import pandas as pd

# Yangın riski veri seti (örnek)
def create_fire_risk_model():
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(6,)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(16, activation='relu'),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    
    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    return model

# Modeli eğit
model = create_fire_risk_model()
# ... eğitim kodu ...

# Modeli kaydet
model.save('fire_risk_model.h5')
```

#### **B. PyTorch Modeli**
```python
# model_training.py
import torch
import torch.nn as nn

class FireRiskModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(6, 64)
        self.fc2 = nn.Linear(64, 32)
        self.fc3 = nn.Linear(32, 16)
        self.fc4 = nn.Linear(16, 1)
        self.dropout = nn.Dropout(0.2)
        
    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = self.dropout(x)
        x = torch.relu(self.fc2(x))
        x = self.dropout(x)
        x = torch.relu(self.fc3(x))
        x = torch.sigmoid(self.fc4(x))
        return x

# Modeli kaydet
model = FireRiskModel()
torch.save(model.state_dict(), 'fire_risk_model.pth')
```

### **3. ModelArts'e Upload**

#### **A. OBS (Object Storage Service)**
```bash
# Huawei Cloud CLI ile
obsutil cp fire_risk_model.h5 obs://your-bucket/models/
```

#### **B. ModelArts Console**
1. ModelArts Console'a gidin
2. "Model Management" > "Models"
3. "Import Model" butonuna tıklayın
4. OBS path'ini girin
5. Model framework'ünü seçin (TensorFlow/PyTorch)

### **4. Endpoint Oluşturma**

#### **A. ModelArts Console**
1. "Deploy" > "Real-time Services"
2. "Create" butonuna tıklayın
3. Model'inizi seçin
4. Instance type'ı seçin
5. Endpoint'i oluşturun

#### **B. API Endpoint URL**
```
https://your-region.modelarts.huaweicloud.com/v1/infers/your-endpoint-id
```

### **5. Ortam Değişkenlerini Ayarlayın**

```bash
# Windows
set AI_SERVICE_TYPE=huawei
set HUAWEI_ENDPOINT_URL=https://your-region.modelarts.huaweicloud.com/v1/infers/your-endpoint-id
set HUAWEI_API_KEY=your-huawei-api-key

# Linux/Mac
export AI_SERVICE_TYPE=huawei
export HUAWEI_ENDPOINT_URL=https://your-region.modelarts.huaweicloud.com/v1/infers/your-endpoint-id
export HUAWEI_API_KEY=your-huawei-api-key
```

### **6. Test Etme**

```bash
# AI servisini başlat
python huggingface_ai_server.py

# Test isteği
curl -X POST "http://localhost:9000/score" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 41.0082,
    "lon": 28.9784,
    "hour_offset": 0,
    "features": {
      "temp": 25.5,
      "rh": 45.0,
      "wind": 8.2,
      "wind_dir": 180.0
    }
  }'
```

## 📊 **Maliyet Karşılaştırması**

| Servis | Ücretsiz Tier | Ücretli | Avantajlar |
|--------|---------------|---------|------------|
| **Hugging Face** | 1000 istek/gün | $0.001/istek | Hızlı, kolay |
| **Huawei ModelArts** | 1000 istek/ay | $0.01/istek | Özelleştirilebilir, güçlü |

## 🔄 **Geçiş Stratejisi**

1. **Şimdi**: Hugging Face ile test
2. **Model hazır**: Huawei Cloud'a deploy
3. **Production**: Huawei Cloud kullan
4. **Fallback**: Hugging Face'e geri dön

## 🛠️ **Gelişmiş Özellikler**

### **A. Model Versiyonlama**
```python
# ModelArts'te farklı versiyonlar
v1.0: Basit model
v1.1: Gelişmiş özellikler
v2.0: Deep learning model
```

### **B. A/B Testing**
```python
# Farklı modelleri test et
model_a = "fire_risk_v1"
model_b = "fire_risk_v2"
```

### **C. Monitoring**
```python
# Model performansını izle
- Accuracy
- Latency
- Error rate
- Cost per prediction
```

## 📞 **Destek**

- [Huawei Cloud Documentation](https://www.huaweicloud.com/en-us/product/modelarts.html)
- [ModelArts API Reference](https://support.huaweicloud.com/api-modelarts/)
- [Community Forum](https://bbs.huaweicloud.com/forum/forum-1072-1.html)
