import logging
import random
from datetime import datetime, timezone, timedelta
from cassandra.cluster import Cluster
from cassandra.policies import DCAwareRoundRobinPolicy
from cassandra.query import SimpleStatement

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cassandra configuration
import os
CASSANDRA_HOST = [os.environ.get('CASSANDRA_HOST', 'localhost')]
CASSANDRA_KEYSPACE = 'cars_keyspace'

# Connect to Cassandra
try:
    cluster = Cluster(
        contact_points=CASSANDRA_HOST,
        protocol_version=5,
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1')
    )
    session = cluster.connect(CASSANDRA_KEYSPACE)
    logger.info("Connected to Cassandra cluster")
except Exception as e:
    logger.error(f"Failed to connect to Cassandra: {e}")
    raise

# Fetch all user_ids from users table
try:
    rows = session.execute(SimpleStatement("SELECT user_id FROM users"))
    all_user_ids = [row.user_id for row in rows]
    if not all_user_ids:
        logger.error("No user_ids found in users table.")
        raise ValueError("No user_ids")
    logger.info(f"Found {len(all_user_ids)} user_ids")
except Exception as e:
    logger.error(f"Failed to fetch user_ids: {e}")
    raise

# Use all user_ids (no random sampling)
user_ids = all_user_ids
logger.info(f"Processing favorite cars for {len(user_ids)} users")

# Fetch user preferences
try:
    rows = session.execute(SimpleStatement("SELECT user_id, preferred_brands, preferred_fuel_types, preferred_transmissions, budget_min, budget_max, preferred_door_count, mileage_min, mileage_max, preferred_years FROM user_preferences"))
    user_preferences = {row.user_id: {
        'preferred_brands': row.preferred_brands or set(),
        'preferred_fuel_types': row.preferred_fuel_types or set(),
        'preferred_transmissions': row.preferred_transmissions or set(),
        'budget_min': row.budget_min or 0,
        'budget_max': row.budget_max or 1000000,
        'preferred_door_count': row.preferred_door_count or set(),
        'mileage_min': row.mileage_min or 0,
        'mileage_max': row.mileage_max or 500000,
        'preferred_years': row.preferred_years or set()
    } for row in rows}
    logger.info(f"Found preferences for {len(user_preferences)} users")
except Exception as e:
    logger.error(f"Failed to fetch user preferences: {e}")
    user_preferences = {}

# Fetch viewed cars from car_views_by_user
try:
    rows = session.execute(SimpleStatement("SELECT user_id, car_id, view_duration_seconds FROM car_views_by_user"))
    user_views = {}
    for row in rows:
        if row.user_id not in user_views:
            user_views[row.user_id] = []
        user_views[row.user_id].append((row.car_id, row.view_duration_seconds))
    logger.info(f"Found view data for {len(user_views)} users")
except Exception as e:
    logger.error(f"Failed to fetch car views: {e}")
    user_views = {}

# Fetch search filters from user_searches
try:
    rows = session.execute(SimpleStatement("SELECT user_id, filters FROM user_searches"))
    user_searches = {}
    for row in rows:
        if row.user_id not in user_searches:
            user_searches[row.user_id] = []
        user_searches[row.user_id].append(row.filters)
    logger.info(f"Found search data for {len(user_searches)} users")
except Exception as e:
    logger.error(f"Failed to fetch user searches: {e}")
    user_searches = {}

# Fetch car details from cleaned_cars
try:
    rows = session.execute(SimpleStatement("SELECT id, brand, fuel_type, transmission, price, door_count, mileage, year FROM cleaned_cars"))
    cars = [{
        'id': row.id,
        'brand': row.brand.strip() if row.brand else None,
        'fuel_type': row.fuel_type.strip() if row.fuel_type else None,
        'transmission': row.transmission.strip() if row.transmission else None,
        'price': row.price if row.price is not None else 0,
        'door_count': row.door_count if row.door_count is not None else 0,
        'mileage': row.mileage if row.mileage is not None else 0,
        'year': row.year if row.year is not None else 0
    } for row in rows if row.id and row.brand and row.brand != 'NaN' and row.brand != '"NaN"']
    if not cars:
        logger.error("No valid cars found in cleaned_cars.")
        raise ValueError("No cars")
    logger.info(f"Retrieved {len(cars)} cars")
except Exception as e:
    logger.error(f"Failed to fetch cars: {e}")
    raise

