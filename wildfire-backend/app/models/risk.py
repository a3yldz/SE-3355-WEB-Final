from pydantic import BaseModel
from typing import List, Dict, Any

class PolygonRequest(BaseModel):
    type: str
    geometry: Dict[str, Any]
    properties: Dict[str, Any]

class RiskPoint(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: Dict[str, Any]

class RiskResponse(BaseModel):
    type: str = "FeatureCollection"
    features: List[RiskPoint]
