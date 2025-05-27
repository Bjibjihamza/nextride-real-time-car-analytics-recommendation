from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.exceptions import AirflowSkipException
import sys
import os
import pendulum
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add your scripts' directory to PYTHONPATH and set working directory
SCRAPING_DIR = '/home/hamzabji/projects/cars_recommandation_pipeline/scraping'
sys.path.append(SCRAPING_DIR)
os.chdir(SCRAPING_DIR)  # Set working directory to handle relative paths

# Import main functions from your scripts
from avito_scraper import main as avito_main
from moteur_scraper import main as moteur_main

# Define default arguments for both DAGs
default_args = {
    'owner': 'hamzabji',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
}

# Function to check if current time is between 8:00 and 00:00
def check_time_window(**kwargs):
    local_tz = pendulum.timezone("Africa/Casablanca")  # Adjust to your timezone if different
    now = datetime.now(local_tz)
    hour = now.hour
    
    if not (8 <= hour < 24):
        logger.info(f"Skipping execution: Time {now} is outside 8:00-00:00 window")
        raise AirflowSkipException(f"Skipping execution: Time {now} is outside 8:00-00:00 window")

# Wrapper function to run avito_main with logging
def run_avito_scraper(**kwargs):
    logger.info("Starting avito_scraper execution")
    try:
        avito_main()
        logger.info("avito_scraper completed successfully")
    except Exception as e:
        logger.error(f"avito_scraper failed: {str(e)}")
        raise

# Wrapper function to run moteur_main with logging
def run_moteur_scraper(**kwargs):
    logger.info("Starting moteur_scraper execution")
    try:
        moteur_main()
        logger.info("moteur_scraper completed successfully")
    except Exception as e:
        logger.error(f"moteur_scraper failed: {str(e)}")
        raise

# DAG for avito_scraper (every 15 minutes between 8:00 and 00:00)
with DAG(
    'avito_scraping_pipeline',
    default_args=default_args,
    description='Pipeline to scrape Avito data every 15 minutes between 8:00 and 00:00',
    schedule_interval='*/15 8-23 * * *',  # Every 15 minutes from 8:00 to 23:59
    start_date=datetime(2025, 4, 27, tzinfo=pendulum.timezone("Africa/Casablanca")),
    catchup=False,
    max_active_runs=1,  # Limit to 1 active run to manage Selenium resource usage
) as avito_dag:

    # Task to check time window
    check_avito_time = PythonOperator(
        task_id='check_avito_time_window',
        python_callable=check_time_window,
        provide_context=True,
    )

    # Task to run avito_scraper
    avito_task = PythonOperator(
        task_id='run_avito_scraper',
        python_callable=run_avito_scraper,
        provide_context=True,
    )

    # Define task dependencies
    check_avito_time >> avito_task

# DAG for moteur_scraper (every 30 minutes between 8:00 and 00:00)
with DAG(
    'moteur_scraping_pipeline',
    default_args=default_args,
    description='Pipeline to scrape Moteur data every 30 minutes between 8:00 and 00:00',
    schedule_interval='*/30 8-23 * * *',  # Every 30 minutes from 8:00 to 23:59
    start_date=datetime(2025, 4, 27, tzinfo=pendulum.timezone("Africa/Casablanca")),
    catchup=False,
    max_active_runs=1,  # Limit to 1 active run to manage Selenium resource usage
) as moteur_dag:

    # Task to check time window
    check_moteur_time = PythonOperator(
        task_id='check_moteur_time_window',
        python_callable=check_time_window,
        provide_context=True,
    )

    # Task to run moteur_scraper
    moteur_task = PythonOperator(
        task_id='run_moteur_scraper',
        python_callable=run_moteur_scraper,
        provide_context=True,
    )

    # Define task dependencies
    check_moteur_time >> moteur_task