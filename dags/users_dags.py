from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
import sys
import os
import pendulum
import logging

# Configuration logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ajouter le chemin du dossier data_generator
DATA_GENERATOR_DIR = '/home/hamzabji/projects/cars_recommandation_pipeline/data_generator'
sys.path.append(DATA_GENERATOR_DIR)
os.chdir(DATA_GENERATOR_DIR)

# Import seulement les fichiers que tu veux exécuter
from users import main as users_main
from user_preferences import main as user_preferences_main
from car_views_by_user import main as car_views_by_user_main
from favorite_cars import main as favorite_cars_main
from user_searches import main as user_searches_main

# Pas d'import de data.py ni de user_recommendations.py !

# Default args
default_args = {
    'owner': 'hamzabji',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
}

# Fonctions wrapper pour logging
def run_users(**kwargs):
    logger.info("Starting users.py")
    users_main()
    logger.info("Finished users.py")

def run_user_preferences(**kwargs):
    logger.info("Starting user_preferences.py")
    user_preferences_main()
    logger.info("Finished user_preferences.py")

def run_car_views_by_user(**kwargs):
    logger.info("Starting car_views_by_user.py")
    car_views_by_user_main()
    logger.info("Finished car_views_by_user.py")

def run_favorite_cars(**kwargs):
    logger.info("Starting favorite_cars.py")
    favorite_cars_main()
    logger.info("Finished favorite_cars.py")

def run_user_searches(**kwargs):
    logger.info("Starting user_searches.py")
    user_searches_main()
    logger.info("Finished user_searches.py")


# Timezone
local_tz = pendulum.timezone("Africa/Casablanca")

# DAG pour users.py (chaque heure)
with DAG(
    'generate_users_data',
    default_args=default_args,
    description='Generate synthetic users data every minute',
    schedule_interval='* * * * *',
    start_date=datetime(2025, 4, 29, tzinfo=local_tz),
    catchup=False,
    max_active_runs=1,
) as users_dag:

    generate_users = PythonOperator(
        task_id='generate_users',
        python_callable=run_users,
        provide_context=True,
    )

# DAG pour user_preferences.py (chaque 2 heures)
with DAG(
    'generate_user_preferences_data',
    default_args=default_args,
    description='Generate synthetic user preferences data every 2 hours',
    schedule_interval='0 */2 * * *',
    start_date=datetime(2025, 4, 29, tzinfo=local_tz),
    catchup=False,
    max_active_runs=1,
) as user_preferences_dag:

    generate_user_preferences = PythonOperator(
        task_id='generate_user_preferences',
        python_callable=run_user_preferences,
        provide_context=True,
    )

# DAG pour les autres (car_views_by_user.py, favorite_cars.py, user_searches.py, user_similarities.py) (chaque 3 heures)
with DAG(
    'generate_other_user_data',
    default_args=default_args,
    description='Generate other synthetic user data every 3 hours',
    schedule_interval='0 */3 * * *',
    start_date=datetime(2025, 4, 29, tzinfo=local_tz),
    catchup=False,
    max_active_runs=1,
) as other_users_data_dag:

    generate_car_views_by_user = PythonOperator(
        task_id='generate_car_views_by_user',
        python_callable=run_car_views_by_user,
        provide_context=True,
    )

    generate_favorite_cars = PythonOperator(
        task_id='generate_favorite_cars',
        python_callable=run_favorite_cars,
        provide_context=True,
    )

    generate_user_searches = PythonOperator(
        task_id='generate_user_searches',
        python_callable=run_user_searches,
        provide_context=True,
    )



    # Tous en parallèle
    [
        generate_car_views_by_user,
        generate_favorite_cars,
        generate_user_searches,
    ]