# Function to score and select favorite cars
def select_favorite_cars(user_id):
    prefs = user_preferences.get(user_id, {
        'preferred_brands': set(),
        'preferred_fuel_types': set(),
        'preferred_transmissions': set(),
        'budget_min': 0,
        'budget_max': 1000000,
        'preferred_door_count': set(),
        'mileage_min': 0,
        'mileage_max': 500000,
        'preferred_years': set()
    })
    viewed_cars = [(car_id, duration) for car_id, duration in user_views.get(user_id, [])]
    search_filters = user_searches.get(user_id, [])

    # Score cars based on preferences, views, and searches
    scored_cars = []
    for car in cars:
        score = 0
        # Preference matching
        if car['brand'] in prefs['preferred_brands']:
            score += 50
        if car['fuel_type'] in prefs['preferred_fuel_types']:
            score += 20
        if car['transmission'] in prefs['preferred_transmissions']:
            score += 20
        if prefs['budget_min'] <= car['price'] <= prefs['budget_max']:
            score += 30
        if car['door_count'] in prefs['preferred_door_count']:
            score += 15
        if prefs['mileage_min'] <= car['mileage'] <= prefs['mileage_max']:
            score += 15
        if car['year'] in prefs['preferred_years']:
            score += 20
        # View matching
        for view_car_id, duration in viewed_cars:
            if car['id'] == view_car_id:  # Compare UUIDs directly
                score += min(duration // 10, 50)  # Higher score for longer views
                break
        # Search filter matching
        for filters in search_filters:
            if 'brand' in filters and filters['brand'] == car['brand']:
                score += 30
            if 'budget_max' in filters and car['price'] <= int(filters['budget_max']):
                score += 10
            if 'door_count' in filters and int(filters['door_count']) == car['door_count']:
                score += 10
            if 'mileage_max' in filters and car['mileage'] <= int(filters['mileage_max']):
                score += 10
            if 'transmission' in filters and filters['transmission'] == car['transmission']:
                score += 10
        
        if score > 0:  # Only include cars with some relevance
            scored_cars.append((car['id'], score))

    # Sort by score and select 1-3 cars
    scored_cars.sort(key=lambda x: x[1], reverse=True)
    num_favorites = random.randint(1, min(3, len(scored_cars)))
    return [car_id for car_id, _ in scored_cars[:num_favorites]] if scored_cars else []

# Function to generate a favorite car entry
def generate_favorite(user_id, car_id):
    days_ago = random.randint(0, 30)
    added_date = (datetime.now(timezone.utc) - timedelta(days=days_ago)).date()
    random_hour = random.randint(0, 23)
    random_minute = random.randint(0, 59)
    random_second = random.randint(0, 59)
    added_timestamp = datetime.combine(added_date, datetime.min.time()).replace(
        hour=random_hour, minute=random_minute, second=random_second, tzinfo=timezone.utc
    )
    return {
        'user_id': user_id,
        'added_date': added_date,
        'added_timestamp': added_timestamp,
        'car_id': car_id
    }

# Function to insert favorite car
def insert_favorite(favorite):
    try:
        query = """
            INSERT INTO favorite_cars_by_user (
                user_id, added_date, added_timestamp, car_id
            )
            VALUES (%s, %s, %s, %s)
        """
        session.execute(query, (
            favorite['user_id'],
            favorite['added_date'],
            favorite['added_timestamp'],
            favorite['car_id']
        ))
        logger.info(f"Inserted favorite car {favorite['car_id']} for user_id {favorite['user_id']}")
    except Exception as e:
        logger.error(f"Failed to insert favorite for user_id {favorite['user_id']}: {e}")
        raise

# Main function
def main():
    try:
        for user_id in user_ids:
            favorite_car_ids = select_favorite_cars(user_id)
            if not favorite_car_ids:
                logger.warning(f"No suitable favorite cars found for user_id {user_id}")
                continue
            for car_id in favorite_car_ids:
                favorite = generate_favorite(user_id, car_id)
                insert_favorite(favorite)
        logger.info(f"Inserted favorites for {len(user_ids)} users")
    except Exception as e:
        logger.error(f"Error generating or inserting favorites: {e}")
        raise

if __name__ == "__main__":
    try:
        main()
    finally:
        cluster.shutdown()
        logger.info("Cassandra connection closed")