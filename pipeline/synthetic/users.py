import logging
import random
import bcrypt
from uuid import uuid4
from faker import Faker
from datetime import datetime, timezone
from cassandra.cluster import Cluster
from cassandra.policies import DCAwareRoundRobinPolicy

# Configure logging (minimal output)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Faker for synthetic data
fake = Faker()

# Cassandra configuration
import os
CASSANDRA_HOST = [os.environ.get('CASSANDRA_HOST', 'localhost')]  # Adjust via env
CASSANDRA_KEYSPACE = 'cars_keyspace'

# Fixed password for all users
FIXED_PASSWORD = "47534753"

# Connect to Cassandra
try:
    cluster = Cluster(
        contact_points=CASSANDRA_HOST,
        protocol_version=5,  # Match Cassandra 4.1.8
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1')
    )
    session = cluster.connect(CASSANDRA_KEYSPACE)
    logger.info("Connected to Cassandra cluster")
except Exception as e:
    logger.error(f"Failed to connect to Cassandra: {e}")
    raise

# Fetch unique seller cities from cleaned_cars table
try:
    query = "SELECT sector FROM cleaned_cars"
    rows = session.execute(query)
    cities = [row.sector for row in rows if row.sector and row.sector != '"NaN"' and row.sector != 'NaN']
    cities = list(set(cities))  # Remove duplicates
    if not cities:
        logger.warning("No valid sector found in cleaned_cars. Using default cities.")
        cities = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tanger', 'Agadir', 'Oujda']
    logger.info("Successfully retrieved unique cities")
except Exception as e:
    logger.error(f"Failed to fetch sector from cleaned_cars: {e}")
    cities = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tanger', 'Agadir', 'Oujda']
    logger.info("Using default cities")

# Function to generate a synthetic user with hashed password
def generate_user():
    # Hash the fixed password using bcrypt
    hashed_password = bcrypt.hashpw(FIXED_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = {
        'user_id': uuid4(),
        'username': fake.user_name(),
        'email': fake.email(),
        'password': hashed_password,  # Store hashed password
        'age': random.randint(18, 65),
        'location': random.choice(cities),
        'created_at': datetime.now(timezone.utc)
    }
    return user

# Function to insert user into users table
def insert_user(user):
    try:
        query = """
            INSERT INTO users (user_id, username, email, password, age, location, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        session.execute(query, (
            user['user_id'],
            user['username'],
            user['email'],
            user['password'],
            user['age'],
            user['location'],
            user['created_at']
        ))
        logger.info(f"Inserted user {user['user_id']} ({user['username']}) into {CASSANDRA_KEYSPACE}.users")
    except Exception as e:
        logger.error(f"Failed to insert user {user['user_id']}: {e}")
        raise

# Function to insert user_id into user_preferences table
def insert_user_preference(user_id):
    try:
        query = """
            INSERT INTO user_preferences (user_id)
            VALUES (%s)
        """
        session.execute(query, (user_id,))
        logger.info(f"Inserted user_id {user_id} into {CASSANDRA_KEYSPACE}.user_preferences")
    except Exception as e:
        logger.error(f"Failed to insert user_id {user_id} into user_preferences: {e}")
        raise

# Main function to add users and their user_preferences rows
def main():
    try:
        num_users = int(os.environ.get('NUM_USERS', '1'))
        for _ in range(num_users):
            # Generate and insert a new user
            user = generate_user()
            logger.info(f"Generated user: {user['user_id']} ({user['username']})")
            insert_user(user)
            # Insert user_id into user_preferences
            insert_user_preference(user['user_id'])
        logger.info(f"Inserted {num_users} user(s)")
    except Exception as e:
        logger.error(f"Error generating or inserting user/preference: {e}")
        raise

if __name__ == "__main__":
    try:
        main()
    finally:
        # Clean up Cassandra connection
        cluster.shutdown()