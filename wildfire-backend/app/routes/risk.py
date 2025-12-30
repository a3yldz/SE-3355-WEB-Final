from fastapi import APIRouter, HTTPException
from app.models.risk import PolygonRequest, RiskResponse
from app.services.risk_service import get_risk_nowcast_for_polygon_service

router = APIRouter()

@router.post("/risk/nowcast_by_polygon", response_model=RiskResponse)
async def get_risk_nowcast_for_polygon(polygon_request: PolygonRequest, hourOffset: int = 0, provider: str = "hyper_model_vpd", version: int = 7):
    return await get_risk_nowcast_for_polygon_service(polygon_request, hourOffset, provider, version)
