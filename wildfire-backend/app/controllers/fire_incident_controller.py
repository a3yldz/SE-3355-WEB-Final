from sqlalchemy.orm import Session
from fastapi import HTTPException
from uuid import UUID
from app.schemas.fire_incident import FireIncidentCreate, FireIncidentUpdate
from app.services import fire_incident_service

def handle_create_fire_incident(db: Session, data: FireIncidentCreate):
    """Create fire incident - controller logic"""
    return fire_incident_service.create_fire_incident(db, data)

def handle_get_fire_incidents(db: Session, skip: int = 0, limit: int = 100):
    """Get all fire incidents - controller logic"""
    return fire_incident_service.get_fire_incidents(db, skip, limit)

def handle_get_fire_incident(db: Session, incident_id: UUID):
    """Get single fire incident - controller logic"""
    incident = fire_incident_service.get_fire_incident_by_id(db, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Fire incident not found")
    return incident

def handle_update_fire_incident(db: Session, incident_id: UUID, data: FireIncidentUpdate):
    """Update fire incident - controller logic"""
    incident = fire_incident_service.update_fire_incident(db, incident_id, data)
    if not incident:
        raise HTTPException(status_code=404, detail="Fire incident not found")
    return incident

def handle_delete_fire_incident(db: Session, incident_id: UUID):
    """Delete fire incident - controller logic"""
    success = fire_incident_service.delete_fire_incident(db, incident_id)
    if not success:
        raise HTTPException(status_code=404, detail="Fire incident not found")
    return {"message": "Fire incident deleted successfully"}
