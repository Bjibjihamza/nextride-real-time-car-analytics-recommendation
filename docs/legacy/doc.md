# Big Data Project Documentation: Car Listings Pipeline

## 1. Introduction

The car listings pipeline is a big data system for scraping, processing, storing, and generating synthetic data for car recommendations and price predictions. It integrates web scraping, Apache Kafka for data streaming, Apache Spark for data processing, Apache Cassandra for storage, Python scripts for synthetic user data, recommendations, and a neural network-based price prediction system. The pipeline supports a backend API and frontend application by providing cleaned car listings, user interaction data, personalized recommendations, and price predictions.

**Components**:

- **Scraping**: Collects car listings from Avito (`avito_scraper.py`) and Moteur (`moteur_scraper.py`).
- **Kafka**: Streams raw data to topics (`avito_cars`, `moteur_cars`).
- **Spark**: Cleans and processes data, storing results in Cassandra (`cleaned_cars`).
- **Cassandra**: Stores car listings, user data, and predictions in `cars_keyspace`.
- **Synthetic Data**: Generates users, preferences, views, favorites, searches, recommendations, and predictions.
- **Recommendation System**: Generates personalized car recommendations using collaborative and content-based filtering.
- **Price Prediction System**: Predicts car prices using a neural network served via a Flask API.

This documentation covers environment setup, database configuration, data ingestion, synthetic data generation, recommendation system, price prediction system, and troubleshooting for the pipeline in `~/projects/cars_recommandation_pipeline`.

## 2. Environment Configuration

This section outlines the setup for Conda, Spark, Cassandra, and Kafka on Ubuntu.

### 2.1 Conda Environment Setup

#### Install Conda

```bash
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh
conda --version
```

#### Create Conda Environment

```bash
conda create -n cenv python=3.10
conda activate cenv
```

#### Install Dependencies

```bash
pip install selenium==4.25.0 webdriver-manager==4.0.2 requests==2.32.3 pandas==2.2.3 kafka-python==2.0.2 pyspark==3.5.0 cassandra-driver==3.29.2 findspark==2.0.1 faker==30.8.0 bcrypt==4.2.0 scikit-learn==1.5.2 scipy==1.14.1 tensorflow==2.17.0 flask==3.0.3
```

#### Verify Installation

```bash
python --version
pip list
```

- Expect: Python 3.10, with `selenium`, `webdriver-manager`, `requests`, `pandas`, `kafka-python`, `pyspark`, `cassandra-driver`, `findspark`, `faker`, `bcrypt`, `scikit-learn`, `scipy`, `tensorflow`, `flask`.

### 2.2 Apache Spark Installation and Configuration

#### Install Java

```bash
sudo apt-get update
sudo apt-get install -y openjdk-11-jdk
echo 'export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64' >> ~/.bashrc
source ~/.bashrc
java -version
```

#### Download and Extract Spark

```bash
cd ~/Downloads
wget https://archive.apache.org/dist/spark/spark-3.5.0/spark-3.5.0-bin-hadoop3.tgz
tar -xzf spark-3.5.0-bin-hadoop3.tgz
sudo mv spark-3.5.0-bin-hadoop3 /opt/spark-3.5.0
```

#### Set Environment Variables

```bash
echo 'export SPARK_HOME=/opt/spark-3.5.0' >> ~/.bashrc
echo 'export PATH=$SPARK_HOME/bin:$PATH' >> ~/.bashrc
echo 'export PYSPARK_PYTHON=python3' >> ~/.bashrc
source ~/.bashrc
```

#### Install Spark-Cassandra Connector

```bash
wget https://repo1.maven.org/maven2/com/datastax/spark/spark-cassandra-connector_2.12/3.5.0/spark-cassandra-connector_2.12-3.5.0.jar -P /opt/spark-3.5.0/jars/
```

#### Configure Spark Defaults

