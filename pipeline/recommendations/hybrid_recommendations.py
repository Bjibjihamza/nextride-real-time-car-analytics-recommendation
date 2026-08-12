import logging
import uuid
from datetime import datetime
import pytz
import numpy as np
import pandas as pd
from scipy.sparse.linalg import svds
from sklearn.preprocessing import MinMaxScaler
from cassandra.cluster import Cluster
from cassandra.policies import DCAwareRoundRobinPolicy
from cassandra.query import SimpleStatement
from cassandra import ConsistencyLevel
from cassandra.cluster import ExecutionProfile, EXEC_PROFILE_DEFAULT

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def setup_cassandra_session():
    """Initialize Cassandra cluster and session with execution profiles."""
    try:
        profile = ExecutionProfile(
            load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1'),
            consistency_level=ConsistencyLevel.LOCAL_QUORUM
        )
        cluster = Cluster(
            contact_points=['localhost'],
            execution_profiles={EXEC_PROFILE_DEFAULT: profile},
            protocol_version=4
        )
        session = cluster.connect('cars_keyspace')
        logging.info("Connected to Cassandra cluster")
        return session, cluster
    except Exception as e:
        logging.error(f"Failed to connect to Cassandra: {e}")
        raise

def validate_timestamp(timestamp):
    """Validate and normalize timestamp, returning a weight based on recency."""
    default_weight = 0.5
    if not isinstance(timestamp, datetime):
        logging.warning(f"Invalid timestamp {timestamp}: not a datetime object, using default weight {default_weight}")
        return default_weight
    try:
        if timestamp.tzinfo is None:
            timestamp = pytz.utc.localize(timestamp)
        now = datetime.now(pytz.utc)
        days_old = (now - timestamp).days
        weight = max(0.1, 1.0 - (days_old / 30.0))
        return weight
    except Exception as e:
        logging.warning(f"Invalid timestamp {timestamp}: {e}, using default weight {default_weight}")
        return default_weight

def check_table_exists(session, table_name):
    """Check if a table exists in the keyspace."""
    query = f"SELECT table_name FROM system_schema.tables WHERE keyspace_name = 'cars_keyspace' AND table_name = '{table_name}'"
    rows = session.execute(SimpleStatement(query))
    return len(list(rows)) > 0

def fetch_data(session):
    """Fetch data from Cassandra tables, handling missing tables."""
    table_configs = {
        'car_views_by_user': {
            'query': "SELECT user_id, car_id, view_timestamp FROM car_views_by_user",
            'required': True
        },
        'favorite_cars_by_user': {
            'query': "SELECT user_id, car_id, added_timestamp FROM favorite_cars_by_user",
            'required': True
        },
        'user_preferences': {
            'query': "SELECT user_id, preferred_fuel_types, preferred_transmissions, preferred_door_count FROM user_preferences",
            'required': True
        },
        'cleaned_cars': {
            'query': "SELECT id, fuel_type, transmission, door_count, brand FROM cleaned_cars",
            'required': True
        },
        'user_similarities': {
            'query': "SELECT target_user_id, reference_user_id, similarity_score FROM user_similarities",
            'required': False
        }
    }
    data = {}
    for table, config in table_configs.items():
        if not check_table_exists(session, table):
            if config['required']:
                raise ValueError(f"Required table '{table}' does not exist in keyspace 'cars_keyspace'")
            else:
                logging.warning(f"Table '{table}' does not exist, skipping")
                data[table] = []
                continue
        try:
            rows = session.execute(SimpleStatement(config['query']))
            data[table] = list(rows)
            logging.info(f"{table.capitalize()} rows: {len(data[table])}, "
                         f"Unique users: {len(set(row.user_id for row in data[table] if hasattr(row, 'user_id') or hasattr(row, 'target_user_id')))}, "
                         f"Unique cars: {len(set(row.car_id for row in data[table] if hasattr(row, 'car_id')))}")
        except Exception as e:
            if config['required']:
                raise ValueError(f"Failed to query table '{table}': {e}")
            else:
                logging.warning(f"Failed to query table '{table}': {e}, skipping")
                data[table] = []
    return data

