from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.services.smoke_service import detect_smoke_service
from app.deps import get_db
from app.schemas.smoke_detection import SmokeDetectionResponse
from app.controllers import smoke_detection_controller

router = APIRouter(tags=["Smoke Detection"])

@router.post("/smoke/detect")
async def detect_smoke(
    file: UploadFile = File(...),
    latitude: Optional[float] = Query(None, description="Tespit konumu - enlem"),
    longitude: Optional[float] = Query(None, description="Tespit konumu - boylam"),
    district: Optional[str] = Query(None, description="İlçe/bölge adı"),
    db: Session = Depends(get_db)
):
    """
    Duman tespiti yap (Roboflow AI)
    
    - Fotoğrafı AI'a gönderir
    - Sonucu smoke_detections tablosuna kaydeder
    - Risk > 50% ise otomatik fire_report oluşturur
    """
    try:
        return await detect_smoke_service(file, db, latitude, longitude, district)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smoke detection failed: {str(e)}")

@router.get("/smoke/detections", response_model=List[SmokeDetectionResponse])
def get_smoke_detections(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Tüm duman tespitlerini getir"""
    return smoke_detection_controller.handle_get_smoke_detections(db, skip, limit)

@router.get("/smoke/detections/{detection_id}", response_model=SmokeDetectionResponse)
def get_smoke_detection(detection_id: UUID, db: Session = Depends(get_db)):
    """ID ile duman tespiti getir"""
    return smoke_detection_controller.handle_get_smoke_detection(db, detection_id)
