import pandas as pd
from cassandra.cluster import Cluster
from cassandra.query import SimpleStatement
from uuid import UUID
from datetime import datetime
import json
import ast

# Configuration
CASSANDRA_HOST = ['127.0.0.1']  # Replace with your Cassandra host
KEYSPACE = 'cars_keyspace'
CSV_DIR = '/path/to/import/'  # Replace with the directory containing CSV files

# Connect to Cassandra
cluster = Cluster(CASSANDRA_HOST)
session = cluster.connect(KEYSPACE)

# Helper functions to parse complex types
def parse_set(value):
    if pd.isna(value) or value == '':
        return set()
    try:
        # Remove curly braces and split by comma
        return set(ast.literal_eval(value))
    except:
        return set(value.strip('{}').split(','))

def parse_map(value):
    if pd.isna(value) or value == '':
        return {}
    try:
        return json.loads(value.replace("'", '"'))
    except:
        return dict(item.split(':') for item in value.strip('{}').split(','))

def parse_uuid(value):
    return UUID(value) if value else None

def parse_timestamp(value):
    return datetime.strptime(value, '%Y-%m-%d %H:%M:%S.%f%z') if value else None

# Table configurations
TABLES = {
    'car_views_by_user': {
        'columns': ['user_id', 'view_date', 'view_timestamp', 'car_id', 'view_duration_seconds', 'view_source'],
        'types': {
            'view_timestamp': parse_timestamp,
            'view_duration_seconds': int
        },
        'query': """
        INSERT INTO car_views_by_user (user_id, view_date, view_timestamp, car_id, view_duration_seconds, view_source)
        VALUES (?, ?, ?, ?, ?, ?)
        """
    },
    'cleaned_cars': {
        'columns': ['id', 'brand', 'condition', 'creator', 'door_count', 'equipment', 'first_owner', 'fiscal_power',
                    'fuel_type', 'image_folder', 'mileage', 'model', 'origin', 'price', 'publication_date',
                    'sector', 'seller_city', 'source', 'title', 'transmission', 'year'],
        'types': {
            'id': parse_uuid,
            'door_count': lambda x: int(x) if pd.notna(x) else None,
            'fiscal_power': int,
            'mileage': int,
            'price': lambda x: int(x) if pd.notna(x) else None,
            'year': int
        },
        'query': """
        INSERT INTO cleaned_cars (id, brand, condition, creator, door_count, equipment, first_owner, fiscal_power,
                                  fuel_type, image_folder, mileage, model, origin, price, publication_date,
                                  sector, seller_city, source, title, transmission, year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
    },
    'favorite_cars_by_user': {
        'columns': ['user_id', 'added_date', 'added_timestamp', 'car_id'],
        'types': {
            'added_timestamp': parse_timestamp
        },
        'query': """
        INSERT INTO favorite_cars_by_user (user_id, added_date, added_timestamp, car_id)
        VALUES (?, ?, ?, ?)
        """
    },
    'user_preferences': {
        'columns': ['user_id', 'budget_max', 'budget_min', 'last_updated', 'mileage_max', 'mileage_min',
                    'preferred_brands', 'preferred_door_count', 'preferred_fuel_types', 'preferred_transmissions',
                    'preferred_years'],
        'types': {
            'budget_max': int,
            'budget_min': int,
            'last_updated': parse_timestamp,
            'mileage_max': int,
            'mileage_min': int,
            'preferred_brands': parse_set,
            'preferred_door_count': parse_set,
            'preferred_fuel_types': parse_set,
            'preferred_transmissions': parse_set,
            'preferred_years': parse_set
        },
        'query': """
        INSERT INTO user_preferences (user_id, budget_max, budget_min, last_updated, mileage_max, mileage_min,
                                     preferred_brands, preferred_door_count, preferred_fuel_types, preferred_transmissions,
                                     preferred_years)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
    },
    'user_recommendations': {
        'columns': ['user_id', 'recommendation_date', 'recommendation_timestamp', 'car_id', 'rank', 'recommendation_source', 'score'],
        'types': {
            'recommendation_timestamp': parse_timestamp,
            'rank': lambda x: int(x) if pd.notna(x) else None,
            'score': lambda x: float(x) if pd.notna(x) else None
        },
        'query': """
        INSERT INTO user_recommendations (user_id, recommendation_date, recommendation_timestamp, car_id, rank, recommendation_source, score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """
    },
    'user_searches': {
        'columns': ['user_id', 'search_date', 'search_timestamp', 'filters', 'result_count', 'search_query'],
        'types': {
            'search_timestamp': parse_timestamp,
            'filters': parse_map,
            'result_count': int
        },
        'query': """
        INSERT INTO user_searches (user_id, search_date, search_timestamp, filters, result_count, search_query)
        VALUES (?, ?, ?, ?, ?, ?)
        """
    },
    'user_similarities': {
        'columns': ['target_user_id', 'reference_user_id', 'last_updated', 'similarity_score'],
        'types': {
            'last_updated': parse_timestamp,
            'similarity_score': float
        },
        'query': """
        INSERT INTO user_similarities (target_user_id, reference_user_id, last_updated, similarity_score)
        VALUES (?, ?, ?, ?)
        """
    },
    'users': {
        'columns': ['user_id', 'age', 'created_at', 'email', 'location', 'password', 'username'],
        'types': {
            'age': int,
            'created_at': parse_timestamp
        },
        'query': """
        INSERT INTO users (user_id, age, created_at, email, location, password, username)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """
    }
}

# Import data from CSV files
for table_name, config in TABLES.items():
    print(f"Importing data into {table_name}...")
    csv_file = f"{CSV_DIR}{table_name}.csv"
    try:
        # Read CSV
        df = pd.read_csv(csv_file)
        if df.empty:
            print(f"No data in {csv_file}. Skipping.")
            continue

        # Prepare query
        query = SimpleStatement(config['query'])

        # Process each row
        for _, row in df.iterrows():
            # Convert values based on type
            values = []
            for col in config['columns']:
                value = row[col]
                if pd.isna(value):
                    values.append(None)
                else:
                    type_converter = config['types'].get(col, lambda x: x)
                    values.append(type_converter(value))
            
            # Execute INSERT
            session.execute(query, values)
        
        print(f"Imported {len(df)} rows into {table_name}.")
    
    except FileNotFoundError:
        print(f"CSV file {csv_file} not found. Skipping.")
    except Exception as e:
        print(f"Error importing {table_name}: {str(e)}")

# Cleanup
cluster.shutdown()
print("Import completed.")