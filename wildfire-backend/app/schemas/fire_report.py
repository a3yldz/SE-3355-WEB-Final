from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

# Request schemas
class FireReportCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    user_id: Optional[UUID] = None  # Arkadaş auth yapınca zorunlu olacak

class FireReportUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[str] = None

# Response schemas
class FireReportResponse(BaseModel):
    id: int
    user_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # SQLAlchemy model -> Pydantic
