import pandas as pd
import numpy as np
from cassandra.cluster import Cluster
from cassandra.query import SimpleStatement
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime
from pytz import UTC
import uuid
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Connect to Cassandra
import os
CASSANDRA_HOST = os.environ.get('CASSANDRA_HOST', 'localhost')
try:
    cluster = Cluster([CASSANDRA_HOST])
    session = cluster.connect('cars_keyspace')
except Exception as e:
    logging.error(f"Error connecting to Cassandra: {e}")
    exit(1)

# Step 1: Extract and Preprocess Features
# Fetch user preferences
try:
    prefs_query = """
    SELECT user_id, preferred_brands, preferred_door_count, preferred_fuel_types,
           preferred_transmissions, budget_max, budget_min, mileage_max, mileage_min,
           preferred_years FROM user_preferences
    """
    prefs_rows = session.execute(SimpleStatement(prefs_query))
    prefs_data = [
        (
            str(row.user_id),
            row.preferred_brands or set(),
            row.preferred_door_count or set(),
            row.preferred_fuel_types or set(),
            row.preferred_transmissions or set(),
            row.budget_max or 0.0,
            row.budget_min or 0.0,
            row.mileage_max or 0.0,
            row.mileage_min or 0.0,
            row.preferred_years or set()
        ) for row in prefs_rows
    ]
except Exception as e:
    logging.error(f"Error querying user_preferences: {e}")
    cluster.shutdown()
    exit(1)

# Fetch car data
try:
    cars_query = """
    SELECT id, brand, door_count, fuel_type, transmission, price, mileage, year
    FROM cleaned_cars
    """
    cars_rows = session.execute(SimpleStatement(cars_query))
    cars_data = [
        (
            str(row.id),
            row.brand or 'unknown',
            row.door_count,
            row.fuel_type or 'unknown',
            row.transmission or 'unknown',
            row.price or np.nan,
            row.mileage or np.nan,
            row.year or np.nan
        ) for row in cars_rows
    ]
except Exception as e:
    logging.error(f"Error querying cleaned_cars: {e}")
    cluster.shutdown()
    exit(1)

# Create DataFrames
user_prefs_df = pd.DataFrame(
    prefs_data,
    columns=[
        'user_id', 'preferred_brands', 'preferred_door_count', 'preferred_fuel_types',
        'preferred_transmissions', 'budget_max', 'budget_min', 'mileage_max',
        'mileage_min', 'preferred_years'
    ]
)
cars_df = pd.DataFrame(
    cars_data,
    columns=['car_id', 'brand', 'door_count', 'fuel_type', 'transmission', 'price', 'mileage', 'year']
)

# Debug: Data summary
logging.info(f"User preferences rows: {len(user_prefs_df)}, Unique users: {user_prefs_df['user_id'].nunique()}")
logging.info(f"Cars rows: {len(cars_df)}, Unique cars: {cars_df['car_id'].nunique()}")
logging.info(f"Empty preferred_brands: {(user_prefs_df['preferred_brands'].apply(len) == 0).sum()}")
logging.info(f"Empty preferred_years: {(user_prefs_df['preferred_years'].apply(len) == 0).sum()}")

# Standardize categorical values
user_prefs_df['preferred_transmissions'] = user_prefs_df['preferred_transmissions'].apply(
    lambda x: {t.lower() for t in x}
)
cars_df['transmission'] = cars_df['transmission'].str.lower()
cars_df['brand'] = cars_df['brand'].str.lower()
cars_df['fuel_type'] = cars_df['fuel_type'].str.lower()

# Handle nulls in cars_df
cars_df['door_count'] = cars_df['door_count'].fillna(5).astype(int)  # Mode
cars_df['price'] = cars_df['price'].fillna(cars_df['price'].median(skipna=True))
cars_df['mileage'] = cars_df['mileage'].fillna(cars_df['mileage'].median(skipna=True))
cars_df['year'] = cars_df['year'].fillna(cars_df['year'].median(skipna=True))

# Debug: Unique values
logging.info(f"Unique door_count: {sorted(cars_df['door_count'].unique())}")
logging.info(f"Unique brands: {sorted(cars_df['brand'].unique())[:5]}...")
logging.info(f"Unique fuel types: {sorted(cars_df['fuel_type'].unique())}")
logging.info(f"Unique transmissions: {sorted(cars_df['transmission'].unique())}")

