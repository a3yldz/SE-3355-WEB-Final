from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.models.fire_report import FireReport
from app.schemas.fire_report import FireReportCreate, FireReportUpdate

def create_fire_report(db: Session, data: FireReportCreate) -> FireReport:
    """Yeni yangın raporu oluştur"""
    report = FireReport(
        title=data.title,
        description=data.description,
        location=data.location,
        image_url=data.image_url,
        user_id=data.user_id
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

def get_fire_reports(db: Session, skip: int = 0, limit: int = 100) -> List[FireReport]:
    """Tüm yangın raporlarını getir"""
    return db.query(FireReport).offset(skip).limit(limit).all()

def get_fire_report_by_id(db: Session, report_id: int) -> Optional[FireReport]:
    """ID ile yangın raporu getir"""
    return db.query(FireReport).filter(FireReport.id == report_id).first()

def update_fire_report(db: Session, report_id: int, data: FireReportUpdate) -> Optional[FireReport]:
    """Yangın raporunu güncelle"""
    report = get_fire_report_by_id(db, report_id)
    if not report:
        return None
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(report, key, value)
    
    db.commit()
    db.refresh(report)
    return report

def delete_fire_report(db: Session, report_id: int) -> bool:
    """Yangın raporunu sil"""
    report = get_fire_report_by_id(db, report_id)
    if not report:
        return False
    
    db.delete(report)
    db.commit()
    return True
