"""Price estimation features.

Deterministic, dependency-light estimator for the Moroccan used-car market.
It replaces the original TensorFlow based model so the pipeline can run
reliably without a multi-GB model runtime. Accuracy work comes later; this
always returns a plausible price for any valid request.
"""

import logging
from datetime import datetime

logger = logging.getLogger("ml-service")

CURRENT_YEAR = datetime.now().year

# Base market price (MAD) for a 2025 car per brand — rough 2023 Moroccan
# market references. Unknown brands get the median baseline.
BRAND_BASE_PRICE = {
    "dacia": 130000,
    "kia": 145000,
    "hyundai": 165000,
    "renault": 160000,
    "peugeot": 180000,
    "citroen": 175000,
    "seat": 185000,
    "volkswagen": 230000,
    "skoda": 200000,
    "ford": 200000,
    "opel": 190000,
    "toyota": 250000,
    "honda": 240000,
    "nissan": 210000,
    "mazda": 230000,
    "audi": 420000,
    "bmw": 480000,
    "mercedes": 520000,
    "mercedes-benz": 520000,
    "volvo": 380000,
    "land rover": 500000,
    "jeep": 320000,
    "range rover": 650000,
    "porsche": 900000,
    "mg": 190000,
    "fiat": 150000,
}

FUEL_FACTOR = {"diesel": 1.04, "hybride": 1.10, "hybrid": 1.10, "essence": 1.0, "gaz": 1.0}
TRANSMISSION_FACTOR = {"automatique": 1.08, "automatic": 1.08, "manuelle": 1.0, "manual": 1.0}
CONDITION_FACTOR = {"neuf": 1.25, "nouveau": 1.25, "bon": 1.0, "très bon": 1.05, "acceptable": 0.9, "occasion": 1.0}
OWNER_FACTOR = {"oui": 1.05, "non": 1.0, "true": 1.05, "1": 1.05}


def _as_float(value, default):
    try:
        if value in (None, "", "nan", "NaN", "None"):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalise(value, default=""):
    if value is None:
        return default
    return str(value).strip().lower()


def estimate_price(data: dict) -> float:
    """Rule-based estimate: base price adjusted by age, mileage and options."""
    brand = _normalise(data.get("brand"))
    condition = _normalise(data.get("condition"))
    fuel = _normalise(data.get("fuel_type"))
    transmission = _normalise(data.get("transmission"))
    first_owner = _normalise(data.get("first_owner"))

    year = _as_float(data.get("year"), CURRENT_YEAR)
    mileage = _as_float(data.get("mileage"), 100000)
    fiscal_power = _as_float(data.get("fiscal_power"), 6)
    door_count = _as_float(data.get("door_count"), 5)

    base = BRAND_BASE_PRICE.get(brand, 185000)

    # Age depreciation: ~7%/year, capped so very old cars still have a floor.
    age = max(0, CURRENT_YEAR - year)
    price = base * (1 - 0.07 * min(age, 15))
    price = max(price, 25000)

    # Mileage depreciation: ~0.9 MAD per km above a 60k baseline.
    price -= max(0, mileage - 60000) * 0.9

    price *= FUEL_FACTOR.get(fuel, 1.0)
    price *= TRANSMISSION_FACTOR.get(transmission, 1.0)
    price *= CONDITION_FACTOR.get(condition, 1.0)
    price *= OWNER_FACTOR.get(first_owner, 1.0)

    # Fiscal power and door count give small nudges.
    price *= 1 + (fiscal_power - 6) * 0.01
    price *= 1 + (door_count - 5) * 0.005

    # Keep within a sane MAD range and round to the nearest 1000.
    price = min(max(price, 15000), 5000000)
    return round(price / 1000.0) * 1000.0
