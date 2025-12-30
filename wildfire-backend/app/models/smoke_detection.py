from sqlalchemy import Column, String, DateTime, DECIMAL, Text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.db import Base

class SmokeDetection(Base):
    __tablename__ = "smoke_detections"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    image_url = Column(Text, nullable=False)
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    district = Column(String(100))
    risk_score = Column(DECIMAL(4, 3))
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
