import os
import httpx
from fastapi import UploadFile
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Optional

from app.models.smoke_detection import SmokeDetection
from app.models.fire_report import FireReport

ROBOFLOW_API_URL = "https://detect.roboflow.com"
ROBOFLOW_API_KEY = "XoNbKefV5xjEal7LJ744"
ROBOFLOW_MODEL_ID = "smoke-detection-5tkur/3"

# Risk threshold for auto-creating fire report (50%)
AUTO_REPORT_THRESHOLD = 0.5

async def detect_smoke_service(
    file: UploadFile,
    db: Optional[Session] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    district: Optional[str] = None
):
    """
    Smoke detection service:
    1. Send image to Roboflow AI
    2. Save result to smoke_detections table
    3. If risk > 50%, auto-create fire_report
    """
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
    detection_id = None
    report_created = False
    report_id = None
    
    # Save to database if session provided
    if db:
        # 1. Save smoke detection
        smoke_detection = SmokeDetection(
            image_url=file.filename or "uploaded_image.jpg",
            latitude=Decimal(str(latitude)) if latitude else None,
            longitude=Decimal(str(longitude)) if longitude else None,
            district=district,
            risk_score=Decimal(str(max_confidence)),
            status="confirmed" if max_confidence > AUTO_REPORT_THRESHOLD else "pending"
        )
        db.add(smoke_detection)
        db.commit()
        db.refresh(smoke_detection)
        detection_id = str(smoke_detection.id)
        
        # 2. Auto-create fire report if risk > threshold
        if max_confidence > AUTO_REPORT_THRESHOLD:
            fire_report = FireReport(
                title=f"Otomatik Duman Tespiti - Risk: {risk_score:.1f}%",
                description=f"AI tarafından tespit edildi. Confidence: {max_confidence:.2f}. Tespit sayısı: {len(detections)}",
                location=district or "Bilinmeyen konum",
                image_url=file.filename,
                status="pending"
            )
            db.add(fire_report)
            db.commit()
            db.refresh(fire_report)
            report_created = True
            report_id = fire_report.id
    
    return {
        "success": True,
        "risk_score": risk_score,
        "confidence": max_confidence,
        "detections": detections,
        "detection_count": len(detections),
        "detection_id": detection_id,
        "report_created": report_created,
        "report_id": report_id,
        "raw_result": result
    }