def build_user_item_matrix(views, favorites):
    """Build user-item interaction matrix from views and favorites."""
    interactions = []
    for view in views:
        interactions.append({
            'user_id': str(view.user_id),
            'car_id': str(view.car_id),
            'rating': validate_timestamp(view.view_timestamp) * 0.5  # Views weighted lower
        })
    for fav in favorites:
        interactions.append({
            'user_id': str(fav.user_id),
            'car_id': str(fav.car_id),
            'rating': validate_timestamp(fav.added_timestamp) * 1.0  # Favorites weighted higher
        })
    
    df = pd.DataFrame(interactions)
    user_item_matrix = df.pivot_table(index='user_id', columns='car_id', values='rating', aggfunc='max', fill_value=0)
    logging.info(f"User-item matrix shape: {user_item_matrix.shape}")
    return user_item_matrix

def compute_svd_predictions(user_item_matrix, k=20):
    """Apply SVD to predict collaborative filtering scores."""
    R = user_item_matrix.values
    U, sigma, Vt = svds(R, k=k)
    sigma = np.diag(sigma)
    R_pred = np.dot(np.dot(U, sigma), Vt)
    R_pred[R_pred < 0] = 0
    pred_df = pd.DataFrame(R_pred, index=user_item_matrix.index, columns=user_item_matrix.columns)
    logging.info(f"SVD predictions shape: {pred_df.shape}")
    return pred_df

def compute_content_similarity(user_prefs, cars):
    """Compute content-based similarity between user preferences and cars."""
    user_to_idx = {str(p.user_id): i for i, p in enumerate(user_prefs)}
    car_to_idx = {str(c.id): i for i, c in enumerate(cars)}
    similarity_matrix = np.zeros((len(user_prefs), len(cars)))
    
    for pref in user_prefs:
        u_idx = user_to_idx[str(pref.user_id)]
        for car in cars:
            c_idx = car_to_idx[str(car.id)]
            score = 0.0
            if pref.preferred_fuel_types and car.fuel_type in pref.preferred_fuel_types:
                score += 0.4
            if pref.preferred_transmissions and car.transmission in pref.preferred_transmissions:
                score += 0.3
            if pref.preferred_door_count and car.door_count in pref.preferred_door_count:
                score += 0.2
            similarity_matrix[u_idx, c_idx] = score
    
    similarity_df = pd.DataFrame(similarity_matrix, index=[str(p.user_id) for p in user_prefs], columns=[str(c.id) for c in cars])
    logging.info(f"Content-based similarity shape: {similarity_df.shape}")
    return similarity_df

def generate_recommendations(session, data):
    """Generate hybrid recommendations using SVD and content-based filtering."""
    # Build user-item matrix
    user_item_matrix = build_user_item_matrix(data['car_views_by_user'], data['favorite_cars_by_user'])
    
    # Compute SVD predictions
    pred_df = compute_svd_predictions(user_item_matrix)
    
    # Compute content-based similarity
    similarity_df = compute_content_similarity(data['user_preferences'], data['cleaned_cars'])
    
    # Align indices and columns
    common_users = pred_df.index.intersection(similarity_df.index).intersection(user_item_matrix.index)
    common_cars = pred_df.columns.intersection(similarity_df.columns).intersection(user_item_matrix.columns)
    if not common_users.size or not common_cars.size:
        logging.error("No common users or cars for recommendations")
        return []
    
    pred_df = pred_df.loc[common_users, common_cars]
    similarity_df = similarity_df.loc[common_users, common_cars]
    user_item_df = user_item_matrix.loc[common_users, common_cars]
    
    # Normalize scores
    collab_scores = MinMaxScaler().fit_transform(pred_df.values.reshape(-1, 1)).reshape(pred_df.shape)
    content_scores = MinMaxScaler().fit_transform(similarity_df.values.reshape(-1, 1)).reshape(similarity_df.shape)
    
    # Combine scores
    alpha = 0.5
    hybrid_scores = alpha * collab_scores + (1 - alpha) * content_scores
    hybrid_df = pd.DataFrame(hybrid_scores, index=common_users, columns=common_cars)
    logging.info(f"Hybrid scores shape: {hybrid_df.shape}")
    
    # Generate recommendations
    recommendations = []
    for user_id in hybrid_df.index:
        unrated_cars = user_item_df.loc[user_id][user_item_df.loc[user_id] == 0].index
        top_cars = hybrid_df.loc[user_id, unrated_cars].nlargest(5).index
        top_scores = hybrid_df.loc[user_id, top_cars].values
        
        for rank, (car_id, score) in enumerate(zip(top_cars, top_scores), 1):
            collab_score = pred_df.loc[user_id, car_id]
            content_score = similarity_df.loc[user_id, car_id]
            reason = f"Hybrid: {alpha:.2f}*collaborative ({collab_score:.2f}) + {1-alpha:.2f}*content-based ({content_score:.2f})"
            recommendations.append({
                'user_id': user_id,
                'car_id': car_id,
                'rank': rank,
                'reason': reason,
                'score': float(score),
                'created_at': datetime.now(pytz.utc)
            })
    
    logging.info(f"Total recommendations generated: {len(recommendations)}")
    return recommendations

