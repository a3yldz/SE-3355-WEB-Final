import math
from typing import List, Tuple

def inverse_distance_weighting(target_point: tuple, data_points: list, power=2) -> float:
    numerator, denominator = 0, 0
    for lon, lat, value in data_points:
        distance = math.sqrt((target_point[0] - lon)**2 + (target_point[1] - lat)**2)
        if distance == 0:
            return value
        weight = 1.0 / (distance ** power)
        numerator += weight * value
        denominator += weight
    return numerator / denominator if denominator else 0
