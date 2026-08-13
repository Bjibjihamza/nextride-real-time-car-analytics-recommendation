import json
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

# Fetch all user ids
try:
    with conn.cursor() as cur:
        cur.execute("SELECT user_id FROM users")
        all_user_ids = [row['user_id'] for row in cur.fetchall()]
    if not all_user_ids:
        logger.error("No user_ids found in users table.")
        raise ValueError("No user_ids")
    logger.info(f"Found {len(all_user_ids)} user_ids")
except Exception as e:
    logger.error(f"Failed to fetch user_ids: {e}")
    raise

user_ids = all_user_ids
logger.info(f"Processing searches for {len(user_ids)} users")

# Fetch preferred_brands
try:
    with conn.cursor() as cur:
        cur.execute("SELECT user_id, preferred_brands FROM user_preferences")
        user_preferences = {row['user_id']: row['preferred_brands'] for row in cur.fetchall() if row['preferred_brands']}
    logger.info(f"Found preferred_brands for {len(user_preferences)} users")
except Exception as e:
    logger.error(f"Failed to fetch user preferences: {e}")
    user_preferences = {}

# Fetch brands, models, sectors from cars
try:
    with conn.cursor() as cur:
        cur.execute("SELECT brand, model, sector FROM cars WHERE brand IS NOT NULL AND brand != ''")
        rows = cur.fetchall()
    brands = list(set(row['brand'].strip() for row in rows if row['brand'] and row['brand'].strip()))
    models = list(set(row['model'].strip() for row in rows if row['model'] and row['model'].strip()))
    sectors = list(set(row['sector'].strip() for row in rows if row['sector'] and row['sector'].strip()))
    if not brands:
        brands = ['Toyota', 'BMW', 'Mercedes', 'Volkswagen', 'Hyundai', 'Ford', 'Dacia']
    if not models:
        models = ['Corolla', 'X5', 'C-Class', 'Golf', 'Tucson', 'Focus', 'Sandero']
    if not sectors:
        sectors = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tanger', 'Agadir', 'Oujda']
    logger.info(f"Retrieved {len(brands)} brands, {len(models)} models, {len(sectors)} sectors")
except Exception as e:
    logger.error(f"Failed to fetch data from cars: {e}")
    brands = ['Toyota', 'BMW', 'Mercedes', 'Volkswagen', 'Hyundai', 'Ford', 'Dacia']
    models = ['Corolla', 'X5', 'C-Class', 'Golf', 'Tucson', 'Focus', 'Sandero']
    sectors = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tanger', 'Agadir', 'Oujda']

transmissions = ['manuelle', 'automatique']
door_counts = ['3', '5', '7']
conditions = ['used', 'new']
years = list(range(2000, 2026))


def generate_search(user_id):
    preferred_brands = user_preferences.get(user_id, [])
    available_brands = list(preferred_brands) + brands if preferred_brands else brands

    days_ago = random.randint(0, 30)
    search_date = (datetime.now(timezone.utc) - timedelta(days=days_ago)).date()
    search_timestamp = datetime.combine(search_date, datetime.min.time()).replace(
        hour=random.randint(0, 23), minute=random.randint(0, 59),
        second=random.randint(0, 59), tzinfo=timezone.utc
    )

    filters = {}
    possible_filters = [
        ('brand', random.choice(available_brands)),
        ('budget_max', str(random.randint(50000, 500000))),
        ('door_count', random.choice(door_counts)),
        ('mileage_max', str(random.randint(50000, 300000))),
        ('transmission', random.choice(transmissions))
    ]
    num_filters = random.randint(1, len(possible_filters))
    for key, value in random.sample(possible_filters, k=num_filters):
        filters[key] = value

    possible_query_parts = [
        ('brand', filters['brand'] if 'brand' in filters else random.choice(available_brands)),
        ('model', random.choice(models)),
        ('sector', random.choice(sectors)),
        ('year', str(random.choice(years))),
        ('condition', random.choice(conditions))
    ]
    selected_parts = random.sample(possible_query_parts, k=random.randint(1, len(possible_query_parts)))
    search_query = ' '.join(value for _, value in selected_parts).strip()

    return {
        'user_id': user_id,
        'search_timestamp': search_timestamp,
        'search_query': search_query,
        'filters': filters,
        'result_count': random.randint(0, 50)
    }


def insert_search(search):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO user_searches (
                     user_id, search_timestamp, search_query, filters, result_count
                   ) VALUES (%s, %s, %s, %s, %s)""",
                (search['user_id'], search['search_timestamp'], search['search_query'],
                 json.dumps(search['filters']), search['result_count'])
            )
        conn.commit()
        logger.info(f"Inserted search for user_id {search['user_id']}")
    except Exception as e:
        logger.error(f"Failed to insert search for user_id {search['user_id']}: {e}")
        raise


def main():
    try:
        for user_id in user_ids:
            insert_search(generate_search(user_id))
        logger.info(f"Inserted searches for {len(user_ids)} users")
    except Exception as e:
        logger.error(f"Error generating or inserting searches: {e}")
        raise


if __name__ == "__main__":
    try:
        main()
    finally:
        conn.close()
