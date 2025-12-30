from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal

# Request schemas
class FireStationCreate(BaseModel):
    name: str
    district: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    status: Optional[str] = "available"

class FireStationUpdate(BaseModel):
    name: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    status: Optional[str] = None

# Response schemas
class FireStationResponse(BaseModel):
    id: UUID
    name: str
    district: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
