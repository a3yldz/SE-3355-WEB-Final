from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.deps import get_db
from app.schemas.fire_report import FireReportCreate, FireReportUpdate, FireReportResponse
from app.controllers import fire_report_controller

router = APIRouter(prefix="/fire-reports", tags=["Fire Reports"])

@router.post("", response_model=FireReportResponse)
def create_fire_report(data: FireReportCreate, db: Session = Depends(get_db)):
    """Yeni yangın raporu oluştur"""
    return fire_report_controller.handle_create_fire_report(db, data)

@router.get("", response_model=List[FireReportResponse])
def get_fire_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Tüm yangın raporlarını getir"""
    return fire_report_controller.handle_get_fire_reports(db, skip, limit)

@router.get("/{report_id}", response_model=FireReportResponse)
def get_fire_report(report_id: int, db: Session = Depends(get_db)):
    """ID ile yangın raporu getir"""
    return fire_report_controller.handle_get_fire_report(db, report_id)

@router.put("/{report_id}", response_model=FireReportResponse)
def update_fire_report(report_id: int, data: FireReportUpdate, db: Session = Depends(get_db)):
    """Yangın raporunu güncelle"""
    return fire_report_controller.handle_update_fire_report(db, report_id, data)

@router.delete("/{report_id}")
def delete_fire_report(report_id: int, db: Session = Depends(get_db)):
    """Yangın raporunu sil"""
    return fire_report_controller.handle_delete_fire_report(db, report_id)
