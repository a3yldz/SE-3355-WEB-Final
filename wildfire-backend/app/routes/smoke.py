from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.smoke_service import detect_smoke_service

router = APIRouter()

@router.post("/smoke/detect")
async def detect_smoke(file: UploadFile = File(...)):
    try:
        return await detect_smoke_service(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smoke detection failed: {str(e)}")
