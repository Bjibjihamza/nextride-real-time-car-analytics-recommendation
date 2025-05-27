from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
import os
import sys
import pendulum
import logging

# Configuration
MODEL_DIR = '/home/hamzabji/projects/cars_recommandation_pipeline/prediction'
sys.path.append(MODEL_DIR)

# Import the main function from model.py
from model import main as train_model

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Timezone
local_tz = pendulum.timezone("Africa/Casablanca")

default_args = {
    'owner': 'hamzabji',
    'depends_on_past': False,
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
}

# Function wrapper for training
def run_model_training(**kwargs):
    logger.info("🚀 Starting model training...")
    try:
        train_model()
        logger.info("✅ Model training completed successfully.")
    except Exception as e:
        logger.error(f"Training failed: {str(e)}")
        raise

# Define the DAG
with DAG(
    dag_id='monthly_model_training',
    default_args=default_args,
    description='DAG to train the car price prediction model monthly at 2 AM',
    schedule_interval='0 2 1 * *',  # Run at 2 AM on the 1st of every month
    start_date=datetime(2025, 6, 1, tzinfo=local_tz),
    catchup=False,
    max_active_runs=1,
    tags=['ml', 'training'],
) as dag:

    training_task = PythonOperator(
        task_id='train_car_price_model',
        python_callable=run_model_training,
        provide_context=True,
    )