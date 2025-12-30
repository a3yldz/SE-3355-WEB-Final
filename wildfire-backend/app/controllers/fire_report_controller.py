from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.schemas.fire_report import FireReportCreate, FireReportUpdate
from app.services import fire_report_service

def handle_create_fire_report(db: Session, data: FireReportCreate):
    """Create fire report - controller logic"""
    return fire_report_service.create_fire_report(db, data)

def handle_get_fire_reports(db: Session, skip: int = 0, limit: int = 100):
    """Get all fire reports - controller logic"""
    return fire_report_service.get_fire_reports(db, skip, limit)

def handle_get_fire_report(db: Session, report_id: int):
    """Get single fire report - controller logic"""
    report = fire_report_service.get_fire_report_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Fire report not found")
    return report

def handle_update_fire_report(db: Session, report_id: int, data: FireReportUpdate):
    """Update fire report - controller logic"""
    report = fire_report_service.update_fire_report(db, report_id, data)
    if not report:
        raise HTTPException(status_code=404, detail="Fire report not found")
    return report

def handle_delete_fire_report(db: Session, report_id: int):
    """Delete fire report - controller logic"""
    success = fire_report_service.delete_fire_report(db, report_id)
    if not success:
        raise HTTPException(status_code=404, detail="Fire report not found")
    return {"message": "Fire report deleted successfully"}
