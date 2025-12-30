import numpy as np
import asyncio
from shapely.geometry import shape, Point
from app.services.topography_service import TopographyService
from app.services.drought_service import DroughtService
from app.services.weather_service import OpenWeatherService
from app.services.risk_calculator import AdvancedFireRiskCalculator
from app.utils.interpolation import inverse_distance_weighting
from app.models.risk import RiskPoint, RiskResponse

weather_service = OpenWeatherService()
risk_calculator = AdvancedFireRiskCalculator()
topography_service = TopographyService()
drought_service = DroughtService()

async def get_risk_nowcast_for_polygon_service(polygon_request, hourOffset, provider, version):
    polygon = shape(polygon_request.geometry)
    min_lon, min_lat, max_lon, max_lat = polygon.bounds
    slope_factor_task = topography_service.get_slope_factor((min_lon, min_lat, max_lon, max_lat))
    center_lon, center_lat = polygon.centroid.x, polygon.centroid.y
    main_forecast_task = weather_service.get_forecast(center_lat, center_lon)
    slope_factor, main_forecast = await asyncio.gather(slope_factor_task, main_forecast_task)
    dry_days = drought_service.calculate_consecutive_dry_days(main_forecast['list']) if main_forecast and 'list' in main_forecast else 0
    drought_factor = drought_service.get_drought_factor(dry_days)
    strategic_points = [(min_lon, min_lat), (max_lon, min_lat), (min_lon, max_lat), (max_lon, max_lat), (center_lon, center_lat)]
    forecast_results = await asyncio.gather(*[weather_service.get_forecast(lat, lon) for lon, lat in strategic_points])
    processed_points = []
    for i, forecast in enumerate(forecast_results):
        if forecast:
            target_weather = weather_service.find_forecast_for_offset(forecast, hourOffset)
            if target_weather:
                features = weather_service.extract_weather_features(target_weather, strategic_points[i][1], strategic_points[i][0])
                processed_points.append({'lon': strategic_points[i][0], 'lat': strategic_points[i][1], 'features': features})
    if not processed_points:
        return RiskResponse(features=[])
    data_sets = {key: [(p['lon'], p['lat'], p['features'][key]) for p in processed_points]
                 for key in ["temperature_c", "relative_humidity", "wind_speed_ms", "wind_direction"]}
    nx, ny = 20, 20
    lon_points = np.linspace(min_lon, max_lon, nx)
    lat_points = np.linspace(min_lat, max_lat, ny)
    risk_features_to_add = []
    for p_lon in lon_points:
        for p_lat in lat_points:
            if Point(p_lon, p_lat).within(polygon):
                point_features = weather_service.extract_weather_features({}, p_lat, p_lon)
                for key, data in data_sets.items():
                    point_features[key] = inverse_distance_weighting((p_lon, p_lat), data)
                risk_value = risk_calculator.calculate_risk(point_features, slope_factor, drought_factor)
                risk_features_to_add.append(RiskPoint(
                    geometry={"type": "Point", "coordinates": [p_lon, p_lat]},
                    properties={
                        "risk": round(risk_value, 2), "temp": round(point_features['temperature_c'], 1),
                        "rh": int(point_features['relative_humidity']), "wind": round(point_features['wind_speed_ms'], 1),
                        "wind_dir": int(point_features.get('wind_direction', 0)),
                        "fuel_moisture": round(point_features.get('fuel_moisture', 0.5), 2),
                        "vegetation": point_features.get('vegetation_type', 'unknown'),
                        "slope_factor": round(slope_factor, 2), "drought_factor": round(drought_factor, 2),
                        "dry_days": dry_days, "provider": f"{provider}:v{version}"
                    }
                ))
    return RiskResponse(features=risk_features_to_add)
