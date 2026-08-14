-- =====================================================================
-- NextRide - ClickHouse - ML feature layer
-- car_features : one row per listing with engineered features (target = price)
-- price_history : every price/mileage capture over time (from bronze)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS features;

CREATE TABLE IF NOT EXISTS features.car_features (
    source           LowCardinality(String),
    listing_id       String,
    brand            LowCardinality(String),
    model            String,
    year             Nullable(UInt16),
    car_age          Nullable(UInt16),
    price            Nullable(UInt32),
    mileage          Nullable(UInt32),
    fuel_type        LowCardinality(String),
    transmission     LowCardinality(String),
    door_count       Nullable(UInt8),
    fiscal_power     Nullable(UInt16),
    origin           String,
    first_owner      String,
    condition        String,
    sector           LowCardinality(String),
    equipment_length UInt32,
    image_count      UInt32,
    capture_count    UInt32,
    listing_age_days UInt32,
    first_seen       DateTime64(3),
    last_seen        DateTime64(3),
    currency         LowCardinality(String)
) ENGINE = ReplacingMergeTree(last_seen)
ORDER BY (source, listing_id);

CREATE TABLE IF NOT EXISTS features.price_history (
    source      LowCardinality(String),
    listing_id  String,
    captured_at DateTime64(3),
    price       Nullable(Float64),
    mileage     Nullable(UInt32),
    year        Nullable(UInt16)
) ENGINE = MergeTree
ORDER BY (source, listing_id, captured_at);
