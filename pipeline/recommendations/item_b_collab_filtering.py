import pandas as pd
from cassandra.cluster import Cluster
from cassandra.query import SimpleStatement
from cassandra.policies import DCAwareRoundRobinPolicy
from datetime import datetime
import pytz
import uuid
import os
import logging
import random
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize output directory
DATA_DIR = "../data"
os.makedirs(DATA_DIR, exist_ok=True)

# Connect to Cassandra
try:
    cluster = Cluster(
        ['localhost'],
        protocol_version=4,
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1')
    )
    session = cluster.connect('cars_keyspace')
except Exception as e:
    logging.error(f"Error connecting to Cassandra: {e}")
    exit(1)

# Fetch views and favorites
try:
    views_query = "SELECT user_id, car_id, view_timestamp FROM car_views_by_user"
    views_rows = session.execute(SimpleStatement(views_query))
    views_data = [(str(row.user_id), str(row.car_id), row.view_timestamp) for row in views_rows]
    
    favs_query = "SELECT user_id, car_id, added_timestamp FROM favorite_cars_by_user"
    favs_rows = session.execute(SimpleStatement(favs_query))
    favs_data = [(str(row.user_id), str(row.car_id), row.added_timestamp) for row in favs_rows]
except Exception as e:
    logging.error(f"Error querying Cassandra: {e}")
    cluster.shutdown()
    exit(1)

# Create DataFrames
views_df = pd.DataFrame(views_data, columns=['user_id', 'car_id', 'view_timestamp'])
favs_df = pd.DataFrame(favs_data, columns=['user_id', 'car_id', 'added_timestamp'])

# Debug: Data summary
logging.info(f"Views rows: {len(views_df)}, Unique users: {views_df['user_id'].nunique()}, Unique cars: {views_df['car_id'].nunique()}")
logging.info(f"Favorites rows: {len(favs_df)}, Unique users: {favs_df['user_id'].nunique()}, Unique cars: {favs_df['car_id'].nunique()}")

# Build user-item interaction matrix
# Combine views (weight=1) and favorites (weight=2)
interactions = []
for _, row in views_df.iterrows():
    if pd.notnull(row['view_timestamp']):
        interactions.append((row['user_id'], row['car_id'], 1.0, row['view_timestamp']))
    else:
        logging.warning(f"Skipping view for user {row['user_id']}, car {row['car_id']}: Invalid timestamp")
for _, row in favs_df.iterrows():
    if pd.notnull(row['added_timestamp']):
        interactions.append((row['user_id'], row['car_id'], 2.0, row['added_timestamp']))
    else:
        logging.warning(f"Skipping favorite for user {row['user_id']}, car {row['car_id']}: Invalid timestamp")

# Weight interactions by recency (decay over 30 days)
current_time = datetime.now(pytz.UTC)
def recency_weight(timestamp):
    try:
        # Convert timestamp to tz-aware UTC if tz-naive
        if timestamp.tzinfo is None:
            timestamp = pytz.UTC.localize(timestamp)
        days_old = (current_time - timestamp).total_seconds() / (24 * 3600)
        return max(0.5, 1.0 - (days_old / 30.0))  # Minimum weight 0.5
    except Exception as e:
        logging.warning(f"Invalid timestamp {timestamp}: {e}, using default weight 0.5")
        return 0.5

interactions = [(user_id, car_id, score * recency_weight(timestamp), timestamp) 
                for user_id, car_id, score, timestamp in interactions]
interaction_df = pd.DataFrame(interactions, columns=['user_id', 'car_id', 'score', 'timestamp'])

# Pivot to create user-item matrix
user_item_matrix = pd.pivot_table(
    interaction_df,
    values='score',
    index='user_id',
    columns='car_id',
    aggfunc='sum',
    fill_value=0
)

# Compute item-to-item similarity using cosine similarity
car_similarity_matrix = cosine_similarity(user_item_matrix.T)
car_ids = user_item_matrix.columns
car_similarity_df = pd.DataFrame(car_similarity_matrix, index=car_ids, columns=car_ids)

# Debug: Similarity matrix info
logging.info(f"Car similarity matrix shape: {car_similarity_df.shape}")

# Get unique users
users = set(views_df['user_id']).union(set(favs_df['user_id']))

# Generate recommendations
recommendations = {}
reason = "Based on your viewing - search and favorite patterns"
max_recs_per_user = 10
recs_to_add = 3

