from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.models.fire_station import FireStation
from app.schemas.fire_station import FireStationCreate, FireStationUpdate

def create_fire_station(db: Session, data: FireStationCreate) -> FireStation:
    """Yeni itfaiye istasyonu oluştur"""
    station = FireStation(
        name=data.name,
        district=data.district,
        latitude=data.latitude,
        longitude=data.longitude,
        status=data.status
    )
    db.add(station)
    db.commit()
    db.refresh(station)
    return station

def get_fire_stations(db: Session, skip: int = 0, limit: int = 100) -> List[FireStation]:
    """Tüm itfaiye istasyonlarını getir"""
    return db.query(FireStation).offset(skip).limit(limit).all()

def get_fire_station_by_id(db: Session, station_id: UUID) -> Optional[FireStation]:
    """ID ile itfaiye istasyonu getir"""
    return db.query(FireStation).filter(FireStation.id == station_id).first()

def update_fire_station(db: Session, station_id: UUID, data: FireStationUpdate) -> Optional[FireStation]:
    """İtfaiye istasyonunu güncelle"""
    station = get_fire_station_by_id(db, station_id)
    if not station:
        return None
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(station, key, value)
    
    db.commit()
    db.refresh(station)
    return station

def delete_fire_station(db: Session, station_id: UUID) -> bool:
    """İtfaiye istasyonunu sil"""
    station = get_fire_station_by_id(db, station_id)
    if not station:
        return False
    
    db.delete(station)
    db.commit()
    return True
