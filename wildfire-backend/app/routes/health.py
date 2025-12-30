from fastapi import APIRouter
import time

router = APIRouter()

@router.get("/health")
async def health():
    return {"ok": True, "ts": time.time()}
