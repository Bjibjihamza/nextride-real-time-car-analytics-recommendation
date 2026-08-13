"""
NextRide - Sync the serving car catalog.

Reads silver.listings (ClickHouse) and upserts one row per car into
PostgreSQL `cars` (serving mirror). The car id is a deterministic UUID
uuid5(source, listing_id), so re-running never duplicates.

Usage:
    python pipeline/serving/sync_cars.py

Environment:
    CLICKHOUSE_URL / CLICKHOUSE_USER / CLICKHOUSE_PASSWORD
    PG_HOST / PG_PORT / PG_DATABASE / PG_USER / PG_PASSWORD
"""

import json
import os
import sys
import uuid

import psycopg2
import requests

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

CLICKHOUSE_URL = os.environ.get("CLICKHOUSE_URL", "http://localhost:8123")
CLICKHOUSE_USER = os.environ.get("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.environ.get("CLICKHOUSE_PASSWORD", "nextride")

COLS = [
    "source", "listing_id", "title", "brand", "model", "year", "price",
    "currency", "fuel_type", "transmission", "mileage", "door_count",
    "fiscal_power", "origin", "first_owner", "condition", "sector",
    "seller_city", "creator", "equipment", "image_folder", "url",
    "publication_date", "image_urls",
]


def read_silver():
    sql = f"SELECT {', '.join(COLS)} FROM silver.listings"
    r = requests.post(
        CLICKHOUSE_URL,
        params={"user": CLICKHOUSE_USER, "password": CLICKHOUSE_PASSWORD,
                "query": sql, "default_format": "JSONEachRow"},
        timeout=120,
    )
    r.raise_for_status()
    rows = []
    for line in r.text.splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def main():
    rows = read_silver()
    print(f"Silver : {len(rows)} voitures")

    conn = psycopg2.connect(
        host=os.environ.get("PG_HOST", "localhost"),
        port=int(os.environ.get("PG_PORT", "5432")),
        dbname=os.environ.get("PG_DATABASE", "nextride"),
        user=os.environ.get("PG_USER", "nextride"),
        password=os.environ.get("PG_PASSWORD", "nextride"),
    )
    conn.autocommit = False
    upsert = """
        INSERT INTO cars (
            id, source, listing_id, title, brand, model, year, price, currency,
            fuel_type, transmission, mileage, door_count, fiscal_power, origin,
            first_owner, condition, sector, seller_city, creator, equipment,
            image_folder, url, publication_date, image_urls
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title, brand = EXCLUDED.brand, model = EXCLUDED.model,
            year = EXCLUDED.year, price = EXCLUDED.price, fuel_type = EXCLUDED.fuel_type,
            transmission = EXCLUDED.transmission, mileage = EXCLUDED.mileage,
            door_count = EXCLUDED.door_count, fiscal_power = EXCLUDED.fiscal_power,
            sector = EXCLUDED.sector, seller_city = EXCLUDED.seller_city,
            publication_date = EXCLUDED.publication_date, image_urls = EXCLUDED.image_urls
    """

    with conn.cursor() as cur:
        for r in rows:
            car_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{r['source']}:{r['listing_id']}"))
            cur.execute(upsert, (
                car_id,
                r.get("source"),
                r.get("listing_id"),
                r.get("title"),
                r.get("brand"),
                r.get("model"),
                r.get("year"),
                r.get("price"),
                r.get("currency"),
                r.get("fuel_type"),
                r.get("transmission"),
                r.get("mileage"),
                r.get("door_count"),
                r.get("fiscal_power"),
                r.get("origin"),
                r.get("first_owner"),
                r.get("condition"),
                r.get("sector"),
                r.get("seller_city"),
                r.get("creator"),
                r.get("equipment"),
                r.get("image_folder"),
                r.get("url"),
                r.get("publication_date"),
                json.dumps(r.get("image_urls") or []),
            ))
    conn.commit()
    conn.close()

    print(f"✅ cars synchronisé : {len(rows)} voitures dans PostgreSQL")


if __name__ == "__main__":
    main()
