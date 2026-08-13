-- =====================================================================
-- NextRide - ClickHouse data warehouse bootstrap
-- Bronze layer: raw ingestion from the scrapers (append-only).
-- Every column uses the CANONICAL unified schema (same label for Avito
-- and Moteur). `payload` keeps the FULL raw record (schema-on-read);
-- typed columns are filled by the scrapers for direct querying.
-- Silver / gold layers come later.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS bronze;

CREATE TABLE IF NOT EXISTS bronze.listings (
    source          LowCardinality(String),
    listing_id      String,
    title           String,
    price           Nullable(Float64),
    currency        LowCardinality(String),
    year            Nullable(UInt16),
    fuel_type       LowCardinality(String),
    transmission    LowCardinality(String),
    creator         String,
    sector          LowCardinality(String),
    mileage         Nullable(UInt32),
    brand           LowCardinality(String),
    model           String,
    door_count      Nullable(UInt8),
    origin          String,
    first_owner     String,
    fiscal_power    Nullable(UInt16),
    condition       String,
    equipment       String,
    seller_city     String,
    image_folder    String,
    url             String,
    publication_date String,
    image_urls      Array(String),
    payload         String,
    captured_at     DateTime64(3) DEFAULT now64(3)
) ENGINE = MergeTree
ORDER BY (captured_at, source, listing_id);
