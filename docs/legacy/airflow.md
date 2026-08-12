# Airflow Installation Documentation

This document outlines the steps to install and set up Apache Airflow in a Conda environment on a Linux system, as performed on April 27, 2025. The goal was to automate the execution of Python scripts (`moteur_scraper.py` and `avito_scraper.py`) located in `~/projects/cars_recommandation_pipeline/scraping`.

## Prerequisites

- **System**: Linux (based on the user's home directory path `~/projects`).
- **Conda**: Miniconda installed with a Conda environment named `venv` (Python 3.12).
- **Python Scripts**: Located in `~/projects/cars_recommandation_pipeline/scraping`, including `moteur_scraper.py` and `avito_scraper.py`.

## Installation Steps

### 1. Activate the Conda Environment

Activate the pre-existing Conda environment `venv` to ensure all dependencies are installed in the correct environment.

```bash
conda activate venv
```

### 2. Install Apache Airflow

Install Airflow version 2.9.3 with compatible constraints for Python 3.12 to avoid dependency issues.

```bash
pip install apache-airflow==2.9.3 --constraint "https://raw.githubusercontent.com/apache/airflow/constraints-2.9.3/constraints-3.8.txt"
```

**Note**: The constraint file for Python 3.8 was used as a fallback since a Python 3.12-specific constraint file might not be available. This worked without issues.

### 3. Set Airflow Home Directory

Define the Airflow home directory and make it persistent by adding it to the user's shell configuration.

```bash
export AIRFLOW_HOME=~/airflow
echo 'export AIRFLOW_HOME=~/airflow' >> ~/.bashrc
source ~/.bashrc
```

- **Airflow Home**: Set to `~/airflow`, where Airflow will store its database, logs, and DAGs.

### 4. Initialize the Airflow Database

Initialize the Airflow metadata database using SQLite (default for testing).

```bash
airflow db init
```

**Output**:

```
DB: sqlite:////home/hamzabji/airflow/airflow.db
[2025-04-27T15:58:35.970+0000] {migration.py:215} INFO - Context impl SQLiteImpl.
[2025-04-27T15:58:35.971+0000] {migration.py:218} INFO - Will assume non-transactional DDL.
[2025-04-27T15:58:36.083+0000] {migration.py:215} INFO - Context impl SQLiteImpl.
[2025-04-27T15:58:36.083+0000] {migration.py:218} INFO - Will assume non-transactional DDL.
[2025-04-27T15:58:36.084+0000] {db.py:1625} INFO - Creating tables
INFO  [alembic.runtime.migration] Context impl SQLiteImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 405de8318b3a -> 375a816bbbf4, add new field 'clear_number' to dagrun
...
INFO  [alembic.runtime.migration] Running upgrade bff083ad727d -> 686269002441, Fix inconsistency between ORM and migration files.
WARNI [unusual_prefix_8f5e0e295351076e68d71925c351cdf183d64ea4_example_python_operator] The virtalenv_python example task requires virtualenv, please install it.
WARNI [unusual_prefix_18c9a172d40bfdaa5fcd0e95b076abfd1ef0d911_example_local_kubernetes_executor] Could not import DAGs in example_local_kubernetes_executor.py
Traceback (most recent call last):
  File "/home/hamzabji/projects/miniconda/envs/venv/lib/python3.12/site-packages/airflow/example_dags/example_local_kubernetes_executor.py", line 38, in <module>
    from kubernetes.client import models as k8s
ModuleNotFoundError: No module named 'kubernetes'
WARNI [unusual_prefix_18c9a172d40bfdaa5fcd0e95b076abfd1ef0d911_example_local_kubernetes_executor] Install Kubernetes dependencies with: pip install apache-airflow[cncf.kubernetes]
WARNI [unusual_prefix_a3e5f382a29c6cc1f79db22de6aa8709b9e825bd_tutorial_taskflow_api_virtualenv] The tutorial_taskflow_api_virtualenv example DAG requires virtualenv, please install it.
WARNI [unusual_prefix_aa88a66de29db775108f64241604696bf30b8216_example_kubernetes_executor] The example_kubernetes_executor example DAG requires the kubernetes provider. Please install it with: pip install apache-airflow[cncf.kubernetes]
WARNI [unusual_prefix_479c26faf7d1ceecaa99dc8a16638e9f1a322ac7_example_python_decorator] The virtalenv_python example task requires virtualenv, please install it.
WARNI [airflow.models.crypto] empty cryptography key - values will not be stored encrypted.
Initialization done
```

**Notes on Output**:

- A deprecation warning appeared: `db init` is deprecated in Airflow 2.9.3. Future versions should use `airflow db migrate` and `airflow connections create-default-connections`.
- Warnings about missing `virtualenv` and `kubernetes` dependencies are related to Airflow's example DAGs, which were not needed for this setup.
- A cryptography warning indicates that sensitive data will not be encrypted due to the absence of a Fernet key. This is acceptable for a local/test setup.
- The database was successfully created at `~/airflow/airflow.db`.

### 5. Create an Admin User

Create an admin user to access the Airflow web interface.

```bash
airflow users create \
    --username admin \
    --firstname Admin \
    --lastname User \
    --role Admin \
    --email admin@example.com
```

- **Prompt**: Enter a password when prompted.
- This user allows login to the Airflow web UI at `http://localhost:8080`.

### 6. Start Airflow Services

Run the Airflow webserver and scheduler to make the system operational.

- **Webserver** (in one terminal):
    
    ```bash
    conda activate venv
    airflow webserver --port 8080
    ```
    
- **Scheduler** (in another terminal):
    
    ```bash
    conda activate venv
    airflow scheduler
    ```
    

### 7. Verify the Installation via Web UI

Access the Airflow web interface at `http://localhost:8080` and log in with the admin credentials.

**Observations**:

- The web UI displayed several example DAGs (e.g., `example_params_ui_tutorial`, `dataset_produces_1`).
- A warning about SQLite appeared: "Do not use SQLite metadata DB in production -- it should only be used for dev/testing."
- Another warning indicated the scheduler hadn't received a heartbeat in 3 weeks, likely because the scheduler was recently started or had been stopped.

## Additional Notes

- **Dependencies**: The environment included `yarl-1.9.4` and `zipp-3.19.2`, which were compatible with Airflow 2.9.3.
- **Example DAGs**: To suppress warnings about example DAGs, you can disable them by editing `~/airflow/airflow.cfg`:
    
    ```bash
    sed -i 's/load_examples = True/load_examples = False/' ~/airflow/airflow.cfg
    ```
    
- **Production Recommendations**:
    - Use PostgreSQL or MySQL instead of SQLite for production.
    - Set a Fernet key in `airflow.cfg` for encryption of sensitive data.

## Conclusion

The installation of Apache Airflow 2.9.3 in the Conda environment `venv` was successful. The system is ready to automate the execution of scripts in `~/projects/cars_recommandation_pipeline/scraping` by creating a custom DAG in `~/airflow/dags`.