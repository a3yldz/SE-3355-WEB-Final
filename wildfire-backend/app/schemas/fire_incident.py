from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal

# Request schemas
class FireIncidentCreate(BaseModel):
    address: Optional[str] = None
    district: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    status: Optional[str] = "active"
    reported_by: Optional[UUID] = None
    assigned_station_id: Optional[UUID] = None

class FireIncidentUpdate(BaseModel):
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    status: Optional[str] = None
    assigned_station_id: Optional[UUID] = None

# Response schemas
class FireIncidentResponse(BaseModel):
    id: UUID
    address: Optional[str] = None
    district: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    status: str
    reported_by: Optional[UUID] = None
    assigned_station_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True
