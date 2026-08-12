# Big Data and Machine Learning Project Documentation

## 1. Project Overview

This project leverages Big Data technologies, Machine Learning (ML), and Data Visualization to analyze vehicle listing data from two Moroccan platforms: **Avito** and **Moteur.ma**. The project is divided into two sub-projects:

1. **Price Prediction**: Collects, cleans, and models vehicle data to predict prices using supervised ML models, with automated retraining for continuous improvement.
2. **Recommendation System**: Uses real-time data collection and unsupervised ML to provide personalized vehicle recommendations.

The system integrates web scraping, real-time data streaming, distributed storage, automated workflows (including MLOps-inspired model retraining), and two visualization components: one for internal exploratory analysis and another for user interaction on a web interface.

---

## 2. Data Sources

Data is sourced from:

- **Avito**: A Moroccan classifieds platform for vehicle listings.
- **Moteur.ma**: A specialized vehicle listing platform.

### 2.1 Data Schema

#### Avito Schema

```
 |-- ID: string (nullable = true)
 |-- Titre: string (nullable = true)
 |-- Prix: string (nullable = true)
 |-- Date de publication: string (nullable = true)
 |-- Année: string (nullable = true)
 |-- Type de carburant: string (nullable = true)
 |-- Transmission: string (nullable = true)
 |-- Créateur: string (nullable = true)
 |-- Type de véhicule: string (nullable = true)
 |-- Secteur: string (nullable = true)
 |-- Kilométrage: string (nullable = true)
 |-- Marque: string (nullable = true)
 |-- Modèle: string (nullable = true)
 |-- Nombre de portes: string (nullable = true)
 |-- Origine: string (nullable = true)
 |-- Première main: string (nullable = true)
 |-- Puissance fiscale: string (nullable = true)
 |-- État: string (nullable = true)
 |-- Équipements: string (nullable = true)
 |-- Ville du vendeur: string (nullable = true)
 |-- Dossier d'images: string (nullable = true)
```

#### Moteur.ma Schema

```
 |-- ID: string (nullable = true)
 |-- Titre: string (nullable = true)
 |-- Prix: string (nullable = true)
 |-- Année: string (nullable = true)
 |-- Type de carburant: string (nullable = true)
 |-- Transmission: string (nullable = true)
 |-- Créateur: string (nullable = true)
 |-- Secteur: string (nullable = true)
 |-- Kilométrage: string (nullable = true)
 |-- Marque: string (nullable = true)
 |-- Modèle: string (nullable = true)
 |-- Nombre de portes: string (nullable = true)
 |-- Première main: string (nullable = true)
 |-- Puissance fiscale: string (nullable = true)
 |-- Équipements: string (nullable = true)
 |-- Ville du vendeur: string (nullable = true)
 |-- Dossier d'images: string (nullable = true)
 |-- Dédouané: string (nullable = true)
```

---

## 3. Sub-Project 1: Price Prediction

### 3.1 Objective

Develop a predictive model to estimate vehicle prices based on features such as brand, model, year, mileage, and other attributes, with continuous model improvement through automated retraining.

### 3.2 Workflow

1. **Data Collection**:
    
    - **Scraping**: Selenium scrapes ~60,000 vehicle listings from Avito and Moteur.ma for the initial dataset, with incremental updates of +20,000 records triggering retraining.
    - **Automation**: Apache Airflow schedules scraping tasks and triggers ML model retraining when sufficient new data is collected.
    - **Exploratory Analysis**: Power BI generates reports analyzing the initial 60,000 records, including price distributions, popular brands, and regional trends.
2. **Data Processing**:
    
    - **Streaming**: Apache Kafka streams data for real-time processing.
    - **Processing**: Apache Spark handles distributed cleaning and preprocessing (e.g., handling missing values, type conversion, outlier removal).
    - **Storage**: Cleaned data is stored in Apache Cassandra (`cleaned_cars` table).
3. **Machine Learning**:
    
    - **Models**: Five supervised ML models are trained:
        - **LightGBM**: Optimized gradient boosting for speed and performance.
        - **Random Forest**: Ensemble method robust to overfitting.
        - **XGBoost**: Scalable gradient boosting for high accuracy.
        - **Gradient Boosting Machines (GBM)**: Balances accuracy and interpretability.
        - **Neural Network**: Deep learning model for complex patterns, evaluated for suitability based on dataset size and complexity.
    - **Model Retraining**:
        - Initial training uses the first 60,000 records.
        - Airflow schedules retraining every time an additional 20,000 records are collected.
        - The best-performing model (based on evaluation metrics) is selected for deployment.
    - **Evaluation Metrics**: Models are evaluated using Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and R² score.
    - **MLOps Approach**: The automated retraining and deployment process is inspired by MLOps principles, ensuring continuous model improvement as new data becomes available.
    - **Integration**: The best-performing model is integrated into a web interface for user interaction.
