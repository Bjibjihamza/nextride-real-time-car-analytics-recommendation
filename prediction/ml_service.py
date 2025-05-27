from flask import Flask, request, jsonify
import tensorflow as tf
import pandas as pd
import numpy as np
import pickle
from datetime import datetime
import logging
import os
from flask_cors import CORS

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Define paths
MODEL_PATH = 'improved_final_model.h5'
FEATURE_SCALER_PATH = 'feature_scaler.pkl'
TARGET_SCALER_PATH = 'target_scaler.pkl'
CATEGORICAL_MAPPINGS_PATH = 'categorical_mappings.pkl'

# Verify file existence
for path in [MODEL_PATH, FEATURE_SCALER_PATH, TARGET_SCALER_PATH, CATEGORICAL_MAPPINGS_PATH]:
    if not os.path.exists(path):
        logger.error(f"File not found at {path}")
        raise FileNotFoundError(f"File not found at {path}")

# Load the model and scalers
logger.info("Loading model and scalers...")
model = tf.keras.models.load_model(MODEL_PATH)
with open(FEATURE_SCALER_PATH, 'rb') as f:
    feature_scaler = pickle.load(f)
with open(TARGET_SCALER_PATH, 'rb') as f:
    target_scaler = pickle.load(f)
with open(CATEGORICAL_MAPPINGS_PATH, 'rb') as f:
    CATEGORICAL_MAPPINGS = pickle.load(f)
logger.info("Model, scalers, and categorical mappings loaded successfully")

# Define feature columns
FEATURE_COLUMNS = [
    'door_count', 'fiscal_power', 'mileage', 'year',
    'publication_year', 'publication_month', 'publication_day', 'publication_weekday',
    'is_weekend', 'days_since_posted',
    'alloy_wheels', 'airbags', 'air_conditioning', 'navigation_system', 'sunroof',
    'leather_seats', 'parking_sensors', 'rear_camera', 'electric_windows', 'abs',
    'esp', 'cruise_control', 'speed_limiter', 'cd_mp3_bluetooth', 'on_board_computer',
    'central_locking', 'brand', 'condition', 'fuel_type', 'model',
    'origin', 'first_owner', 'sector', 'seller_city', 'transmission'
]

# Equipment types
EQUIPMENT_TYPES = [
    "jantes aluminium", "airbags", "climatisation", "système de navigation/gps",
    "toit ouvrant", "sièges cuir", "radar de recul", "caméra de recul",
    "vitres électriques", "abs", "esp", "régulateur de vitesse",
    "limiteur de vitesse", "cd/mp3/bluetooth", "ordinateur de bord",
    "verrouillage centralisé"
]

# Equipment to column name mapping
EQUIPMENT_MAPPING = {
    'jantes_aluminium': 'alloy_wheels',
    'airbags': 'airbags',
    'climatisation': 'air_conditioning',
    'système_de_navigation_gps': 'navigation_system',
    'toit_ouvrant': 'sunroof',
    'sièges_cuir': 'leather_seats',
    'radar_de_recul': 'parking_sensors',
    'caméra_de_recul': 'rear_camera',
    'vitres_électriques': 'electric_windows',
    'abs': 'abs',
    'esp': 'esp',
    'régulateur_de_vitesse': 'cruise_control',
    'limiteur_de_vitesse': 'speed_limiter',
    'cd_mp3_bluetooth': 'cd_mp3_bluetooth',
    'ordinateur_de_bord': 'on_board_computer',
    'verrouillage_centralisé': 'central_locking'
}