```bash
echo 'spark.cassandra.connection.host=localhost' > /opt/spark-3.5.0/conf/spark-defaults.conf
echo 'spark.cassandra.connection.port=9042' >> /opt/spark-3.5.0/conf/spark-defaults.conf
echo 'spark.jars.packages=org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,com.datastax.spark:spark-cassandra-connector_2.12:3.5.0' >> /opt/spark-3.5.0/conf/spark-defaults.conf
```

#### Verify Spark

```bash
/opt/spark-3.5.0/bin/spark-shell
/opt/spark-3.5.0/bin/pyspark
```

- Check logs if errors:
    
    ```bash
    tail -f /opt/spark-3.5.0/logs/*
    ```
    

### 2.3 Apache Cassandra Installation and Configuration

#### Uninstall Existing Cassandra (If Present)

```bash
sudo systemctl stop cassandra
sudo systemctl disable cassandra
sudo apt-get remove --purge cassandra cassandra-tools
sudo apt-get autoremove
sudo rm -rf /var/lib/cassandra /var/log/cassandra /etc/cassandra /usr/share/cassandra
sudo rm -f /usr/bin/cqlsh /usr/bin/cqlsh.py
sudo rm -f /etc/apt/sources.list.d/cassandra*
sudo apt-get update
```

#### Download and Extract Cassandra

```bash
cd ~
wget https://archive.apache.org/dist/cassandra/4.1.3/apache-cassandra-4.1.3-bin.tar.gz
tar -xzf apache-cassandra-4.1.3-bin.tar.gz
mv apache-cassandra-4.1.3 cassandra
```

#### Set Environment Variables

