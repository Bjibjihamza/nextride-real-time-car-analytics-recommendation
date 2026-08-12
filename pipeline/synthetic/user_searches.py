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
logger.info(f"Processing searches for {len(user_ids)} users")

# Fetch preferred_brands from user_preferences table
try:
    rows = session.execute(SimpleStatement("SELECT user_id, preferred_brands FROM user_preferences"))
    user_preferences = {row.user_id: row.preferred_brands for row in rows if row.preferred_brands}
    logger.info(f"Found preferred_brands for {len(user_preferences)} users")
except Exception as e:
    logger.error(f"Failed to fetch user preferences: {e}")
    user_preferences = {}

# Fetch brands, models, and sectors from cleaned_cars table
try:
    rows = session.execute(SimpleStatement("SELECT brand, model, sector FROM cleaned_cars WHERE brand IS NOT NULL AND brand != 'NaN' AND brand != '\"NaN\"'"))
    brands = list(set(row.brand.strip() for row in rows if row.brand and row.brand.strip()))
    models = list(set(row.model.strip() for row in rows if row.model and row.model.strip() and row.model != 'NaN' and row.model != '"NaN"'))
    sectors = list(set(row.sector.strip() for row in rows if row.sector and row.sector.strip() and row.sector != 'NaN' and row.sector != '"NaN"'))
    if not brands:
        logger.warning("No valid brands. Using defaults.")
        brands = ['Toyota', 'BMW', 'Mercedes', 'Volkswagen', 'Hyundai', 'Ford', 'Dacia']
    if not models:
        logger.warning("No valid models. Using defaults.")
        models = ['Corolla', 'X5', 'C-Class', 'Golf', 'Tucson', 'Focus', 'Sandero']
    if not sectors:
        logger.warning("No valid sectors. Using defaults.")
        sectors = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tanger', 'Agadir', 'Oujda']
    logger.info(f"Retrieved {len(brands)} brands, {len(models)} models, {len(sectors)} sectors")
except Exception as e:
    logger.error(f"Failed to fetch data from cleaned_cars: {e}")
    brands = ['Toyota', 'BMW', 'Mercedes', 'Volkswagen', 'Hyundai', 'Ford', 'Dacia']
    models = ['Corolla', 'X5', 'C-Class', 'Golf', 'Tucson', 'Focus', 'Sandero']
    sectors = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tanger', 'Agadir', 'Oujda']

# Possible filter and query values
transmissions = ['manuelle', 'automatique']
door_counts = ['3', '5', '7']
conditions = ['used', 'new']
years = list(range(2000, 2026))

# Function to generate a synthetic search
def generate_search(user_id):
    # Get preferred_brands if available, else use all brands
    preferred_brands = user_preferences.get(user_id, set())
    available_brands = list(preferred_brands) + brands if preferred_brands else brands
    
    # Generate search date (within the last 30 days)
    days_ago = random.randint(0, 30)
    search_date = (datetime.now(timezone.utc) - timedelta(days=days_ago)).date()
    
    # Generate search timestamp (random time on the search date)
    random_hour = random.randint(0, 23)
    random_minute = random.randint(0, 59)
    random_second = random.randint(0, 59)
    search_timestamp = datetime.combine(search_date, datetime.min.time()).replace(
        hour=random_hour, minute=random_minute, second=random_second, tzinfo=timezone.utc
    )
    
    # Generate filters (at least one filter)
    filters = {}
    possible_filters = [
        ('brand', random.choice(available_brands)),  # Prefer user's brands if available
        ('budget_max', str(random.randint(50000, 500000))),
        ('door_count', random.choice(door_counts)),
        ('mileage_max', str(random.randint(50000, 300000))),
        ('transmission', random.choice(transmissions))
    ]
    num_filters = random.randint(1, len(possible_filters))  # Ensure at least one
    selected_filters = random.sample(possible_filters, k=num_filters)
    for key, value in selected_filters:
        filters[key] = value
    
    # Generate search_query (combination of brand, model, sector, year, condition)
    query_components = []
    possible_query_parts = [
        ('brand', filters['brand'] if 'brand' in filters else random.choice(available_brands)),
        ('model', random.choice(models)),
        ('sector', random.choice(sectors)),
        ('year', str(random.choice(years))),
        ('condition', random.choice(conditions))
    ]
    num_query_parts = random.randint(1, len(possible_query_parts))  # At least one part
    selected_query_parts = random.sample(possible_query_parts, k=num_query_parts)
    
    # Build query ensuring brand consistency
    for key, value in selected_query_parts:
        query_components.append(value)
    
    search_query = ' '.join(query_components).strip()
    
    # Generate result count
    result_count = random.randint(0, 50)
    
    search = {
        'user_id': user_id,
        'search_date': search_date,
        'search_timestamp': search_timestamp,
        'search_query': search_query,
        'filters': filters,
        'result_count': result_count
    }
    return search

# Function to insert search into user_searches table
def insert_search(search):
    try:
        query = """
            INSERT INTO user_searches (
                user_id, search_date, search_timestamp, search_query, 
                filters, result_count
            )
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        session.execute(query, (
            search['user_id'],
            search['search_date'],
            search['search_timestamp'],
            search['search_query'],
            search['filters'],
            search['result_count']
        ))
        logger.info(f"Inserted search for user_id {search['user_id']} on {search['search_date']}")
    except Exception as e:
        logger.error(f"Failed to insert search for user_id {search['user_id']}: {e}")
        raise

# Main function to generate and insert one search for all users
def main():
    try:
        for user_id in user_ids:
            search = generate_search(user_id)
            insert_search(search)
        logger.info(f"Inserted searches for {len(user_ids)} users")
    except Exception as e:
        logger.error(f"Error generating or inserting searches: {e}")
        raise

if __name__ == "__main__":
    try:
        main()
    finally:
        cluster.shutdown()
        logger.info("Cassandra connection closed")