def preprocess_input(data):
    logger.debug(f"Received input: {data}")
    try:
        # Convert input to DataFrame
        input_data = {col: [data.get(col, '')] for col in [
            'door_count', 'fiscal_power', 'mileage', 'year', 'publication_date',
            'equipment', 'first_owner', 'brand', 'condition', 'fuel_type', 'model',
            'origin', 'sector', 'seller_city', 'transmission'
        ]}
        df = pd.DataFrame(input_data)

        # Clean strings
        for col in df.columns:
            df[col] = df[col].replace('NaN', None).replace('', None)

        # Handle missing values
        df['door_count'] = df['door_count'].fillna(4).astype(float)
        df['fiscal_power'] = df['fiscal_power'].fillna(6).astype(float)
        df['mileage'] = df['mileage'].fillna(100000).astype(float)
        df['year'] = df['year'].fillna(2015).astype(float)
        df['first_owner'] = df['first_owner'].fillna('non').str.lower()
        df['brand'] = df['brand'].fillna('unknown').str.lower()
        df['condition'] = df['condition'].fillna('bon').str.lower()
        df['fuel_type'] = df['fuel_type'].fillna('diesel').str.lower()
        df['model'] = df['model'].fillna('unknown').str.lower()
        df['origin'] = df['origin'].fillna('ww au maroc').str.lower()
        df['sector'] = df['sector'].fillna('unknown').str.lower()
        df['seller_city'] = df['seller_city'].fillna('casablanca').str.lower()
        df['transmission'] = df['transmission'].fillna('manuelle').str.lower()
        df['publication_date'] = df['publication_date'].fillna('11/05/2025 00:00')

        # Feature engineering: Date features
        df['publication_date'] = pd.to_datetime(df['publication_date'], format='%d/%m/%Y %H:%M', errors='coerce')
        df['publication_year'] = df['publication_date'].dt.year.astype(float)
        df['publication_month'] = df['publication_date'].dt.month.astype(float)
        df['publication_day'] = df['publication_date'].dt.day.astype(float)
        df['publication_weekday'] = df['publication_date'].dt.dayofweek.astype(float)
        df['is_weekend'] = (df['publication_weekday'] >= 5).astype(float)
        df['days_since_posted'] = (datetime.now() - df['publication_date']).dt.days.astype(float)

        # Initialize equipment columns
        for col in FEATURE_COLUMNS:
            if col in EQUIPMENT_MAPPING.values():
                df[col] = 0.0

        # Process equipment
        equipment_str = df['equipment'].iloc[0].lower() if pd.notnull(df['equipment'].iloc[0]) else ''
        logger.debug(f"Equipment string: {equipment_str}")
        for eq in EQUIPMENT_TYPES:
            key = eq.lower().replace(' ', '_').replace('/', '_').replace('é', 'e')
            col_name = EQUIPMENT_MAPPING.get(key, key)
            if col_name in FEATURE_COLUMNS:
                value = 1.0 if eq.lower() in equipment_str else 0.0
                df[col_name] = value
                logger.debug(f"Created column {col_name}: {value}")

        df = df.drop(columns=['equipment', 'publication_date'])

        # Map categorical columns to numerical indices using CATEGORICAL_MAPPINGS
        for col in ['brand', 'condition', 'fuel_type', 'model', 'origin', 'first_owner', 'sector', 'seller_city', 'transmission']:
            try:
                mapping = CATEGORICAL_MAPPINGS[col]
                value = df[col].iloc[0]
                if value not in mapping:
                    logger.warning(f"Unknown value in {col}: {value}. Defaulting to 'unknown' or 0.0")
                    df[col] = mapping.get('unknown', 0.0)  # Fallback to 'unknown' or 0.0
                else:
                    df[col] = mapping[value]
            except KeyError as e:
                logger.error(f"Mapping for {col} not found in categorical_mappings.pkl")
                raise

        # Ensure all feature columns are present
        missing_cols = [col for col in FEATURE_COLUMNS if col not in df.columns]
        if missing_cols:
            logger.warning(f"Missing columns {missing_cols}. Adding with zeros.")
            for col in missing_cols:
                df[col] = 0.0

        # Reorder columns
        df = df[FEATURE_COLUMNS]

        # Scale features
        logger.debug(f"Scaling features with columns: {df.columns.tolist()}")
        input_scaled = feature_scaler.transform(df)
        logger.debug(f"Scaled data: {input_scaled[0].tolist()}")
        return input_scaled
    except Exception as e:
        logger.error(f"Preprocessing error: {str(e)}")
        raise

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        logger.info(f"Prediction request received: {data}")
        input_scaled = preprocess_input(data)
        pred_scaled = model.predict(input_scaled, verbose=0)
        pred_value = target_scaler.inverse_transform(pred_scaled)[0][0]
        logger.info(f"Predicted value: {pred_value}")
        return jsonify({'prediction': {'predictedPrice': float(pred_value)}})
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)