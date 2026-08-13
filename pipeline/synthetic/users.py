import logging
import os
import random
import sys
import bcrypt
from uuid import uuid4
from faker import Faker
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "serving"))
from pg_db import get_conn  # noqa: E402

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

fake = Faker()

FIXED_PASSWORD = "47534753"

conn = get_conn()

# Fetch unique seller cities from cars table
try:
    with conn.cursor() as cur:
        cur.execute("SELECT sector FROM cars WHERE sector IS NOT NULL AND sector != ''")
        cities = sorted({row['sector'] for row in cur.fetchall()})
    if not cities:
        logger.warning("No valid sector found in cars. Using default cities.")
        cities = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tanger', 'Agadir', 'Oujda']
    logger.info("Successfully retrieved unique cities")
except Exception as e:
    logger.error(f"Failed to fetch sector from cars: {e}")
    cities = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tanger', 'Agadir', 'Oujda']


def generate_user():
    hashed_password = bcrypt.hashpw(FIXED_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    return {
        'user_id': uuid4(),
        'username': fake.user_name(),
        'email': fake.email(),
        'password': hashed_password,
        'age': random.randint(18, 65),
        'location': random.choice(cities),
        'created_at': datetime.now(timezone.utc)
    }


def insert_user(user):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO users (user_id, username, email, password, age, location, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (user['user_id'], user['username'], user['email'], user['password'],
                 user['age'], user['location'], user['created_at'])
            )
        conn.commit()
        logger.info(f"Inserted user {user['user_id']} ({user['username']})")
    except Exception as e:
        logger.error(f"Failed to insert user {user['user_id']}: {e}")
        raise


def insert_user_preference(user_id):
    try:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO user_preferences (user_id) VALUES (%s)", (user_id,))
        conn.commit()
        logger.info(f"Inserted user_id {user_id} into user_preferences")
    except Exception as e:
        logger.error(f"Failed to insert user_id {user_id} into user_preferences: {e}")
        raise


def main():
    try:
        num_users = int(os.environ.get('NUM_USERS', '1'))
        for _ in range(num_users):
            user = generate_user()
            insert_user(user)
            insert_user_preference(user['user_id'])
        logger.info(f"Inserted {num_users} user(s)")
    except Exception as e:
        logger.error(f"Error generating or inserting user/preference: {e}")
        raise


if __name__ == "__main__":
    try:
        main()
    finally:
        conn.close()
