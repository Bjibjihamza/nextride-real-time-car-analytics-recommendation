"""
NextRide data producer.

Reads the raw scraped CSV files (Avito / Moteur) and publishes every row as a
JSON message to the corresponding Kafka topic (avito_cars / moteur_cars).

The Spark streaming job consumes those topics, cleans the rows and writes them
into Cassandra (cleaned_cars). Scraping itself is a separate concern and will
be wired in later; this producer simply replays the already-scraped CSVs.

Environment variables:
    KAFKA_BOOTSTRAP_SERVERS : Kafka broker address (default localhost:9092)
    AVITO_CSV               : path to the Avito CSV   (default data/avito/avito_complete.csv)
    MOTEUR_CSV              : path to the Moteur CSV  (default data/moteur/moteur_complete.csv)
"""

import csv
import json
import logging
import os
import sys
import time

from kafka import KafkaAdminClient, KafkaProducer
from kafka.admin import NewTopic
from kafka.errors import (
    KafkaError,
    NoBrokersAvailable,
    TopicAlreadyExistsError,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nextride-producer")

BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
AVITO_CSV = os.environ.get("AVITO_CSV", "data/avito/avito_complete.csv")
MOTEUR_CSV = os.environ.get("MOTEUR_CSV", "data/moteur/moteur_complete.csv")

TOPIC_AVITO = "avito_cars"
TOPIC_MOTEUR = "moteur_cars"


def wait_for_broker(timeout_seconds=120):
    """Block until the Kafka broker is reachable."""
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            producer = KafkaProducer(bootstrap_servers=BOOTSTRAP_SERVERS)
            producer.close()
            logger.info("Kafka broker is reachable at %s", BOOTSTRAP_SERVERS)
            return
        except (NoBrokersAvailable, KafkaError):
            logger.info("Waiting for Kafka broker at %s ...", BOOTSTRAP_SERVERS)
            time.sleep(5)
    logger.error("Timed out waiting for Kafka broker at %s", BOOTSTRAP_SERVERS)
    sys.exit(1)


def ensure_topics():
    """Create the topics if they do not exist yet."""
    admin = KafkaAdminClient(bootstrap_servers=BOOTSTRAP_SERVERS)
    existing = set(admin.list_topics())
    for topic in (TOPIC_AVITO, TOPIC_MOTEUR):
        if topic in existing:
            logger.info("Topic %s already exists", topic)
            continue
        try:
            admin.create_topics(
                [NewTopic(name=topic, num_partitions=1, replication_factor=1)]
            )
            logger.info("Created topic %s", topic)
        except TopicAlreadyExistsError:
            logger.info("Topic %s already exists", topic)
    admin.close()


def publish_csv(producer, csv_path, topic, row_filter=None):
    """Publish every non-empty row of a CSV file to the given topic."""
    if not os.path.exists(csv_path):
        logger.error("CSV file not found: %s", csv_path)
        return 0

    with open(csv_path, "r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        if not reader.fieldnames:
            logger.error("CSV %s has no header row", csv_path)
            return 0

        sent = 0
        for row in reader:
            if row_filter and not row_filter(row):
                continue
            # Normalise headers (strip BOM / whitespace) and drop empty values
            payload = {
                k.strip("\ufeff").strip(): v
                for k, v in row.items()
                if k and k.strip("\ufeff").strip() and v not in (None, "")
            }
            if not payload:
                continue
            try:
                producer.send(
                    topic,
                    key=str(payload.get("ID", "")).encode("utf-8"),
                    value=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                )
                sent += 1
            except Exception as exc:  # noqa: BLE001 - keep the job alive
                logger.warning("Failed to publish row to %s: %s", topic, exc)
        producer.flush()
        logger.info("Published %d messages to %s", sent, topic)
        return sent


def main():
    wait_for_broker()
    ensure_topics()

    producer = KafkaProducer(
        bootstrap_servers=BOOTSTRAP_SERVERS,
        value_serializer=lambda v: v,
        acks="all",
        retries=5,
    )

    total = 0
    total += publish_csv(producer, AVITO_CSV, TOPIC_AVITO)
    total += publish_csv(producer, MOTEUR_CSV, TOPIC_MOTEUR)

    producer.close()
    logger.info("Done. Published a total of %d messages.", total)
    if total == 0:
        logger.warning("No messages were published — check the CSV data files.")
        sys.exit(1)


if __name__ == "__main__":
    main()
