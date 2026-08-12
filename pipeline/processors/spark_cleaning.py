"""
NextRide Spark streaming job.

Consumes the raw Avito / Moteur car listings from Kafka, cleans / normalises
them (French column names -> English schema), and writes the result to the
Cassandra table cars_keyspace.cleaned_cars.

Run inside a container with:

    spark-submit --packages \
        org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.1,\
        com.datastax.spark:spark-cassandra-connector_2.12:3.5.1 \
        spark_cleaning.py

Environment variables:
    KAFKA_BOOTSTRAP_SERVERS : Kafka broker address  (default localhost:9092)
    CASSANDRA_HOST          : Cassandra contact point (default localhost)
    CASSANDRA_PORT          : Cassandra port          (default 9042)
    CASSANDRA_KEYSPACE      : keyspace                (default cars_keyspace)
    CHECKPOINT_BASE         : checkpoint base path    (default /tmp/nextride)
"""

import os
import uuid

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import (
    IntegerType,
    StringType,
    StructField,
    StructType,
)
from pyspark.sql.functions import (
    coalesce,
    col,
    concat,
    date_format,
    floor,
    from_json,
    lit,
    lower,
    regexp_extract,
    regexp_replace,
    to_date,
    to_timestamp,
    trim,
    udf,
    when,
)

KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
CASSANDRA_HOST = os.environ.get("CASSANDRA_HOST", "localhost")
CASSANDRA_PORT = os.environ.get("CASSANDRA_PORT", "9042")
KEYSPACE = os.environ.get("CASSANDRA_KEYSPACE", "cars_keyspace")
CHECKPOINT_BASE = os.environ.get("CHECKPOINT_BASE", "/tmp/nextride")

MOTEUR_TOPIC = "moteur_cars"
AVITO_TOPIC = "avito_cars"

FRENCH_TO_ENGLISH = {
    "Puissance fiscale": "fiscal_power",
    "Kilométrage": "mileage",
    "Secteur": "sector",
    "Équipements": "equipment",
    "Ville du vendeur": "seller_city",
    "Prix": "price",
    "Marque": "brand",
    "Première main": "first_owner",
    "État": "condition",
    "Transmission": "transmission",
    "Origine": "origin",
    "Date de publication": "publication_date",
    "Année": "year",
    "Dossier d'images": "image_folder",
    "Titre": "title",
    "Type de carburant": "fuel_type",
    "Créateur": "creator",
    "Nombre de portes": "door_count",
    "Modèle": "model",
}

SECTOR_NORMALISATION = [
    ("Fès", "Fes"), ("Kenitra", "Kenitra"), ("Kénitra", "Kenitra"),
    ("Meknes", "Meknes"), ("Meknès", "Meknes"), ("Sale", "Sale"),
    ("Salé", "Sale"), ("Tétouan", "Tetouan"), ("Tetouan", "Tetouan"),
    ("El jadida", "El Jadida"), ("Beni mellal", "Beni Mellal"),
    ("Laayoune", "Laayoune"), ("Laâyoune", "Laayoune"),
    ("Al hoceima", "Al Hoceima"), ("Benguerir", "Ben Guerir"),
    ("Sidi slimane", "Sidi Slimane"), ("Sidi kacem", "Sidi Kacem"),
    ("Khenifra", "Khénifra"), ("Khénifra", "Khénifra"),
    ("Kelaa sraghna", "El Kelaa des Sraghna"),
    ("El Kelâa des Sraghna", "El Kelaa des Sraghna"),
    ("Ben slimane", "Benslimane"), ("Tiflet", "Tiflet"),
    ("Fquih ben salah", "Fquih Ben Saleh"), ("Dar bouazza", "Dar Bouazza"),
    ("Taroudant", "Taroudannt"), ("Taroudannt", "Taroudannt"),
    ("Had soualem", "Had Soualem"), ("El hajeb", "El Hajeb"),
    ("Autre", "Other"),
]


def build_spark() -> SparkSession:
    return (
        SparkSession.builder.appName("NextRideCarCleaning")
        .config("spark.cassandra.connection.host", CASSANDRA_HOST)
        .config("spark.cassandra.connection.port", CASSANDRA_PORT)
        .config("spark.streaming.kafka.maxRatePerPartition", "100")
        .config("spark.sql.shuffle.partitions", "2")
        .getOrCreate()
    )


def moteur_schema() -> StructType:
    fields = [
        "ID", "Titre", "Prix", "Date de publication", "Année",
        "Type de carburant", "Transmission", "Créateur", "Secteur",
        "Kilométrage", "Marque", "Modèle", "Nombre de portes",
        "Première main", "Puissance fiscale", "État", "Équipements",
        "Ville du vendeur", "Dossier d'images", "Dédouané", "Origine",
    ]
    return StructType([StructField(name, StringType(), True) for name in fields])