for user_id in users:
    try:
        # Get user interactions
        user_views = set(views_df[views_df['user_id'] == user_id]['car_id'])
        user_favs = set(favs_df[favs_df['user_id'] == user_id]['car_id'])
        user_interactions = user_views.union(user_favs)
        
        # Get existing recommendations
        existing_recs_query = """
            SELECT car_id FROM user_recommendations
            WHERE user_id = %s AND recommendation_reason = %s
            ALLOW FILTERING
        """
        existing_recs = session.execute(existing_recs_query, (uuid.UUID(user_id), reason))
        existing_car_ids = set(str(row.car_id) for row in existing_recs)
        
        # Exclude viewed, favorited, or previously recommended cars
        excluded_cars = user_views.union(user_favs).union(existing_car_ids)
        
        # Compute collaborative filtering scores
        candidate_scores = {}
        for car_id in user_interactions:
            if car_id in car_similarity_df.index:
                similar_cars = car_similarity_df.loc[car_id].dropna()
                for similar_car_id, sim_score in similar_cars.items():
                    if similar_car_id not in excluded_cars and sim_score > 0:
                        candidate_scores[similar_car_id] = candidate_scores.get(similar_car_id, 0) + sim_score
        
        # Normalize scores (0.0 to 0.9)
        if candidate_scores:
            max_sim_score = max(candidate_scores.values())
            candidate_scores = {car_id: (score / max_sim_score) * 0.9 for car_id, score in candidate_scores.items()}
        else:
            # Fallback: Recommend popular cars
            popular_cars_query = """
                SELECT car_id, COUNT(*) as fav_count FROM favorite_cars_by_user
                GROUP BY car_id LIMIT 10
            """
            popular_cars = session.execute(SimpleStatement(popular_cars_query))
            candidate_scores = {str(row.car_id): 0.5 for row in popular_cars}
        
        # Select top recommendations (up to 10, but we’ll filter to 3 later)
        top_recs = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)[:10]
        recommendations[user_id] = top_recs
    except Exception as e:
        logging.error(f"Error generating recommendations for user {user_id}: {e}")
        recommendations[user_id] = []

# Debug: Sample recommendations
logging.info("\nSample recommendations:")
for user_id in list(recommendations.keys())[:3]:
    logging.info(f"User {user_id}: {recommendations[user_id]}")

# Insert recommendations: Add exactly 3 per user, max 10 with specific reason
current_time = datetime.now(pytz.UTC)
for user_id, recs in recommendations.items():
    if not recs:
        logging.info(f"No recommendations for user {user_id}")
        continue
    
    try:
        user_id_uuid = uuid.UUID(user_id)
        
        # Fetch existing recommendations for this user with the specific reason
        query = """
            SELECT car_id, created_at
            FROM user_recommendations
            WHERE user_id = %s AND recommendation_reason = %s
            ALLOW FILTERING
        """
        existing_recs = session.execute(query, (user_id_uuid, reason))
        existing_recs_list = [(row.car_id, row.created_at) for row in existing_recs]
        current_count = len(existing_recs_list)
        existing_car_ids = set(str(car_id) for car_id, _ in existing_recs_list)
        
        logging.info(f"User {user_id}: {current_count} existing recommendations")
        
        # Filter out new recommendations that are already in existing_car_ids
        new_recs = [(car_id, score) for car_id, score in recs if car_id not in existing_car_ids]
        
        # Select exactly 3 new recommendations (or fewer if not enough)
        recs_to_insert = new_recs[:recs_to_add]
        
        # If adding new recommendations would exceed the limit, delete random existing ones
        if current_count + len(recs_to_insert) > max_recs_per_user:
            excess_recs = (current_count + len(recs_to_insert)) - max_recs_per_user
            recs_to_delete = random.sample(existing_recs_list, min(excess_recs, current_count))
            logging.info(f"User {user_id}: Deleting {len(recs_to_delete)} random recommendations to stay within {max_recs_per_user} limit")
            
            # Delete selected recommendations
            for car_id, _ in recs_to_delete:
                session.execute(
                    """
                    DELETE FROM user_recommendations
                    WHERE user_id = %s AND car_id = %s
                    """,
                    (user_id_uuid, car_id)
                )
        
        # Insert new recommendations
        for rank, (car_id, score) in enumerate(recs_to_insert, 1):
            try:
                car_id_uuid = uuid.UUID(car_id)
                session.execute(
                    """
                    INSERT INTO user_recommendations (user_id, car_id, created_at, rank, similarity_score, recommendation_reason)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (user_id_uuid, car_id_uuid, current_time, rank, float(score), reason)
                )
                logging.info(f"Inserted recommendation for user {user_id}, car {car_id}, rank {rank}, score {score:.2f}")
            except Exception as e:
                logging.error(f"Error inserting recommendation for user {user_id}, car {car_id}: {e}")
        
        logging.info(f"User {user_id}: Added {len(recs_to_insert)} new recommendations")
    except Exception as e:
        logging.error(f"Error processing recommendations for user {user_id}: {e}")

# Verify insertion
try:
    rows = session.execute("SELECT user_id, car_id, rank, similarity_score, recommendation_reason FROM user_recommendations LIMIT 10")
    logging.info("\nSample recommendations in database:")
    for row in rows:
        logging.info(f"User: {row.user_id}, Car: {row.car_id}, Rank: {row.rank}, Score: {row.similarity_score:.2f}, Reason: {row.recommendation_reason}")
    count = session.execute("SELECT COUNT(*) FROM user_recommendations").one()[0]
    logging.info(f"Total recommendations stored: {count}")
except Exception as e:
    logging.error(f"Error querying user_recommendations: {e}")

# Clean up
cluster.shutdown()
logging.info("Recommendation process complete.")