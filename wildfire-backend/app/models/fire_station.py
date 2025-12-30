from sqlalchemy import Column, String, DateTime, DECIMAL
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db import Base

class FireStation(Base):
    __tablename__ = "fire_stations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    district = Column(String(100), nullable=False)
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    status = Column(String(20), default="available")
    created_at = Column(DateTime, default=datetime.utcnow)
    fire_incidents = relationship("FireIncident", back_populates="assigned_station")
