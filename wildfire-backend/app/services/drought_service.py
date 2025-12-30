from datetime import datetime

class DroughtService:
    def calculate_consecutive_dry_days(self, forecast_list: list) -> int:
        now_ts = datetime.utcnow().timestamp()
        dry_days = 0
        sorted_forecasts = sorted([f for f in forecast_list if f['dt'] <= now_ts], key=lambda x: x['dt'], reverse=True)
        for forecast in sorted_forecasts:
            if forecast.get('rain', {}).get('3h', 0) == 0:
                dry_days += 1
            else:
                break
        return dry_days // 8
    def get_drought_factor(self, dry_days: int) -> float:
        if dry_days <= 2:
            return 1.0
        return min(1.4, 1.0 + ((dry_days - 2) / 5) * 0.4)
