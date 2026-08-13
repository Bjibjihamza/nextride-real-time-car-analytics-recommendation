import logging
import os
import random
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "serving"))
from pg_db import get_conn  # noqa: E402

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

conn = get_conn()

# Fetch user preferences
try:
    with conn.cursor() as cur:
        cur.execute("""SELECT user_id, preferred_brands, budget_max, budget_min,
                              mileage_max, mileage_min, preferred_door_count,
                              preferred_fuel_types, preferred_transmissions, preferred_years
                       FROM user_preferences""")
        user_preferences = {}
        for row in cur.fetchall():
            prefs = {
                'preferred_brands': row['preferred_brands'] or [],
                'budget_max': row['budget_max'],
                'budget_min': row['budget_min'],
                'mileage_max': row['mileage_max'],
                'mileage_min': row['mileage_min'],
                'preferred_door_count': row['preferred_door_count'] or [],
                'preferred_fuel_types': row['preferred_fuel_types'] or [],
                'preferred_transmissions': row['preferred_transmissions'] or [],
                'preferred_years': row['preferred_years'] or []
            }
            if prefs['preferred_brands'] and prefs['budget_max'] and prefs['budget_min']:
                user_preferences[row['user_id']] = prefs
    if not user_preferences:
        logger.error("No valid user preferences found.")
        raise ValueError("No user preferences")
    logger.info(f"Found {len(user_preferences)} user preferences")
except Exception as e:
    logger.error(f"Failed to fetch user preferences: {e}")
    raise

# Fetch all car ids from cars (fallback)
try:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM cars")
        all_car_ids = [row['id'] for row in cur.fetchall()]
    if not all_car_ids:
        logger.error("No car ids found in cars table.")
        raise ValueError("No car_ids")
    logger.info(f"Found {len(all_car_ids)} car_ids for fallback")
except Exception as e:
    logger.error(f"Failed to fetch car_ids: {e}")
    raise

# Fetch unique brands to validate preferred_brands
try:
    with conn.cursor() as cur:
        cur.execute("SELECT DISTINCT brand FROM cars WHERE brand IS NOT NULL AND brand != ''")
        valid_brands = {row['brand'].lower().replace('-', ' ') for row in cur.fetchall()}
    if not valid_brands:
        logger.warning("No brands found in cars. Skipping brand validation.")
    else:
        logger.info(f"Found {len(valid_brands)} unique brands in cars")
except Exception as e:
    logger.error(f"Failed to fetch brands: {e}")
    valid_brands = set()

view_sources = ['SEARCH', 'RECOMMENDATION', 'BROWSE', 'ADVERTISEMENT']


def get_car_ids_for_preferences(prefs):
    try:
        normalized_brands = [b.lower().replace('-', ' ') for b in prefs['preferred_brands'] if b.lower() != 'n/a']
        if valid_brands:
            normalized_brands = [b for b in normalized_brands if b in valid_brands]
        if not normalized_brands:
            logger.warning(f"No valid brands for {prefs['preferred_brands']}. Using fallback.")
            return all_car_ids

        conditions = []
        params = []

        if len(normalized_brands) == 1:
            conditions.append("LOWER(brand) = %s")
            params.append(normalized_brands[0])
        else:
            placeholders = ", ".join(["%s"] * len(normalized_brands))
            conditions.append(f"LOWER(brand) IN ({placeholders})")
            params.extend(normalized_brands)

        if prefs['budget_min'] is not None and prefs['budget_max'] is not None:
            conditions.append("price >= %s AND price <= %s")
            params.extend([prefs['budget_min'], prefs['budget_max']])

        if prefs['mileage_min'] is not None and prefs['mileage_max'] is not None:
            conditions.append("mileage >= %s AND mileage <= %s")
            params.extend([prefs['mileage_min'], prefs['mileage_max']])

        if prefs['preferred_door_count']:
            placeholders = ", ".join(["%s"] * len(prefs['preferred_door_count']))
            conditions.append(f"door_count IN ({placeholders})")
            params.extend(prefs['preferred_door_count'])

        if prefs['preferred_fuel_types']:
            placeholders = ", ".join(["%s"] * len(prefs['preferred_fuel_types']))
            conditions.append(f"fuel_type IN ({placeholders})")
            params.extend(prefs['preferred_fuel_types'])

        if prefs['preferred_transmissions']:
            placeholders = ", ".join(["%s"] * len(prefs['preferred_transmissions']))
            conditions.append(f"transmission IN ({placeholders})")
            params.extend(prefs['preferred_transmissions'])

        if prefs['preferred_years']:
            placeholders = ", ".join(["%s"] * len(prefs['preferred_years']))
            conditions.append(f"year IN ({placeholders})")
            params.extend(prefs['preferred_years'])

        where_clause = " AND ".join(conditions) if conditions else ""
        query_str = f"SELECT id FROM cars WHERE {where_clause}"
        with conn.cursor() as cur:
            cur.execute(query_str, params)
            car_ids = [row['id'] for row in cur.fetchall()]

        if not car_ids:
            logger.warning(f"No cars found for preferences {prefs}. Using fallback.")
            return all_car_ids
        return car_ids
    except Exception as e:
        logger.error(f"Failed to fetch car_ids for preferences {prefs}: {e}")
        return all_car_ids


def generate_car_view(user_id, preferences):
    days_ago = random.randint(0, 30)
    view_date = (datetime.now(timezone.utc) - timedelta(days=days_ago)).date()
    view_timestamp = datetime.combine(view_date, datetime.min.time()).replace(
        hour=random.randint(0, 23), minute=random.randint(0, 59),
        second=random.randint(0, 59), tzinfo=timezone.utc
    )
    car_ids = get_car_ids_for_preferences(preferences)
    return {
        'user_id': user_id,
        'view_date': view_date,
        'view_timestamp': view_timestamp,
        'car_id': random.choice(car_ids),
        'view_duration_seconds': random.randint(5, 300),
        'view_source': random.choice(view_sources)
    }


def insert_car_view(car_view):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO car_views_by_user (
                     user_id, view_date, view_timestamp, car_id,
                     view_duration_seconds, view_source
                   ) VALUES (%s, %s, %s, %s, %s, %s)""",
                (car_view['user_id'], car_view['view_date'], car_view['view_timestamp'],
                 car_view['car_id'], car_view['view_duration_seconds'], car_view['view_source'])
            )
        conn.commit()
        logger.info(f"Inserted car view for user_id {car_view['user_id']} on {car_view['view_date']}")
    except Exception as e:
        logger.error(f"Failed to insert car view for user_id {car_view['user_id']}: {e}")
        raise


def main():
    try:
        for user_id, prefs in user_preferences.items():
            num_views = random.randint(1, 5)
            for _ in range(num_views):
                insert_car_view(generate_car_view(user_id, prefs))
        logger.info(f"Inserted views for {len(user_preferences)} users")
    except Exception as e:
        logger.error(f"Error generating or inserting car views: {e}")
        raise


if __name__ == "__main__":
    try:
        main()
    finally:
        conn.close()
