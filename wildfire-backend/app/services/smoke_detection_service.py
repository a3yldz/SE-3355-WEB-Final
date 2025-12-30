from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.models.smoke_detection import SmokeDetection
from app.schemas.smoke_detection import SmokeDetectionCreate

def create_smoke_detection(db: Session, data: SmokeDetectionCreate) -> SmokeDetection:
    """Yeni duman tespiti kaydı oluştur"""
    detection = SmokeDetection(
        image_url=data.image_url,
        latitude=data.latitude,
        longitude=data.longitude,
        district=data.district,
        risk_score=data.risk_score,
        status=data.status
    )
    db.add(detection)
    db.commit()
    db.refresh(detection)
    return detection

def get_smoke_detections(db: Session, skip: int = 0, limit: int = 100) -> List[SmokeDetection]:
    """Tüm duman tespitlerini getir"""
    return db.query(SmokeDetection).offset(skip).limit(limit).all()

def get_smoke_detection_by_id(db: Session, detection_id: UUID) -> Optional[SmokeDetection]:
    """ID ile duman tespiti getir"""
    return db.query(SmokeDetection).filter(SmokeDetection.id == detection_id).first()