def store_recommendations(session, recommendations):
    """Store recommendations in Cassandra user_recommendations table."""
    insert_query = """
        INSERT INTO user_recommendations (user_id, car_id, created_at, rank, recommendation_reason, similarity_score)
        VALUES (?, ?, ?, ?, ?, ?)
    """
    prepared = session.prepare(insert_query)
    for rec in recommendations:
        user_id = rec['user_id'] if isinstance(rec['user_id'], uuid.UUID) else uuid.UUID(rec['user_id'])
        car_id = rec['car_id'] if isinstance(rec['car_id'], uuid.UUID) else uuid.UUID(rec['car_id'])
        session.execute(prepared, (
            user_id,
            car_id,
            rec['created_at'],
            rec['rank'],
            rec['reason'],
            rec['score']
        ))
    logging.info(f"Total recommendations stored: {len(recommendations)}")
    
    sample_query = "SELECT user_id, car_id, rank, recommendation_reason, similarity_score FROM user_recommendations LIMIT 5"
    rows = session.execute(SimpleStatement(sample_query))
    logging.info("Sample recommendations from database:")
    for row in rows:
        logging.info(f"User: {row.user_id}, Car: {row.car_id}, Rank: {row.rank}, "
                     f"Reason: {row.recommendation_reason}, Score: {row.similarity_score:.2f}")

def evaluate_precision(session, recommendations):
    """Evaluate precision@5 using favorite_cars_by_user as ground truth."""
    query = "SELECT user_id, car_id FROM favorite_cars_by_user"
    rows = session.execute(SimpleStatement(query))
    ground_truth = {}
    for row in rows:
        user_id = str(row.user_id)
        if user_id not in ground_truth:
            ground_truth[user_id] = set()
        ground_truth[user_id].add(str(row.car_id))
    
    rec_df = pd.DataFrame(recommendations)
    precision = 0
    user_count = 0
    for user_id in rec_df['user_id'].unique():
        recommended = set(rec_df[rec_df['user_id'] == user_id]['car_id'].astype(str))
        favorites = ground_truth.get(str(user_id), set())
        if favorites:
            precision += len(recommended & favorites) / 5
            user_count += 1
    precision = precision / user_count if user_count > 0 else 0
    logging.info(f"Precision@5: {precision:.4f}")

def main():
    """Main function to run the recommendation pipeline."""
    session, cluster = setup_cassandra_session()
    try:
        data = fetch_data(session)
        recommendations = generate_recommendations(session, data)
        if recommendations:
            store_recommendations(session, recommendations)
            evaluate_precision(session, recommendations)
        logging.info("Hybrid recommendation process complete.")
    finally:
        cluster.shutdown()

if __name__ == "__main__":
    main()