4. **Data Visualization**:
    
    - **Exploratory Visualization**:
        - Built using Power BI for the initial 60,000 records.
        - Focuses on internal analysis (e.g., price trends, brand popularity, regional variations).
        - Visualizations are static and used for reporting purposes.
    - **User-Facing Visualization**:
        - Integrated into the web interface using Python (Plotly, Matplotlib) and D3.js.
        - Enables users to explore platform data interactively (e.g., filter by brand, year, region).
        - Displays model performance comparisons, predictions, and feature importance.
        - Visualizations are dynamic and browser-based for enhanced user engagement.

### 3.3 Technologies

- **Scraping**: Selenium
- **Streaming**: Apache Kafka
- **Processing**: Apache Spark
- **Storage**: Apache Cassandra
- **Automation**: Apache Airflow (for scraping and ML retraining)
- **ML Frameworks**: LightGBM, Scikit-learn (Random Forest, GBM), XGBoost, TensorFlow/PyTorch (Neural Network)
- **Visualization**: Power BI (exploratory), Python (Plotly, Matplotlib), D3.js (user-facing)
- **Web Framework**: Flask or Django

---

## 4. Sub-Project 2: Recommendation System

### 4.1 Objective

Develop a real-time system to recommend vehicles based on user preferences and behavior, with interactive visualizations for data exploration.

### 4.2 Workflow

1. **Data Collection**:
    
    - **Real-Time Scraping**: Airflow schedules hourly scraping from Avito and Moteur.ma.
    - **Synthetic User Data**: Scripts generate user profiles, preferences, and interactions (e.g., views, favorites, searches).
    - **Storage**: Data is stored in Apache Cassandra tables (`users`, `user_preferences`, `car_views_by_user`, `favorite_cars_by_user`, `user_searches`, `user_similarities`, `user_recommendations`).
2. **Data Processing**:
    
    - **Streaming**: Kafka handles real-time data ingestion.
    - **Processing**: Spark aggregates user and vehicle data for recommendation generation.
    - **Storage**: Cassandra ensures low-latency data access.
3. **Recommendation Models**:
    
    - **Unsupervised ML Models**:
        - **Collaborative Filtering**: Uses user similarities (`user_similarities`).
        - **Content-Based Filtering**: Matches vehicles to user preferences (`user_preferences`).
        - **Hybrid Approach**: Combines both for improved accuracy.
    - **Output**: Recommendations are ranked, stored in `user_recommendations` with scores and reasons.
4. **Data Visualization**:
    
    - **User-Facing Visualization**:
        - Integrated into the web interface using Python (Plotly, Matplotlib) and D3.js.
        - Displays personalized recommendations with scores and reasons.
        - Allows users to explore data interactively (e.g., filter by fuel type, budget).
        - Visualizes trends like popular brands or user preference patterns.

### 4.3 DataFrame Schemas

The recommendation system relies on synthetic user data and vehicle data processed using Apache Spark. Below are the Spark DataFrame schemas for each table, which define the structure of the data used in the recommendation pipeline. These schemas are critical for ensuring data consistency during processing and model training.

1. **car_views_by_user**  
    This DataFrame captures user interactions with vehicle listings, such as the duration and source of each view. It is used to track user engagement for collaborative filtering in the recommendation system.
    
    ```
    root
     |-- user_id: string (nullable = true)
     |-- view_date: date (nullable = true)
     |-- view_timestamp: timestamp (nullable = true)
     |-- car_id: string (nullable = true)
     |-- view_duration_seconds: integer (nullable = true)
     |-- view_source: string (nullable = true)
    ```
    
2. **cleaned_cars**  
    This DataFrame contains cleaned vehicle listing data, including attributes like brand, model, price, and mileage. It serves as the primary dataset for both content-based filtering and price prediction models.
    
    ```
    root
     |-- id: string (nullable = true)
     |-- brand: string (nullable = true)
     |-- condition: string (nullable = true)
     |-- creator: string (nullable = true)
     |-- door_count: integer (nullable = true)
     |-- equipment: string (nullable = true)
     |-- first_owner: string (nullable = true)
     |-- fiscal_power: integer (nullable = true)
     |-- fuel_type: string (nullable = true)
     |-- image_folder: string (nullable = true)
     |-- mileage: integer (nullable = true)
     |-- model: string (nullable = true)
     |-- origin: string (nullable = true)
     |-- price: integer (nullable = true)
     |-- publication_date: string (nullable = true)
     |-- sector: string (nullable = true)
     |-- seller_city: string (nullable = true)
     |-- source: string (nullable = true)
     |-- title: string (nullable = true)
     |-- transmission: string (nullable = true)
     |-- year: integer (nullable = true)
    ```
    
