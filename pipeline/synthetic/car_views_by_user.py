import logging
import random
from datetime import datetime, timezone, timedelta
from cassandra.cluster import Cluster, ExecutionProfile
from cassandra.policies import DCAwareRoundRobinPolicy
from cassandra.query import SimpleStatement

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cassandra configuration
import os
CASSANDRA_HOST = [os.environ.get('CASSANDRA_HOST', 'localhost')]
CASSANDRA_KEYSPACE = 'cars_keyspace'

# Define execution profile
profile = ExecutionProfile(
    load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1')
)

# Connect to Cassandra
try:
    cluster = Cluster(
        contact_points=CASSANDRA_HOST,
        protocol_version=5,
        execution_profiles={'default': profile}
    )
    session = cluster.connect(CASSANDRA_KEYSPACE)
    logger.info("Connected to Cassandra cluster")
except Exception as e:
    logger.error(f"Failed to connect to Cassandra: {e}")
    raise

# Fetch user preferences
try:
    query = """
        SELECT user_id, preferred_brands, budget_max, budget_min, 
               mileage_max, mileage_min, preferred_door_count, 
               preferred_fuel_types, preferred_transmissions, preferred_years
        FROM user_preferences
    """
    rows = session.execute(SimpleStatement(query))
    user_preferences = {
        row.user_id: {
            'preferred_brands': row.preferred_brands,
            'budget_max': row.budget_max,
            'budget_min': row.budget_min,
            'mileage_max': row.mileage_max,
            'mileage_min': row.mileage_min,
            'preferred_door_count': row.preferred_door_count,
            'preferred_fuel_types': row.preferred_fuel_types,
            'preferred_transmissions': row.preferred_transmissions,
            'preferred_years': row.preferred_years
        }
        for row in rows
        if row.preferred_brands and row.budget_max and row.budget_min
    }
    if not user_preferences:
        logger.error("No valid user preferences found.")
        raise ValueError("No user preferences")
    logger.info(f"Found {len(user_preferences)} user preferences")
except Exception as e:
    logger.error(f"Failed to fetch user preferences: {e}")
    raise

# Fetch all car_ids from cleaned_cars (for fallback)
try:
    rows = session.execute(SimpleStatement("SELECT id FROM cleaned_cars"))
    all_car_ids = [row.id for row in rows]
    if not all_car_ids:
        logger.error("No car_ids found in cleaned_cars table.")
        raise ValueError("No car_ids")
    logger.info(f"Found {len(all_car_ids)} car_ids for fallback")
except Exception as e:
    logger.error(f"Failed to fetch car_ids: {e}")
    raise

# Fetch all unique brands from cleaned_cars to validate preferred_brands
try:
    rows = session.execute(SimpleStatement("SELECT brand FROM cleaned_cars LIMIT 10000"))
    valid_brands = {row.brand.lower().replace('-', ' ') for row in rows if row.brand}
    if not valid_brands:
        logger.warning("No brands found in cleaned_cars. Skipping brand validation.")
    else:
        logger.info(f"Found {len(valid_brands)} unique brands in cleaned_cars: {sorted(valid_brands)}")
except Exception as e:
    logger.error(f"Failed to fetch brands: {e}")
    valid_brands = set()

# Define view sources
view_sources = ['SEARCH', 'RECOMMENDATION', 'BROWSE', 'ADVERTISEMENT']

# Function to get car_ids matching all user preferences
def get_car_ids_for_preferences(prefs):
    try:
        # Normalize brands: exclude 'n/a', convert to lowercase, replace hyphens with spaces
        normalized_brands = [b.lower().replace('-', ' ') for b in prefs['preferred_brands'] if b.lower() != 'n/a']
        # Filter valid brands if validation is enabled
        if valid_brands:
            normalized_brands = [b for b in normalized_brands if b in valid_brands]
        if not normalized_brands:
            logger.warning(f"No valid brands for {prefs['preferred_brands']}. Using fallback.")
            return all_car_ids

        # Build query conditions
        conditions = []
        params = []

        # Brand condition
        if len(normalized_brands) == 1:
            conditions.append("brand = %s")
            params.append(normalized_brands[0])
        else:
            placeholders = ", ".join(["%s"] * len(normalized_brands))
            conditions.append(f"brand IN ({placeholders})")
            params.extend(normalized_brands)

        # Other conditions (only add if preferences are not empty)
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

        # Combine conditions
        where_clause = " AND ".join(conditions) if conditions else ""
        query_str = f"SELECT id FROM cleaned_cars WHERE {where_clause} ALLOW FILTERING"
        query = SimpleStatement(query_str, fetch_size=1000)

        # Execute query
        rows = session.execute(query, params)
        car_ids = [row.id for row in rows]

        if not car_ids:
            logger.warning(f"No cars found for preferences {prefs}. Using fallback.")
            return all_car_ids
        return car_ids
    except Exception as e:
        logger.error(f"Failed to fetch car_ids for preferences {prefs}: {e}")
        return all_car_ids

# Function to generate a synthetic car view
def generate_car_view(user_id, preferences):
    # Generate view date (within the last 30 days)
    days_ago = random.randint(0, 30)
    view_date = (datetime.now(timezone.utc) - timedelta(days=days_ago)).date()
    
    # Generate view timestamp (random time on the view date)
    random_hour = random.randint(0, 23)
    random_minute = random.randint(0, 59)
    random_second = random.randint(0, 59)
    view_timestamp = datetime.combine(view_date, datetime.min.time()).replace(
        hour=random_hour, minute=random_minute, second=random_second, tzinfo=timezone.utc
    )
    
    # Get car_ids matching preferences
    car_ids = get_car_ids_for_preferences(preferences)
    
    # Generate view details
    car_view = {
        'user_id': user_id,
        'view_date': view_date,
        'view_timestamp': view_timestamp,
        'car_id': random.choice(car_ids),
        'view_duration_seconds': random.randint(5, 300),  # 5 seconds to 5 minutes
        'view_source': random.choice(view_sources)
    }
    return car_view

# Function to insert car view into car_views_by_user table
def insert_car_view(car_view):
    try:
        query = """
            INSERT INTO car_views_by_user (
                user_id, view_date, view_timestamp, car_id, 
                view_duration_seconds, view_source
            )
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        session.execute(query, (
            car_view['user_id'],  # UUID, not string
            car_view['view_date'],
            car_view['view_timestamp'],
            car_view['car_id'],  # UUID, not string
            car_view['view_duration_seconds'],
            car_view['view_source']
        ))
        logger.info(f"Inserted car view for user_id {car_view['user_id']} on {car_view['view_date']}")
    except Exception as e:
        logger.error(f"Failed to insert car view for user_id {car_view['user_id']}: {e}")
        raise

# Main function to generate and insert car views
def main():
    try:
        # Generate 1-5 views per user
        for user_id, prefs in user_preferences.items():
            num_views = random.randint(1, 5)  # Each user has 1-5 views
            logger.info(f"Generating {num_views} views for user_id: {user_id} with preferences: {prefs}")
            for _ in range(num_views):
                car_view = generate_car_view(user_id, prefs)
                insert_car_view(car_view)
        logger.info(f"Inserted views for {len(user_preferences)} users")
    except Exception as e:
        logger.error(f"Error generating or inserting car views: {e}")
        raise

if __name__ == "__main__":
    try:
        main()
    finally:
        cluster.shutdown()
        logger.info("Cassandra connection closed")