# Get unique categories
all_brands = sorted(set(cars_df['brand'].unique()) | set().union(*user_prefs_df['preferred_brands']))
door_counts = sorted(set(cars_df['door_count'].unique()) | set().union(*user_prefs_df['preferred_door_count']))
all_fuel_types = sorted(set(cars_df['fuel_type'].unique()) | set().union(*user_prefs_df['preferred_fuel_types']))
all_transmissions = sorted(set(cars_df['transmission'].unique()) | set().union(*user_prefs_df['preferred_transmissions']))

# Define feature columns
numerical_cols = ['budget_max', 'budget_min', 'mileage_max', 'mileage_min', 'preferred_years_mean', 'price', 'mileage', 'year']
categorical_cols = (
    [f'brand_{b}' for b in all_brands] +
    [f'door_count_{dc}' for dc in door_counts] +
    [f'fuel_type_{ft}' for ft in all_fuel_types] +
    [f'transmission_{tr}' for tr in all_transmissions]
)
all_cols = categorical_cols + numerical_cols

# Process user numerical features
user_prefs_df['preferred_years_mean'] = user_prefs_df['preferred_years'].apply(
    lambda x: np.mean(list(x)) if x else 2018
)
user_num_values = MinMaxScaler().fit_transform(
    user_prefs_df[['budget_max', 'budget_min', 'mileage_max', 'mileage_min', 'preferred_years_mean']]
)
user_num_df = pd.DataFrame(0.0, index=user_prefs_df['user_id'], columns=numerical_cols)
user_num_df[['budget_max', 'budget_min', 'mileage_max', 'mileage_min', 'preferred_years_mean']] = user_num_values

# Process car numerical features
car_num_values = MinMaxScaler().fit_transform(cars_df[['price', 'mileage', 'year']])
car_num_df = pd.DataFrame(0.0, index=cars_df['car_id'], columns=numerical_cols)
car_num_df[['price', 'mileage', 'year']] = car_num_values

# Process categorical features for users
user_cat_data = {col: np.zeros(len(user_prefs_df)) for col in categorical_cols}
for i, row in user_prefs_df.iterrows():
    for brand in row['preferred_brands']:
        if brand in all_brands:
            user_cat_data[f'brand_{brand}'][i] = 1
    for dc in row['preferred_door_count']:
        if dc in door_counts:
            user_cat_data[f'door_count_{dc}'][i] = 1
    for ft in row['preferred_fuel_types']:
        if ft in all_fuel_types:
            user_cat_data[f'fuel_type_{ft}'][i] = 1
    for tr in row['preferred_transmissions']:
        if tr in all_transmissions:
            user_cat_data[f'transmission_{tr}'][i] = 1
user_cat_df = pd.DataFrame(user_cat_data, index=user_prefs_df['user_id'])

# Process categorical features for cars
car_cat_data = {col: np.zeros(len(cars_df)) for col in categorical_cols}
for i, row in cars_df.iterrows():
    if row['brand'] in all_brands:
        car_cat_data[f'brand_{row["brand"]}'][i] = 1
    if row['door_count'] in door_counts:
        car_cat_data[f'door_count_{row["door_count"]}'][i] = 1
    if row['fuel_type'] in all_fuel_types:
        car_cat_data[f'fuel_type_{row["fuel_type"]}'][i] = 1
    if row['transmission'] in all_transmissions:
        car_cat_data[f'transmission_{row["transmission"]}'][i] = 1
car_cat_df = pd.DataFrame(car_cat_data, index=cars_df['car_id'])

# Combine features
user_features_df = pd.concat([user_cat_df, user_num_df], axis=1)
car_features_df = pd.concat([car_cat_df, car_num_df], axis=1)

# Verify features
logging.info(f"User features shape: {user_features_df.shape}")
logging.info(f"Car features shape: {car_features_df.shape}")
logging.info(f"Feature columns match: {user_features_df.columns.equals(car_features_df.columns)}")

# Step 2: Compute Cosine Similarity
similarity_matrix = cosine_similarity(user_features_df.values, car_features_df.values)
similarity_df = pd.DataFrame(
    similarity_matrix,
    index=user_features_df.index,
    columns=car_features_df.index
)

# Debug: Similarity matrix
logging.info(f"Similarity matrix shape: {similarity_df.shape}")
logging.info("Sample similarities (first 3 users, 3 cars):")
logging.info(similarity_df.iloc[:3, :3])