```bash
echo 'export CASSANDRA_HOME=$HOME/cassandra' >> ~/.bashrc
echo 'export PATH=$CASSANDRA_HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### Install Java

```bash
sudo apt-get update
sudo apt-get install -y openjdk-11-jdk
java -version
```

#### Install Python Dependencies

```bash
conda activate cenv
pip install cassandra-driver==3.29.2
pip show cassandra-driver
```

#### Start Cassandra

```bash
~/cassandra/bin/cassandra -R
```

#### Verify Cassandra

```bash
~/cassandra/bin/cqlsh -e "SELECT release_version FROM system.local;"
```

- Expect: `4.1.3`.
- Check logs if errors:
    
    ```bash
    tail -f ~/cassandra/logs/system.log
    ```
    

### 2.4 Apache Kafka Installation and Configuration

#### Install Java

```bash
sudo apt-get update
sudo apt-get install -y openjdk-11-jdk
java -version
```

#### Download and Extract Kafka

```bash
cd ~
wget https://downloads.apache.org/kafka/3.9.0/kafka_2.13-3.9.0.tgz
rm -rf ~/kafka
tar -xzf kafka_2.13-3.9.0.tgz
mv kafka_2.13-3.9.0 ~/kafka
```

#### Create Data Directories

```bash
mkdir -p ~/kafka/data/kafka-logs ~/kafka/data/zookeeper
chown -R hamzabji:hamzabji ~/kafka
```

#### Configure ZooKeeper

```bash
echo 'dataDir=/home/hamzabji/kafka/data/zookeeper' > ~/kafka/config/zookeeper.properties
echo 'clientPort=2181' >> ~/kafka/config/zookeeper.properties
echo 'maxClientCnxns=50' >> ~/kafka/config/zookeeper.properties
echo 'admin.enableServer=false' >> ~/kafka/config/zookeeper.properties
echo 'tickTime=2000' >> ~/kafka/config/zookeeper.properties
echo 'initLimit=10' >> ~/kafka/config/zookeeper.properties
echo 'syncLimit=5' >> ~/kafka/config/zookeeper.properties
```

#### Configure Kafka

```bash
echo 'broker.id=0' > ~/kafka/config/server.properties
echo 'listeners=PLAINTEXT://0.0.0.0:9092' >> ~/kafka/config/server.properties
echo 'advertised.listeners=PLAINTEXT://localhost:9092' >> ~/kafka/config/server.properties
echo 'num.partitions=1' >> ~/kafka/config/server.properties
echo 'default.replication.factor=1' >> ~/kafka/config/server.properties
echo 'log.dirs=/home/hamzabji/kafka/data/kafka-logs' >> ~/kafka/config/server.properties
echo 'zookeeper.connect=localhost:2181' >> ~/kafka/config/server.properties
```

#### Set Environment Variables

```bash
echo 'export KAFKA_HOME=/home/hamzabji/kafka' >> ~/.bashrc
echo 'export PATH=$PATH:$KAFKA_HOME/bin' >> ~/.bashrc
source ~/.bashrc
```

#### Start ZooKeeper and Kafka

```bash
~/kafka/bin/zookeeper-server-start.sh -daemon ~/kafka/config/zookeeper.properties
~/kafka/bin/kafka-server-start.sh -daemon ~/kafka/config/server.properties
```

#### Create Kafka Topics

```bash
~/kafka/bin/kafka-topics.sh --create --topic avito_cars --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
~/kafka/bin/kafka-topics.sh --create --topic moteur_cars --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
```

#### Verify Kafka

```bash
~/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092
ps -ef | grep kafka
tail -f ~/kafka/logs/zookeeper.out
tail -f ~/kafka/logs/server.log
```

## 3. Database Configuration

This section describes the Cassandra database setup for `cars_keyspace`, including all tables required for car listings, user data, recommendations, and predictions.

### 3.1 Cassandra Keyspace

```sql
CREATE KEYSPACE IF NOT EXISTS cars_keyspace
WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};
```

### 3.2 Cassandra Tables

#### Cleaned Cars Table

Stores processed car listings from Avito and Moteur.

```sql
CREATE TABLE IF NOT EXISTS cars_keyspace.cleaned_cars (
    id uuid PRIMARY KEY,
    brand text,
    model text,
    title text,
    price int,
    fuel_type text,
    transmission text,
    year int,
    door_count int,
    seller_city text,
    sector text,
    publication_date text,
    condition text,
    equipment text,
    first_owner text,
    fiscal_power int,
    image_folder text,
    mileage int,
    origin text,
    source text,
    creator text
);
```

#### Users Table

Stores user profiles.

```sql
CREATE TABLE IF NOT EXISTS cars_keyspace.users (
    user_id uuid PRIMARY KEY,
    username text,
    email text,
    password text,
    age int,
    location text,
    created_at timestamp
);
```

#### User Preferences Table

Stores user car preferences.

```sql
CREATE TABLE IF NOT EXISTS cars_keyspace.user_preferences (
    user_id uuid PRIMARY KEY,
    preferred_brands set<text>,
    preferred_fuel_types set<text>,
    preferred_transmissions set<text>,
    budget_min int,
    budget_max int,
    mileage_min int,
    mileage_max int,
    preferred_years set<int>,
    preferred_door_count set<int>,
    last_updated timestamp
);
```

#### Car Views by User Table

Tracks user car view interactions.

```sql
CREATE TABLE IF NOT EXISTS cars_keyspace.car_views_by_user (
    user_id uuid,
    view_date date,
    view_timestamp timestamp,
    car_id uuid,
    view_duration_seconds int,
    view_source text,
    PRIMARY KEY ((user_id, view_date), view_timestamp)
) WITH CLUSTERING ORDER BY (view_timestamp DESC);
```

#### Favorite Cars by User Table

Stores user favorite cars.

```sql
CREATE TABLE IF NOT EXISTS cars_keyspace.favorite_cars_by_user (
    user_id uuid,
    added_date date,
    added_timestamp timestamp,
    car_id uuid,
    PRIMARY KEY ((user_id, added_date), added_timestamp, car_id)
) WITH CLUSTERING ORDER BY (added_timestamp DESC);
```

#### User Searches Table

Stores user search queries and filters.

```sql
CREATE TABLE IF NOT EXISTS cars_keyspace.user_searches (
    user_id uuid,
    search_date date,
    search_timestamp timestamp,
    search_query text,
    filters map<text, text>,
    result_count int,
    PRIMARY KEY ((user_id, search_date), search_timestamp)
) WITH CLUSTERING ORDER BY (search_timestamp DESC);
```

#### User Recommendations Table

Stores precomputed car recommendations.

```sql
CREATE TABLE IF NOT EXISTS cars_keyspace.user_recommendations (
    user_id uuid,
    car_id uuid,
    created_at timestamp,
    rank int,
    similarity_score float,
    recommendation_reason text,
    PRIMARY KEY (user_id, car_id)
);
```

#### Car Predictions Table

Stores price predictions.

```sql
CREATE TABLE IF NOT EXISTS cars_keyspace.car_predictions (
    prediction_id uuid PRIMARY KEY,
    user_id uuid,
    car_features map<text, text>,
    predicted_price float,
    prediction_timestamp timestamp
);
```

### 3.3 Schema Explanation

- **cleaned_cars**: Stores car listings with attributes like `brand`, `price`, `source`. `id` (UUID) is the primary key.
- **users**: Stores user data (e.g., `username`, hashed `password`). `user_id` (UUID) is the primary key.
- **user_preferences**: Stores preferences (e.g., `preferred_brands`, `budget_min/max`). Uses `set` for multi-valued fields.
- **car_views_by_user**: Tracks views, partitioned by `user_id` and `view_date`.
- **favorite_cars_by_user**: Stores favorites, partitioned by `user_id` and `added_date`.
- **user_searches**: Stores searches, partitioned by `user_id` and `search_date`.
- **user_recommendations**: Stores recommendations with `similarity_score`, `recommendation_reason`, `created_at`, and `rank`.
- **car_predictions**: Stores ML price predictions with `car_features`.

### 3.4 Verification

1. **Create Keyspace and Tables**:
    
    ```bash
    ~/cassandra/bin/cqlsh
    ```
    
    Execute the CQL commands or save to a file:
    
    ```bash
    nano ~/projects/cars_recommandation_pipeline/recreate_cars_keyspace.cql
    ```
    
    Paste the CQL commands, then run:
    
    ```bash
    ~/cassandra/bin/cqlsh -f ~/projects/cars_recommandation_pipeline/recreate_cars_keyspace.cql
    ```
    
2. **Verify Schema**:
    
    ```sql
    DESCRIBE KEYSPACE cars_keyspace;
    DESCRIBE TABLE cars_keyspace.cleaned_cars;
    DESCRIBE TABLE cars_keyspace.users;
    DESCRIBE TABLE cars_keyspace.user_preferences;
    DESCRIBE TABLE cars_keyspace.car_views_by_user;
    DESCRIBE TABLE cars_keyspace.favorite_cars_by_user;
    DESCRIBE TABLE cars_keyspace.user_searches;
    DESCRIBE TABLE cars_keyspace.user_recommendations;
    DESCRIBE TABLE cars_keyspace.car_predictions;
    ```
    

## 4. Data Ingestion and Processing

This section describes scraping car listings, streaming via Kafka, and processing with Spark to populate `cleaned_cars`.

### 4.1 Overview

- **Scraping**: `avito_scraper.py` and `moteur_scraper.py` collect car listings and send them to Kafka topics.
- **Kafka**: Streams raw data to Spark.
- **Spark**: `spark_cleaning.py` cleans data and stores it in `cleaned_cars`.

### 4.2 Prerequisites

- Kafka running:
    
    ```bash
    ~/kafka/bin/zookeeper-server-start.sh -daemon ~/kafka/config/zookeeper.properties
    ~/kafka/bin/kafka-server-start.sh -daemon ~/kafka/config/server.properties
    ```
    
- Cassandra running:
    
    ```bash
    ~/cassandra/bin/cassandra -R
    ```
    
- Conda environment:
    
    ```bash
    conda activate cenv
    ```
    

### 4.3 Execution Steps

1. **Run Scraping Scripts**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/scraping
    python avito_scraper.py
    python moteur_scraper.py
    ```
    
