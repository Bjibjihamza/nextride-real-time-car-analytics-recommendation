import logging
import os
import random
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "serving"))
from pg_db import get_conn  # noqa: E402

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

conn = get_conn()

try:
    with conn.cursor() as cur:
        cur.execute("SELECT brand FROM cars WHERE brand IS NOT NULL AND brand != ''")
        brands = sorted({row['brand'].strip() for row in cur.fetchall() if row['brand'].strip()})
    if not brands:
        logger.warning("No valid brands. Using defaults.")
        brands = ['Toyota', 'BMW', 'Mercedes', 'Volkswagen', 'Hyundai', 'Ford', 'Dacia']
    logger.info(f"Retrieved {len(brands)} unique brands")
except Exception as e:
    logger.error(f"Failed to fetch brands: {e}")
    brands = ['Toyota', 'BMW', 'Mercedes', 'Volkswagen', 'Hyundai', 'Ford', 'Dacia']

fuel_types = ['hybride', 'essence', 'diesel']
transmissions = ['manuelle', 'automatique']
door_counts = [3, 5, 7]

try:
    with conn.cursor() as cur:
        cur.execute("SELECT user_id FROM user_preferences")
        user_ids = [row['user_id'] for row in cur.fetchall()]
    if not user_ids:
        logger.error("No user_ids found.")
        raise ValueError("No user_ids")
    logger.info(f"Found {len(user_ids)} user_ids")
except Exception as e:
    logger.error(f"Failed to fetch user_ids: {e}")
    raise


def generate_user_preference(user_id):
    budget_min = round(random.randint(20000, 100000) / 1000) * 1000
    budget_max = round(random.randint(budget_min + 10000, 500000) / 1000) * 1000

    mileage_min = random.randint(0, 100000)
    mileage_max = random.randint(mileage_min + 10000, 300000)

    year_min = random.randint(2000, 2020)
    year_max = random.randint(year_min + 1, 2025)

    return {
        'user_id': user_id,
        'preferred_brands': list(random.sample(brands, k=random.randint(1, min(3, len(brands))))),
        'preferred_fuel_types': list(random.sample(fuel_types, k=random.randint(1, 2))),
        'preferred_transmissions': list(random.sample(transmissions, k=1)),
        'budget_min': budget_min,
        'budget_max': budget_max,
        'preferred_door_count': list(random.sample(door_counts, k=random.randint(1, 2))),
        'mileage_min': mileage_min,
        'mileage_max': mileage_max,
        'preferred_years': [year_min, year_max],
        'last_updated': datetime.now(timezone.utc)
    }


def update_user_preference(preference):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE user_preferences
                   SET preferred_brands = %s,
                       preferred_fuel_types = %s,
                       preferred_transmissions = %s,
                       budget_min = %s,
                       budget_max = %s,
                       preferred_door_count = %s,
                       mileage_min = %s,
                       mileage_max = %s,
                       preferred_years = %s,
                       last_updated = %s
                   WHERE user_id = %s""",
                (preference['preferred_brands'],
                 preference['preferred_fuel_types'],
                 preference['preferred_transmissions'],
                 preference['budget_min'],
                 preference['budget_max'],
                 preference['preferred_door_count'],
                 preference['mileage_min'],
                 preference['mileage_max'],
                 preference['preferred_years'],
                 preference['last_updated'],
                 preference['user_id'])
            )
        conn.commit()
        logger.info(f"Updated user_id {preference['user_id']}")
    except Exception as e:
        logger.error(f"Failed to update user_id {preference['user_id']}: {e}")
        raise


def main():
    try:
        for user_id in user_ids:
            preference = generate_user_preference(user_id)
            update_user_preference(preference)
        logger.info(f"Updated {len(user_ids)} users")
    except Exception as e:
        logger.error(f"Error: {e}")
        raise


if __name__ == "__main__":
    try:
        main()
    finally:
        conn.close()
