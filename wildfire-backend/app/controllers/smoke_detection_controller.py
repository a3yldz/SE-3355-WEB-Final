from sqlalchemy.orm import Session
from fastapi import HTTPException
from uuid import UUID
from app.schemas.smoke_detection import SmokeDetectionCreate
from app.services import smoke_detection_service

def handle_create_smoke_detection(db: Session, data: SmokeDetectionCreate):
    """Create smoke detection - controller logic"""
    return smoke_detection_service.create_smoke_detection(db, data)

def handle_get_smoke_detections(db: Session, skip: int = 0, limit: int = 100):
    """Get all smoke detections - controller logic"""
    return smoke_detection_service.get_smoke_detections(db, skip, limit)

def handle_get_smoke_detection(db: Session, detection_id: UUID):
    """Get single smoke detection - controller logic"""
    detection = smoke_detection_service.get_smoke_detection_by_id(db, detection_id)
    if not detection:
        raise HTTPException(status_code=404, detail="Smoke detection not found")
    return detection
