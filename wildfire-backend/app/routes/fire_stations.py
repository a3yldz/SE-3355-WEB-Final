from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.deps import get_db
from app.schemas.fire_station import FireStationCreate, FireStationUpdate, FireStationResponse
from app.controllers import fire_station_controller

router = APIRouter(prefix="/fire-stations", tags=["Fire Stations"])

@router.post("", response_model=FireStationResponse)
def create_fire_station(data: FireStationCreate, db: Session = Depends(get_db)):
    """Yeni itfaiye istasyonu oluştur"""
    return fire_station_controller.handle_create_fire_station(db, data)

@router.get("", response_model=List[FireStationResponse])
def get_fire_stations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Tüm itfaiye istasyonlarını getir"""
    return fire_station_controller.handle_get_fire_stations(db, skip, limit)

@router.get("/{station_id}", response_model=FireStationResponse)
def get_fire_station(station_id: UUID, db: Session = Depends(get_db)):
    """ID ile itfaiye istasyonu getir"""
    return fire_station_controller.handle_get_fire_station(db, station_id)

@router.put("/{station_id}", response_model=FireStationResponse)
def update_fire_station(station_id: UUID, data: FireStationUpdate, db: Session = Depends(get_db)):
    """İtfaiye istasyonunu güncelle"""
    return fire_station_controller.handle_update_fire_station(db, station_id, data)

@router.delete("/{station_id}")
def delete_fire_station(station_id: UUID, db: Session = Depends(get_db)):
    """İtfaiye istasyonunu sil"""
    return fire_station_controller.handle_delete_fire_station(db, station_id)