# Step 3: Generate Recommendations
# Fetch user-item interactions directly from Cassandra
try:
    views_query = "SELECT user_id, car_id FROM car_views_by_user"
    views_rows = session.execute(SimpleStatement(views_query))
    views_data = [(str(row.user_id), str(row.car_id)) for row in views_rows]
    
    favs_query = "SELECT user_id, car_id FROM favorite_cars_by_user"
    favs_rows = session.execute(SimpleStatement(favs_query))
    favs_data = [(str(row.user_id), str(row.car_id)) for row in favs_rows]
except Exception as e:
    logging.error(f"Error querying views/favorites: {e}")
    cluster.shutdown()
    exit(1)

# Create user-item interaction DataFrame
interactions = views_data + favs_data
user_item_df = pd.DataFrame(0, index=user_prefs_df['user_id'].unique(), columns=cars_df['car_id'].unique())
for user_id, car_id in interactions:
    if user_id in user_item_df.index and car_id in user_item_df.columns:
        user_item_df.loc[user_id, car_id] = 1

# Debug: Check shapes
logging.info(f"User-item matrix shape: {user_item_df.shape}")


# Generate recommendations
recommendations = []
for user_id in similarity_df.index:
    user_similarities = similarity_df.loc[user_id]
    
    # Filter out viewed/favorited cars
    if user_id in user_item_df.index:
        viewed_cars = user_item_df.loc[user_id][user_item_df.loc[user_id] > 0].index
        user_similarities = user_similarities.drop(viewed_cars, errors='ignore')
    
    # Get top-5 cars
    top_cars = user_similarities.nlargest(5)
    for rank, (car_id, score) in enumerate(top_cars.items(), 1):
        # Generate recommendation reason
        user_features = user_features_df.loc[user_id]
        car_features = car_features_df.loc[car_id]
        matches = []
        for col in user_features.index:
            if col.startswith('brand_') and user_features[col] > 0 and car_features[col] > 0:
                brand = col.replace('brand_', '')
                matches.append(f"{brand} brand")
            elif col.startswith('fuel_type_') and user_features[col] > 0 and car_features[col] > 0:
                fuel = col.replace('fuel_type_', '')
                matches.append(f"{fuel} fuel")
            elif col.startswith('transmission_') and user_features[col] > 0 and car_features[col] > 0:
                trans = col.replace('transmission_', '')
                matches.append(f"{trans} transmission")
            elif col.startswith('door_count_') and user_features[col] > 0 and car_features[col] > 0:
                doors = col.replace('door_count_', '')
                matches.append(f"{doors} doors")
        reason = f"Matches your preferences for {', '.join(matches) if matches else 'similar features'}"
        
        recommendations.append({
            'user_id': user_id,
            'car_id': car_id,
            'created_at': datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S+0000'),
            'rank': rank,
            'recommendation_reason': reason,
            'similarity_score': float(score)
        })

# Create recommendations DataFrame
rec_df = pd.DataFrame(recommendations)

# Debug: Recommendations summary
logging.info(f"Total recommendations: {len(rec_df)}")
logging.info("Sample recommendations:")
logging.info(rec_df[['user_id', 'car_id', 'rank', 'recommendation_reason', 'similarity_score']].head())

# Save to user_recommendations table
try:
    insert_query = """
    INSERT INTO user_recommendations (user_id, car_id, created_at, rank, recommendation_reason, similarity_score)
    VALUES (%s, %s, %s, %s, %s, %s)
    """
    for _, row in rec_df.iterrows():
        try:
            session.execute(
                insert_query,
                (
                    uuid.UUID(row['user_id']),
                    uuid.UUID(row['car_id']),
                    row['created_at'],
                    row['rank'],
                    row['recommendation_reason'],
                    row['similarity_score']
                )
            )
        except Exception as e:
            logging.error(f"Error inserting user_id={row['user_id']}, car_id={row['car_id']}, created_at={row['created_at']}: {e}")
except Exception as e:
    logging.error(f"Error inserting recommendations: {e}")
    cluster.shutdown()
    exit(1)

# Verify insertion
try:
    count = session.execute("SELECT COUNT(*) FROM user_recommendations").one()[0]
    logging.info(f"Total recommendations stored: {count}")
    rows = session.execute("SELECT user_id, car_id, rank, recommendation_reason, similarity_score FROM user_recommendations LIMIT 5")
    logging.info("\nSample recommendations from database:")
    for row in rows:
        logging.info(f"User: {row.user_id}, Car: {row.car_id}, Rank: {row.rank}, Reason: {row.recommendation_reason}, Score: {row.similarity_score:.2f}")
except Exception as e:
    logging.error(f"Error querying user_recommendations: {e}")

# Clean up
cluster.shutdown()
logging.info("Content-based filtering complete.")