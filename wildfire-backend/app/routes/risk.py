from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models.risk import PolygonRequest, RiskResponse
from app.services.risk_service import get_risk_nowcast_for_polygon_service
from app.deps import get_db

router = APIRouter()

@router.post("/risk/nowcast_by_polygon", response_model=RiskResponse)
async def get_risk_nowcast_for_polygon(
    polygon_request: PolygonRequest, 
    hourOffset: int = 0, 
    provider: str = "hyper_model_vpd", 
    version: int = 7,
    db: Session = Depends(get_db)
):
    """
    Risk hesaplama endpoint'i.
    Risk > 70% ise otomatik fire_incident oluşturur.
    """
    return await get_risk_nowcast_for_polygon_service(polygon_request, hourOffset, provider, version, db)

