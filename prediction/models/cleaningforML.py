from pyspark.sql import SparkSession, functions as F
from pyspark.sql.types import IntegerType
from pyspark.ml.feature import StringIndexer, VectorAssembler
from pyspark.ml import Pipeline
import uuid

# Initialize Spark Session
def init_spark(app_name="Car Price Prediction"):
    return SparkSession.builder \
        .appName(app_name) \
        .config("spark.driver.memory", "4g") \
        .config("spark.executor.memory", "4g") \
        .getOrCreate()

# Load CSV data
def load_data(spark, file_path):
    return spark.read.csv(file_path, header=True, inferSchema=True)

# Clean string columns by replacing "nan" strings with None
def clean_string_columns(df):
    for column, dtype in df.dtypes:
        if dtype == 'string':
            df = df.withColumn(
                column,
                F.when(F.col(column).rlike(r'(?i)^nan$'), None).otherwise(F.col(column))
            )
    return df

# Drop specified columns
def drop_columns(df, columns):
    if isinstance(columns, str):
        columns = [columns]
    return df.drop(*columns)

# Save DataFrame to CSV via Pandas
def save_to_csv(df, file_path):
    pandas_df = df.toPandas()
    pandas_df.to_csv(file_path, index=False)

# Handle missing values by dropping rows
def handle_missing_values(df):
    return df.dropna()

# Split equipment column into binary features
def split_equipment(df, equipment_col="equipment"):
    equipment_types = [
        "Jantes aluminium", "Airbags", "Climatisation", "navigation_system",
        "Toit ouvrant", "Sièges cuir", "Radar de recul", "Caméra de recul",
        "Vitres électriques", "ABS", "ESP", "Régulateur de vitesse",
        "Limiteur de vitesse", "CD/MP3/Bluetooth", "Ordinateur de bord", "Verrouillage centralisé"
    ]
    for eq in equipment_types:
        new_col = eq.lower().replace(" ", "_").replace("/", "_").replace("-", "_")
        df = df.withColumn(
            new_col,
            F.when(F.lower(F.col(equipment_col)).contains(eq.lower()), F.lit(True)).otherwise(F.lit(False))
        )
    return drop_columns(df, equipment_col)

# Label encode categorical columns
def label_encode(df, columns):
    pipeline_stages = []
    for col in columns:
        indexer = StringIndexer(inputCol=col, outputCol=col + "_idx", handleInvalid="skip")
        pipeline_stages.append(indexer)
    pipeline = Pipeline(stages=pipeline_stages)
    df = pipeline.fit(df).transform(df)
    for col in columns:
        df = df.drop(col).withColumnRenamed(col + "_idx", col)
    return df

# Feature engineering: Extract date features and equipment
def feature_engineering(df):
    # Extract date features
    df = df.withColumn("publication_date", F.to_timestamp("publication_date", "dd/MM/yyyy HH:mm"))
    df = df.withColumn("publication_year", F.year("publication_date")) \
           .withColumn("publication_month", F.month("publication_date")) \
           .withColumn("publication_day", F.dayofmonth("publication_date")) \
           .withColumn("publication_weekday", F.dayofweek("publication_date")) \
           .withColumn("is_weekend", (F.dayofweek("publication_date") >= 6).cast(IntegerType())) \
           .withColumn("days_since_posted", F.datediff(F.current_date(), "publication_date"))
    df = drop_columns(df, "publication_date")

    # Split equipment
    df = split_equipment(df, "equipment")

    # Rename equipment columns to English
    column_mapping = {
        "jantes_aluminium": "alloy_wheels",
        "airbags": "airbags",
        "climatisation": "air_conditioning",
        "navigation_system": "navigation_system",
        "toit_ouvrant": "sunroof",
        "sièges_cuir": "leather_seats",
        "radar_de_recul": "parking_sensors",
        "caméra_de_recul": "rear_camera",
        "vitres_électriques": "electric_windows",
        "abs": "abs",
        "esp": "esp",
        "régulateur_de_vitesse": "cruise_control",
        "limiteur_de_vitesse": "speed_limiter",
        "cd_mp3_bluetooth": "cd_mp3_bluetooth",
        "ordinateur_de_bord": "on_board_computer",
        "verrouillage_centralisé": "central_locking"
    }
    for old_name, new_name in column_mapping.items():
        df = df.withColumnRenamed(old_name, new_name)

    return df