2. **Verify Kafka Topics**:
    
    ```bash
    ~/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092
    ```
    
    - Expect: `avito_cars`, `moteur_cars`.
    - Check data (optional):
        
        ```bash
        ~/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic avito_cars --from-beginning
        ~/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic moteur_cars --from-beginning
        ```
        
3. **Run Spark Processing**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline
    /opt/spark-3.5.0/bin/spark-submit --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,com.datastax.spark:spark-cassandra-connector_2.12:3.5.0 spark_cleaning.py
    ```
    
4. **Verify Data in Cassandra**:
    
    ```bash
    ~/cassandra/bin/cqlsh
    ```
    
    ```sql
    SELECT COUNT(*) FROM cars_keyspace.cleaned_cars;
    ```
    

### 4.4 Notes

- Ensure Kafka and Cassandra are running before scraping.
- `spark_cleaning.py` requires Kafka and Cassandra connectors.
- Check Spark logs if errors occur:
    
    ```bash
    tail -f /opt/spark-3.5.0/logs/*
    ```
    

## 5. Synthetic Data Generation

This section describes generating synthetic user data for testing recommendations and predictions.

### 5.1 Overview

Scripts in `~/projects/cars_recommandation_pipeline/data_generator` generate:

- `users.py`: User profiles (`users`, `user_preferences`).
- `user_preferences.py`: Updates `user_preferences`.
- `car_views_by_user.py`: Car view interactions.
- `favorite_cars.py`: Favorite cars.
- `user_searches.py`: Search queries.
- `car_predictions.py`: Price predictions (placeholder).

### 5.2 Prerequisites

- Cassandra running:
    
    ```bash
    ~/cassandra/bin/cassandra -R
    ```
    
- `cleaned_cars` populated.
- Conda environment with `faker`, `bcrypt`, `cassandra-driver`.

### 5.3 Execution Steps

1. **Navigate to Scripts Directory**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/data_generator
    conda activate cenv
    ```
    
2. **Run Scripts**:
    
    ```bash
    python users.py
    python user_preferences.py
    python car_views_by_user.py
    python favorite_cars.py
    python user_searches.py
    ```
    
3. **Verify Data**:
    
    ```bash
    ~/cassandra/bin/cqlsh
    ```
    
    ```sql
    SELECT COUNT(*) FROM cars_keyspace.users;
    SELECT COUNT(*) FROM cars_keyspace.user_preferences;
    SELECT COUNT(*) FROM cars_keyspace.car_views_by_user;
    SELECT COUNT(*) FROM cars_keyspace.favorite_cars_by_user;
    SELECT COUNT(*) FROM cars_keyspace.user_searches;
    ```
    

### 5.4 Script Details

- **users.py**: Generates users with `user_id` (UUID), `username`, `email`, hashed `password`, `age`, `location`.
- **user_preferences.py**: Sets `preferred_brands`, `fuel_types`, `budget`, etc.
- **car_views_by_user.py**: Generates 1-5 views per user based on preferences.
- **favorite_cars.py**: Assigns 1-3 favorite cars per user.
- **user_searches.py**: Generates searches with filters (e.g., `brand`, `budget_max`).

### 5.5 Notes

- Run `users.py` multiple times for more users.
- Scripts query `cleaned_cars` for car data.
- Assumes Cassandra at `localhost:9042`.

## 6. Recommendation System

This section describes generating personalized car recommendations using `combined_recommendations.py`.

### 6.1 Overview

The `combined_recommendations.py` script in `~/projects/cars_recommandation_pipeline/backend/scripts` generates recommendations for a specified user using:

- **User-Based Collaborative Filtering**: Recommends cars based on similar users’ views and favorites.
- **Item-Based Collaborative Filtering**: Recommends cars similar to those the user has viewed or favorited.
- **Content-Based Filtering**: Recommends cars matching user preferences (e.g., brand, budget).
- **Hybrid Filtering**: Combines collaborative and content-based scores using SVD and cosine similarity.

Recommendations are stored in `user_recommendations` with `similarity_score`, `recommendation_reason`, `created_at`, and `rank`.

### 6.2 Prerequisites

- Cassandra running:
    
    ```bash
    ~/cassandra/bin/cassandra -R
    ```
    
- `cleaned_cars`, `users`, `user_preferences`, `car_views_by_user`, `favorite_cars_by_user` populated.
- Conda environment with `scikit-learn`, `scipy`, `pandas`, `numpy`, `cassandra-driver`.

### 6.3 Execution Steps

1. **Navigate to Scripts Directory**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/backend/scripts
    conda activate cenv
    ```
    
2. **Run Recommendation Script**:
    
    ```bash
    python combined_recommendations.py <user_id>
    ```
    
    - Replace `<user_id>` with a valid UUID (e.g., `dc7f6db7-2a8f-4d39-b66e-f00967c287f2`).
3. **Verify Recommendations**:
    
    ```bash
    ~/cassandra/bin/cqlsh
    ```
    
    ```sql
    SELECT * FROM cars_keyspace.user_recommendations WHERE user_id = <user_id>;
    ```
    

### 6.4 Script Details

- **Input**: `user_id` (UUID) via command-line argument.
- **Process**:
    - Fetches data from `cleaned_cars`, `car_views_by_user`, `favorite_cars_by_user`, `user_preferences`.
    - Deletes existing recommendations for the user.
    - Generates up to 3 recommendations per method (user-based, item-based, content-based, hybrid).
    - Uses cosine similarity, SVD, and recency weighting for scoring.
    - Stores results in `user_recommendations` with `rank` and `created_at`.
- **Output**: Up to 12 recommendations (3 per method) with `similarity_score` (0-1) and `recommendation_reason`.

### 6.5 Notes

- Ensure sufficient data in `car_views_by_user` and `favorite_cars_by_user` for collaborative filtering.
- Fallback recommendations are used if data is sparse.
- Run the script via the backend API for integration (see Frontend and Backend Documentation).

## 7. Price Prediction System

This section describes training and deploying a neural network for car price prediction using `model.py` and `ml_service.py`.

### 7.1 Overview

The price prediction system uses a deep neural network trained on `preprocessed_data.csv` to predict car prices based on numerical, categorical, and equipment features. The model is served via a Flask API (`ml_service.py`) at `http://localhost:5001/predict`, integrated with the backend (`predictionController.js`) and frontend (`PredictionPage.js`).

### 7.2 Components

- **model.py**:
    - Loads `preprocessed_data.csv` using Spark.
    - Features: `door_count`, `mileage`, `year`, `brand`, `fuel_type`, `equipment`, etc.
    - Preprocessing: `RobustScaler` for numerical features, `LabelEncoder` for categorical features.
    - Training: 5-fold cross-validation with ensemble prediction, final model trained on all data.
    - Outputs: `improved_final_model.h5`, `feature_scaler.pkl`, `target_scaler.pkl`, `label_encoders.pkl`.
- **ml_service.py**:
    - Flask API with `/predict` endpoint.
    - Accepts JSON input with car features (e.g., `door_count`, `mileage`, `equipment`).
    - Preprocesses input using `feature_scaler.pkl`, `target_scaler.pkl`, `categorical_mappings.pkl`.
    - Returns predicted price in original scale.
- **Artifacts**:
    - `improved_final_model.h5`: Final trained model.
    - `feature_scaler.pkl`: Scaler for input features.
    - `target_scaler.pkl`: Scaler for target price.
    - `categorical_mappings.pkl`: Mappings for categorical variables.
    - `preprocessed_data.csv`: Training data.

### 7.3 Prerequisites

- Cassandra running:
    
    ```bash
    ~/cassandra/bin/cassandra -R
    ```
    
- `cleaned_cars` populated.
- Conda environment with `tensorflow`, `flask`, `pandas`, `numpy`, `scikit-learn`, `pyspark`.
- GPU (optional) for faster training.

### 7.4 Execution Steps

1. **Train Model (Optional)**:
    
    - If retraining is needed:
        
        ```bash
        cd ~/projects/cars_recommandation_pipeline/prediction
        conda activate cenv
        python model.py
        ```
        
    - Generates `improved_final_model.h5`, `feature_scaler.pkl`, `target_scaler.pkl`, `label_encoders.pkl`.
2. **Run ML Service**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/prediction
    conda activate cenv
    python ml_service.py
    ```
    
    - Runs Flask API at `http://localhost:5001/predict`.
3. **Verify ML Service**:
    
    ```bash
    curl -X POST http://localhost:5001/predict -H "Content-Type: application/json" -d '{"door_count": 4, "fiscal_power": 6, "mileage": 100000, "year": 2015, "publication_date": "11/05/2025 00:00", "equipment": "jantes aluminium, airbags, climatisation", "first_owner": "non", "brand": "toyota", "condition": "bon", "fuel_type": "diesel", "model": "corolla", "origin": "ww au maroc", "sector": "casablanca", "seller_city": "casablanca", "transmission": "manuelle"}'
    ```
    
    - Expect: JSON response with `predictedPrice`.
4. **Verify Predictions in Cassandra**:
    
    ```bash
    ~/cassandra/bin/cqlsh
    ```
    
    ```sql
    SELECT * FROM cars_keyspace.car_predictions;
    ```
    

### 7.5 Notes

- Ensure `preprocessed_data.csv` and `categorical_mappings.pkl` are present.
- The ML service must be running for backend predictions.
- Test the `/api/prediction` endpoint via the frontend (`PredictionPage.js`).

## 8. Troubleshooting

- **Cassandra Errors**:
    
    - Verify service:
        
        ```bash
        netstat -tuln | grep 9042
        ```
        
    - Fix `cqlsh` issues:
        
        ```bash
        conda activate cenv
        pip install cassandra-driver==3.29.2
        ```
        
- **Kafka Errors**:
    
    - Check logs:
        
        ```bash
        tail -f ~/kafka/logs/zookeeper.out
        tail -f ~/kafka/logs/server.log
        ```
        
    - Restart:
        
        ```bash
        ~/kafka/bin/kafka-server-stop.sh
        ~/kafka/bin/zookeeper-server-stop.sh
        ```
        
- **Spark Errors**:
    
    - Verify connectors:
        
        ```bash
        ls /opt/spark-3.5.0/jars/spark-cassandra-connector_2.12-3.5.0.jar
        ```
        
    - Check logs:
        
        ```bash
        tail -f /opt/spark-3.5.0/logs/*
        ```
        
- **Scraping Failures**:
    
    - Update Selenium:
        
        ```bash
        pip install --upgrade selenium webdriver-manager
        ```
        
- **Recommendation Errors**:
    
    - Verify data:
        
        ```bash
        cqlsh -e "SELECT COUNT(*) FROM cars_keyspace.car_views_by_user;"
        ```
        
    - Check logs:
        
        ```bash
        tail -f combined_recommendations.log
        ```
        
    - Ensure dependencies:
        
        ```bash
        pip install scikit-learn==1.5.2 scipy==1.14.1
        ```
        
- **Prediction Errors**:
    
    - Verify ML service:
        
        ```bash
        curl http://localhost:5001/predict
        ```
        
    - Check logs:
        
        ```bash
        tail -f ml_service.log
        ```
        
    - Ensure dependencies:
        
        ```bash
        pip install tensorflow==2.17.0 flask==3.0.3
        ```