def avito_schema() -> StructType:
    fields = [
        "ID", "Titre", "Prix", "Date de publication", "Année",
        "Type de carburant", "Transmission", "Créateur", "Type de véhicule",
        "Secteur", "Kilométrage", "Marque", "Modèle", "Nombre de portes",
        "Origine", "Première main", "Puissance fiscale", "État", "Équipements",
        "Ville du vendeur", "Dossier d'images", "timestamp",
    ]
    return StructType([StructField(name, StringType(), True) for name in fields])


@udf(StringType())
def deterministic_uuid(source: str, listing_id: str) -> str:
    """Stable UUID so re-publishing the same listing never duplicates rows."""
    key = f"{source}:{listing_id}".encode("utf-8")
    return str(uuid.uuid5(uuid.NAMESPACE_URL, key.decode("utf-8")))


def clean_year(df: DataFrame) -> DataFrame:
    return df.withColumn(
        "Année",
        when(
            regexp_replace(col("Année"), "[^\\d]", "").rlike("^\\d{4}$")
            & (regexp_replace(col("Année"), "[^\\d]", "").cast("int").between(1900, 2025)),
            regexp_replace(col("Année"), "[^\\d]", "").cast(IntegerType()),
        ).otherwise(lit(None)),
    )


def clean_price(df: DataFrame) -> DataFrame:
    return (
        df.withColumn("Prix", regexp_replace(col("Prix"), "[\u0020\u202F]", ""))
        .withColumn("Prix", regexp_replace(col("Prix"), "(?i)dhs?", ""))
        .withColumn("Prix", when(col("Prix").rlike("^\\d+$"), col("Prix")).otherwise(lit(None)))
        .withColumn("Prix", col("Prix").cast(IntegerType()))
        .withColumn("Prix", when(col("Prix").between(10000, 10000000), col("Prix")).otherwise(lit(None)))
    )


def clean_mileage_avito(df: DataFrame) -> DataFrame:
    """Avito mileage can be a single value (123456) or a range (10000-20000)."""
    return (
        df.withColumn("Km_clean", regexp_replace(col("Kilométrage"), "[^\\d\\-]", ""))
        .withColumn("km_start", regexp_extract(col("Km_clean"), r"^(\d+)-", 1).cast("int"))
        .withColumn("km_end", regexp_extract(col("Km_clean"), r"-(\d+)$", 1).cast("int"))
        .withColumn("range_avg", ((col("km_start") + col("km_end")) / 2).cast("int"))
        .withColumn("simple", when(col("Km_clean").rlike("^\\d+$"), col("Km_clean").cast("int")))
        .withColumn("Kilométrage", coalesce(col("range_avg"), col("simple")))
        .withColumn(
            "Kilométrage",
            when(col("Kilométrage").between(0, 100000000), col("Kilométrage")).otherwise(lit(None)),
        )
        .drop("Km_clean", "km_start", "km_end", "range_avg", "simple")
    )


def clean_mileage_moteur(df: DataFrame) -> DataFrame:
    return df.withColumn(
        "Kilométrage",
        when(
            regexp_replace(col("Kilométrage"), "[^\\d]", "").rlike("^\\d+$"),
            regexp_replace(col("Kilométrage"), "[^\\d]", "").cast(IntegerType()),
        ).otherwise(lit(None)),
    )


def clean_fiscal_power(df: DataFrame) -> DataFrame:
    return (
        df.withColumn("Puissance fiscale", regexp_replace(col("Puissance fiscale"), "(?i)(plus de |cv|\\s+)", ""))
        .withColumn(
            "Puissance fiscale",
            when(col("Puissance fiscale").rlike("^\\d+$"), col("Puissance fiscale")).otherwise(lit(None)),
        )
        .withColumn("Puissance fiscale", col("Puissance fiscale").cast(IntegerType()))
        .withColumn(
            "Puissance fiscale",
            when(col("Puissance fiscale").between(3, 50), col("Puissance fiscale")).otherwise(lit(None)),
        )
    )


def clean_doors(df: DataFrame) -> DataFrame:
    return (
        df.withColumn(
            "Nombre de portes",
            when(
                trim(col("Nombre de portes")).rlike("^\\d+$"),
                trim(col("Nombre de portes")).cast("float"),
            ).otherwise(lit(None)),
        )
        .withColumn("Nombre de portes", floor(col("Nombre de portes")).cast(IntegerType()))
        .withColumn(
            "Nombre de portes",
            when(col("Nombre de portes").between(2, 5), col("Nombre de portes")).otherwise(lit(None)),
        )
    )


def clean_fuel(df: DataFrame) -> DataFrame:
    return df.withColumn(
        "Type de carburant",
        when(lower(col("Type de carburant")).isin("essence", "diesel", "hybride"), lower(col("Type de carburant")))
        .otherwise(lit(None)),
    )


