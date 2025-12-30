import math
import numpy as np
from shapely.geometry import shape, Point
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio
import httpx
import os

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "e7e87950d4cbef19404e95fbad64d7d3")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"
ELEVATION_API_URL = "https://api.open-elevation.com/api/v1/lookup"
ROBOFLOW_API_URL = "https://detect.roboflow.com"
ROBOFLOW_API_KEY = "XoNbKefV5xjEal7LJ744"
ROBOFLOW_MODEL_ID = "smoke-detection-5tkur/3"

