from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.models.fire_incident import FireIncident
from app.schemas.fire_incident import FireIncidentCreate, FireIncidentUpdate

def create_fire_incident(db: Session, data: FireIncidentCreate) -> FireIncident:
    """Yeni yangın olayı oluştur"""
    incident = FireIncident(
        address=data.address,
        district=data.district,
        latitude=data.latitude,
        longitude=data.longitude,
        status=data.status,
        reported_by=data.reported_by,
        assigned_station_id=data.assigned_station_id
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident

def get_fire_incidents(db: Session, skip: int = 0, limit: int = 100) -> List[FireIncident]:
    """Tüm yangın olaylarını getir"""
    return db.query(FireIncident).offset(skip).limit(limit).all()

def get_fire_incident_by_id(db: Session, incident_id: UUID) -> Optional[FireIncident]:
    """ID ile yangın olayı getir"""
    return db.query(FireIncident).filter(FireIncident.id == incident_id).first()

def update_fire_incident(db: Session, incident_id: UUID, data: FireIncidentUpdate) -> Optional[FireIncident]:
    """Yangın olayını güncelle"""
    incident = get_fire_incident_by_id(db, incident_id)
    if not incident:
        return None
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(incident, key, value)
    
    db.commit()
    db.refresh(incident)
    return incident

def delete_fire_incident(db: Session, incident_id: UUID) -> bool:
    """Yangın olayını sil"""
    incident = get_fire_incident_by_id(db, incident_id)
    if not incident:
        return False
    
    db.delete(incident)
    db.commit()
    return True
