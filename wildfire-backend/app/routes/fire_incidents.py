from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.deps import get_db
from app.schemas.fire_incident import FireIncidentCreate, FireIncidentUpdate, FireIncidentResponse
from app.controllers import fire_incident_controller

router = APIRouter(prefix="/fire-incidents", tags=["Fire Incidents"])

@router.post("", response_model=FireIncidentResponse)
def create_fire_incident(data: FireIncidentCreate, db: Session = Depends(get_db)):
    """Yeni yangın olayı oluştur"""
    return fire_incident_controller.handle_create_fire_incident(db, data)

@router.get("", response_model=List[FireIncidentResponse])
def get_fire_incidents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Tüm yangın olaylarını getir"""
    return fire_incident_controller.handle_get_fire_incidents(db, skip, limit)

@router.get("/{incident_id}", response_model=FireIncidentResponse)
def get_fire_incident(incident_id: UUID, db: Session = Depends(get_db)):
    """ID ile yangın olayı getir"""
    return fire_incident_controller.handle_get_fire_incident(db, incident_id)

@router.put("/{incident_id}", response_model=FireIncidentResponse)
def update_fire_incident(incident_id: UUID, data: FireIncidentUpdate, db: Session = Depends(get_db)):
    """Yangın olayını güncelle"""
    return fire_incident_controller.handle_update_fire_incident(db, incident_id, data)

@router.delete("/{incident_id}")
def delete_fire_incident(incident_id: UUID, db: Session = Depends(get_db)):
    """Yangın olayını sil"""
    return fire_incident_controller.handle_delete_fire_incident(db, incident_id)
