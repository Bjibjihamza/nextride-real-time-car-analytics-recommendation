import logging
import random
from datetime import datetime, timezone
from cassandra.cluster import Cluster, ExecutionProfile
from cassandra.policies import DCAwareRoundRobinPolicy
from cassandra.query import SimpleStatement

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

import os
CASSANDRA_HOST = [os.environ.get('CASSANDRA_HOST', 'localhost')]
CASSANDRA_KEYSPACE = 'cars_keyspace'

profile = ExecutionProfile(load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1'))

try:
    cluster = Cluster(contact_points=CASSANDRA_HOST, protocol_version=5, execution_profiles={'default': profile})
    session = cluster.connect(CASSANDRA_KEYSPACE)
    logger.info("Connected to Cassandra cluster")
except Exception as e:
    logger.error(f"Failed to connect: {e}")
    raise

try:
    rows = session.execute(SimpleStatement("SELECT brand FROM cleaned_cars"))
    brands = [row.brand for row in rows if row.brand and row.brand != '"NaN"' and row.brand != 'NaN' and row.brand.strip()]
    brands = list(set(brands))
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
    rows = session.execute(SimpleStatement("SELECT user_id FROM user_preferences"))
    user_ids = [row.user_id for row in rows]
    if not user_ids:
        logger.error("No user_ids found.")
        raise ValueError("No user_ids")
    logger.info(f"Found {len(user_ids)} user_ids")
except Exception as e:
    logger.error(f"Failed to fetch user_ids: {e}")
    raise

def generate_user_preference(user_id):
    # Generate budget_min and round to nearest 1000
    budget_min = round(random.randint(20000, 100000) / 1000) * 1000
    # Ensure budget_max is at least 10000 more than budget_min, then round
    budget_max = round(random.randint(budget_min + 10000, 500000) / 1000) * 1000

    mileage_min = random.randint(0, 100000)
    mileage_max = random.randint(mileage_min + 10000, 300000)

    year_min = random.randint(2000, 2020)
    year_max = random.randint(year_min + 1, 2025)
    preferred_years = {year_min, year_max}

    preference = {
        'user_id': user_id,
        'preferred_brands': set(random.sample(brands, k=random.randint(1, min(3, len(brands))))),
        'preferred_fuel_types': set(random.sample(fuel_types, k=random.randint(1, 2))),
        'preferred_transmissions': set(random.sample(transmissions, k=1)),
        'budget_min': budget_min,
        'budget_max': budget_max,
        'preferred_door_count': set(random.sample(door_counts, k=random.randint(1, 2))),
        'mileage_min': mileage_min,
        'mileage_max': mileage_max,
        'preferred_years': preferred_years,
        'last_updated': datetime.now(timezone.utc)
    }
    return preference

def update_user_preference(preference):
    try:
        query = """
            UPDATE user_preferences
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
            WHERE user_id = %s
        """
        session.execute(query, (
            preference['preferred_brands'],
            preference['preferred_fuel_types'],
            preference['preferred_transmissions'],
            preference['budget_min'],
            preference['budget_max'],
            preference['preferred_door_count'],
            preference['mileage_min'],
            preference['mileage_max'],
            preference['preferred_years'],
            preference['last_updated'],
            preference['user_id']
        ))
        logger.info(f"Updated user_id {preference['user_id']}")
    except Exception as e:
        logger.error(f"Failed to update user_id {preference['user_id']}: {e}")
        raise

def main():
    try:
        for user_id in user_ids:
            preference = generate_user_preference(user_id)
            logger.info(f"Generated preference for user_id: {user_id}")
            update_user_preference(preference)
        logger.info(f"Updated {len(user_ids)} users")
    except Exception as e:
        logger.error(f"Error: {e}")
        raise

if __name__ == "__main__":
    try:
        main()
    finally:
        cluster.shutdown()
        logger.info("Connection closed")