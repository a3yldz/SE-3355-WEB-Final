import os
import httpx
from fastapi import UploadFile

ROBOFLOW_API_URL = "https://detect.roboflow.com"
ROBOFLOW_API_KEY = "XoNbKefV5xjEal7LJ744"
ROBOFLOW_MODEL_ID = "smoke-detection-5tkur/3"

async def detect_smoke_service(file: UploadFile):
    contents = await file.read()
    detect_url = f"{ROBOFLOW_API_URL}/{ROBOFLOW_MODEL_ID}"
    params = {"api_key": ROBOFLOW_API_KEY}
    files = {"file": (file.filename or "upload.jpg", contents, file.content_type or "application/octet-stream")}
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(detect_url, params=params, files=files)
        response.raise_for_status()
        result = response.json()
    max_confidence = 0.0
    detections = []
    if result and "predictions" in result:
        for prediction in result["predictions"]:
            if "confidence" in prediction:
                confidence = prediction["confidence"]
                max_confidence = max(max_confidence, confidence)
                detections.append({
                    "confidence": confidence,
                    "class": prediction.get("class", "smoke"),
                    "bbox": prediction.get("bbox", {})
                })
    risk_score = max_confidence * 100
    return {
        "success": True,
        "risk_score": risk_score,
        "confidence": max_confidence,
        "detections": detections,
        "detection_count": len(detections),
        "raw_result": result
    }