# Encode variables: Cast types and encode categoricals
def encode_variables(df):
    # Cast boolean columns to integer
    bool_cols = [
        "alloy_wheels", "airbags", "air_conditioning", "navigation_system", "sunroof",
        "leather_seats", "parking_sensors", "rear_camera", "electric_windows", "abs",
        "esp", "cruise_control", "speed_limiter", "cd_mp3_bluetooth", "on_board_computer",
        "central_locking"
    ]
    for col_name in bool_cols:
        df = df.withColumn(col_name, F.col(col_name).cast(IntegerType()))

    # Cast numeric columns to double
    numeric_cols = [
        "door_count", "fiscal_power", "mileage", "price", "year",
        "publication_year", "publication_month", "publication_day", "days_since_posted"
    ]
    for col_name in numeric_cols:
        df = df.withColumn(col_name, F.col(col_name).cast("double"))

    # Label encode categorical columns
    categorical_cols = [
        "brand", "condition", "fuel_type", "model", "origin", "first_owner",
        "sector", "seller_city", "transmission"
    ]
    df = label_encode(df, categorical_cols)

    return df

# Remove outliers using IQR method
def remove_outliers(df, columns):
    for col in columns:
        quantiles = df.select(F.percentile_approx(col, [0.25, 0.75]).alias("quantiles")).collect()[0]["quantiles"]
        q1, q3 = quantiles[0], quantiles[1]
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        print(f"Outlier bounds for {col}: Q1={q1}, Q3={q3}, IQR={iqr}, Lower={lower_bound}, Upper={upper_bound}")
        df = df.filter((F.col(col) >= lower_bound) & (F.col(col) <= upper_bound))
    return df

# Main preprocessing pipeline
def preprocess_data(input_path, output_path):
    spark = init_spark()
    print("Starting data preprocessing pipeline...")

    # Step 1: Load and prepare data
    print("Step 1: Loading and preparing data...")
    df = load_data(spark, input_path)
    df = clean_string_columns(df)
    useless_cols = ['creator', 'source', 'image_folder', 'id', 'title']
    df = drop_columns(df, useless_cols)

    # Step 2: Handle missing values
    print("Step 2: Handling missing values...")
    print("Door count distribution before dropping missing values:")
    df.groupBy("door_count").count().show()
    df = handle_missing_values(df)
    print("Door count distribution after dropping missing values:")
    df.groupBy("door_count").count().show()

    # Step 3: Feature engineering
    print("Step 3: Performing feature engineering...")
    df = feature_engineering(df)
    save_to_csv(df, "data_after_feature_engineering.csv")

    # Step 4: Encode variables
    print("Step 4: Encoding variables...")
    df = encode_variables(df)
    print("Door count distribution after encoding:")
    df.groupBy("door_count").count().show()
    save_to_csv(df, "data_after_variable_encoding.csv")

    # Step 5: Remove outliers
    print("Step 5: Removing outliers...")
    columns_to_filter = ['price', 'mileage', 'fiscal_power']  # Excluded door_count
    df = remove_outliers(df, columns_to_filter)
    print("Door count distribution after outlier removal:")
    df.groupBy("door_count").count().show()

    # Step 6: Save final preprocessed data
    print(f"Step 6: Saving preprocessed data to {output_path}...")
    save_to_csv(df, output_path)

    print("Preprocessing completed successfully!")
    return df

# Execute preprocessing
if __name__ == "__main__":
    input_file = "cleaned_data.csv"
    output_file = "preprocessed_data.csv"
    preprocess_data(input_file, output_file)