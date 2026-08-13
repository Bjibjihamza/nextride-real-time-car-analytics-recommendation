-- =====================================================================
-- NextRide - ClickHouse - Silver layer
-- Cleaned, deduplicated, conformed listings (one row per source+listing_id).
-- Populated by pipeline/processors/silver_cleaner.py from bronze.listings.
-- ReplacingMergeTree(last_seen): re-runs / incremental upserts never
-- create duplicates (version = last_seen).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS silver;

CREATE TABLE IF NOT EXISTS silver.listings (
    source          LowCardinality(String),
    listing_id      String,
    title           String,
    brand           LowCardinality(String),
    model           String,
    year            Nullable(UInt16),
    price           Nullable(UInt32),
    currency        LowCardinality(String),
    fuel_type       LowCardinality(String),
    transmission    LowCardinality(String),
    mileage         Nullable(UInt32),
    door_count      Nullable(UInt8),
    fiscal_power    Nullable(UInt16),
    origin          Nullable(String),
    first_owner     Nullable(String),
    condition       Nullable(String),
    sector          LowCardinality(String),
    seller_city     Nullable(String),
    creator         Nullable(String),
    equipment       String,
    image_folder    String,
    image_urls      Array(String),
    url             String,
    publication_date String,
    first_seen      DateTime64(3),
    last_seen       DateTime64(3),
    capture_count   UInt32
) ENGINE = ReplacingMergeTree(last_seen)
ORDER BY (source, listing_id);
