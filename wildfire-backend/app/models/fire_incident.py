from sqlalchemy import Column, String, DateTime, ForeignKey, DECIMAL
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db import Base

class FireIncident(Base):
    __tablename__ = "fire_incidents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    address = Column(String(255))
    district = Column(String(100), nullable=False)
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    status = Column(String(20), default="active")
    reported_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    assigned_station_id = Column(UUID(as_uuid=True), ForeignKey("fire_stations.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    reported_by_user = relationship("User", back_populates="fire_incidents")
    assigned_station = relationship("FireStation", back_populates="fire_incidents")
