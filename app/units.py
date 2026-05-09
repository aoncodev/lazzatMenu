WEIGHT_TO_GRAMS = {"g": 1, "kg": 1000}
VOLUME_TO_ML = {"ml": 1, "L": 1000, "l": 1000}
COUNT_UNITS = {"piece", "pcs", "ea"}

WEIGHT_UNITS = set(WEIGHT_TO_GRAMS.keys())
VOLUME_UNITS = set(VOLUME_TO_ML.keys())

CATEGORY_UNITS = {
    "weight": WEIGHT_UNITS,
    "volume": VOLUME_UNITS,
    "count": COUNT_UNITS,
}


def to_base(quantity: float, unit: str, category: str) -> float:
    if category == "weight":
        return quantity * WEIGHT_TO_GRAMS[unit]
    if category == "volume":
        return quantity * VOLUME_TO_ML[unit]
    if category == "count":
        return quantity
    raise ValueError(f"unknown category {category}")


def validate_unit(unit: str, category: str) -> None:
    allowed = CATEGORY_UNITS.get(category)
    if allowed is None:
        raise ValueError(f"unknown category {category}")
    if unit not in allowed:
        raise ValueError(f"unit '{unit}' not valid for category '{category}', must be one of {allowed}")