3. **favorite_cars_by_user**  
    This DataFrame records vehicles marked as favorites by users, providing insights into user preferences for the recommendation system.
    
    ```
    root
     |-- user_id: string (nullable = true)
     |-- added_date: date (nullable = true)
     |-- added_timestamp: timestamp (nullable = true)
     |-- car_id: string (nullable = true)
    ```
    
4. **user_preferences**  
    This DataFrame stores user-specified preferences, such as budget range, preferred brands, and vehicle attributes. It is used for content-based filtering to match vehicles to user criteria.
    
    ```
    root
     |-- user_id: string (nullable = true)
     |-- budget_max: integer (nullable = true)
     |-- budget_min: integer (nullable = true)
     |-- last_updated: timestamp (nullable = true)
     |-- mileage_max: integer (nullable = true)
     |-- mileage_min: integer (nullable = true)
     |-- preferred_brands: string (nullable = true)
     |-- preferred_door_count: string (nullable = true)
     |-- preferred_fuel_types: string (nullable = true)
     |-- preferred_transmissions: string (nullable = true)
     |-- preferred_years: string (nullable = true)
    ```
    
5. **user_searches**  
    This DataFrame logs user search queries and filters, helping to understand user intent and refine recommendations.
    
    ```
    root
     |-- user_id: string (nullable = true)
     |-- search_date: date (nullable = true)
     |-- search_timestamp: timestamp (nullable = true)
     |-- filters: string (nullable = true)
     |-- result_count: integer (nullable = true)
     |-- search_query: string (nullable = true)
    ```
    
6. **user_similarities**  
    This DataFrame stores similarity scores between users, calculated based on their interactions and preferences. It is used for collaborative filtering to recommend vehicles based on similar users' behaviors.
    
    ```
    root
     |-- target_user_id: string (nullable = true)
     |-- reference_user_id: string (nullable = true)
     |-- last_updated: timestamp (nullable = true)
     |-- similarity_score: double (nullable = true)
    ```
    
7. **users**  
    This DataFrame contains user profile information, such as age, email, and location, which can be used to personalize recommendations.
    
    ```
    root
     |-- user_id: string (nullable = true)
     |-- age: integer (nullable = true)
     |-- created_at: timestamp (nullable = true)
     |-- email: string (nullable = true)
     |-- location: string (nullable = true)
     |-- username: string (nullable = true)
    ```
    
8. **user_recommendations**  
    This DataFrame stores the generated vehicle recommendations for each user, including rank, score, and reason. It is the output of the recommendation models and is displayed in the web interface.
    
    ```
    root
     |-- user_id: string (nullable = true)
     |-- car_id: string (nullable = true)
     |-- created_at: timestamp (nullable = true)
     |-- rank: integer (nullable = true)
     |-- recommendation_reason: string (nullable = true)
     |-- recommendation_score: float (nullable = true)
    ```
    

### 4.4 Technologies

- **Scraping**: Selenium
- **Streaming**: Apache Kafka
- **Processing**: Apache Spark
- **Storage**: Apache Cassandra
- **Automation**: Apache Airflow
- **ML Frameworks**: Scikit-learn, TensorFlow, or PyTorch
- **Visualization**: Python (Plotly, Matplotlib), D3.js
- **Web Framework**: Flask or Django

---

## 5. System Architecture

1. **Data Ingestion**:
    - Selenium scrapes data, managed by Airflow.
    - Kafka streams data in real-time.
2. **Data Processing**:
    - Spark cleans and processes vehicle and user data.
    - Synthetic user data is integrated.
3. **Storage**:
    - Cassandra stores vehicle and user data for low-latency access.
4. **Modeling**:
    - Supervised ML (LightGBM, Random Forest, XGBoost, GBM, Neural Network) for price prediction, with automated retraining via Airflow.
    - Unsupervised ML for recommendations.
5. **Visualization**:
    - Exploratory visualizations in Power BI for internal analysis.
    - User-facing interactive visualizations in the web interface using Python and D3.js.

---

## 6. Expected Outcomes

- **Price Prediction**:
    - Accurate price predictions with continuous model improvement through retraining.
    - Web interface for model comparison, predictions, and interactive visualizations.
- **Recommendation System**:
    - Real-time, personalized vehicle recommendations.
    - User-friendly visualizations for exploring platform data.
- **Scalability**:
    - Automated pipeline for large-scale, real-time data processing and model retraining.

---

## 7. Future Enhancements

- Integrate additional data sources (e.g., social media).
- Explore deep learning for image-based recommendations.
- Add real-time chat or price negotiation features to the web interface.
- Optimize Cassandra queries and Spark jobs for performance.

---

## 8. Conclusion

This project transforms vehicle listing data into actionable insights and personalized recommendations. It features robust automation for data collection and model retraining, inspired by MLOps principles, and delivers two visualization components: exploratory analysis for internal insights and interactive, user-facing visualizations for enhanced engagement on the platform.