def clean_sector(df: DataFrame) -> DataFrame:
    cleaned = df.withColumn("Secteur", trim(regexp_extract(col("Secteur"), r",\s*([A-Za-zÀ-ÿ\s]+)$", 1))).withColumn(
        "Secteur",
        when(trim(col("Secteur")).isin("", "N/A", "NULL"), "Unknown").otherwise(trim(col("Secteur"))),
    )
    for variant, canonical in SECTOR_NORMALISATION:
        cleaned = cleaned.withColumn("Secteur", when(col("Secteur") == variant, canonical).otherwise(col("Secteur")))
    return cleaned


def standardize_date():
    """Format any of the accepted date layouts to dd/MM/yyyy HH:mm."""
    return F.when(
        to_timestamp(col("Date de publication"), "yyyy-MM-dd HH:mm:ss").isNotNull(),
        date_format(to_timestamp(col("Date de publication"), "yyyy-MM-dd HH:mm:ss"), "dd/MM/yyyy HH:mm"),
    ).when(
        to_date(col("Date de publication"), "yyyy-MM-dd").isNotNull(),
        concat(date_format(to_date(col("Date de publication"), "yyyy-MM-dd"), "dd/MM/yyyy"), lit(" 00:00")),
    ).otherwise(lit(None))


def normalise(df: DataFrame, source: str) -> DataFrame:
    """Shared cleaning pipeline for both sources."""
    df = (
        df.withColumnRenamed("ID", "listing_id")
        .drop("timestamp", "Dédouané", "Type de véhicule")
        .withColumn("source", lit(source))
        .filter(
            (
                F.lower(F.trim(F.col("Type de carburant"))).isin("diesel", "essence", "hybride", "n/a")
                | F.col("Type de carburant").isNull()
            )
            & (
                F.lower(F.trim(F.col("Transmission"))).isin("manuelle", "automatique", "n/a")
                | F.col("Transmission").isNull()
            )
        )
        .dropDuplicates()
    )
    df = clean_price(df)
    df = clean_year(df)
    df = clean_fuel(df)
    df = clean_fiscal_power(df)
    df = clean_doors(df)
    df = clean_sector(df)
    df = df.withColumn("Marque", lower(trim(col("Marque"))))
    df = df.withColumn(
        "Première main",
        when(lower(col("Première main")).isin("n/a", "null", ""), None).otherwise(col("Première main")),
    )
    df = df.withColumn("Date de publication", standardize_date().cast(StringType()))

    # Replace remaining "N/A" / "NULL" markers with real nulls.
    for column in df.columns:
        df = df.withColumn(
            column,
            F.when(col(column).isin("N/A", "NULL"), None).otherwise(col(column)),
        )

    if source == "moteur":
        df = clean_mileage_moteur(df)
    else:
        df = clean_mileage_avito(df)

    # French -> English column names.
    for french, english in FRENCH_TO_ENGLISH.items():
        if french in df.columns:
            df = df.withColumnRenamed(french, english)

    return df.withColumn("id", deterministic_uuid(lit(source), col("listing_id"))).drop("listing_id")


def process_batch(df: DataFrame, batch_id: int, source: str) -> None:
    if df.isEmpty():
        print(f"[{source}] batch {batch_id}: nothing to do")
        return

    cleaned = normalise(df, source).filter(col("id").isNotNull())
    count = cleaned.count()
    print(f"[{source}] batch {batch_id}: cleaning {count} rows -> Cassandra")

    cleaned.write.format("org.apache.spark.sql.cassandra").mode("append").option(
        "keyspace", KEYSPACE
    ).option("table", "cleaned_cars").option("spark.cassandra.output.consistency.level", "ONE").save()
    print(f"[{source}] batch {batch_id}: wrote {count} rows to {KEYSPACE}.cleaned_cars")


def main() -> None:
    spark = build_spark()
    spark.sparkContext.setLogLevel("WARN")

    kafka_options = {
        "kafka.bootstrap.servers": KAFKA_BOOTSTRAP,
        "startingOffsets": "earliest",
        "failOnDataLoss": "false",
    }

    def stream(topic: str, schema: StructType, source: str, checkpoint: str):
        return (
            spark.readStream.format("kafka")
            .options(**kafka_options)
            .option("subscribe", topic)
            .load()
            .selectExpr("CAST(value AS STRING) AS json_value")
            .select(from_json(col("json_value"), schema).alias("data"))
            .select("data.*")
            .writeStream.foreachBatch(lambda b, i: process_batch(b, i, source))
            .outputMode("update")
            .trigger(processingTime="5 seconds")
            .option("checkpointLocation", os.path.join(CHECKPOINT_BASE, checkpoint))
            .start()
        )

    stream(AVITO_TOPIC, avito_schema(), "avito", "avito_cars_processing")
    stream(MOTEUR_TOPIC, moteur_schema(), "moteur", "moteur_cars_processing")

    print("Streaming started. Waiting for messages on avito_cars / moteur_cars ...")
    spark.streams.awaitAnyTermination()


if __name__ == "__main__":
    main()
