from sqlalchemy.orm import Session
from fastapi import HTTPException
from uuid import UUID
from app.schemas.fire_station import FireStationCreate, FireStationUpdate
from app.services import fire_station_service

def handle_create_fire_station(db: Session, data: FireStationCreate):
    """Create fire station - controller logic"""
    return fire_station_service.create_fire_station(db, data)

def handle_get_fire_stations(db: Session, skip: int = 0, limit: int = 100):
    """Get all fire stations - controller logic"""
    return fire_station_service.get_fire_stations(db, skip, limit)

def handle_get_fire_station(db: Session, station_id: UUID):
    """Get single fire station - controller logic"""
    station = fire_station_service.get_fire_station_by_id(db, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Fire station not found")
    return station

def handle_update_fire_station(db: Session, station_id: UUID, data: FireStationUpdate):
    """Update fire station - controller logic"""
    station = fire_station_service.update_fire_station(db, station_id, data)
    if not station:
        raise HTTPException(status_code=404, detail="Fire station not found")
    return station

def handle_delete_fire_station(db: Session, station_id: UUID):
    """Delete fire station - controller logic"""
    success = fire_station_service.delete_fire_station(db, station_id)
    if not success:
        raise HTTPException(status_code=404, detail="Fire station not found")
    return {"message": "Fire station deleted successfully"}
