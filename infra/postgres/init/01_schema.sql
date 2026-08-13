-- =====================================================================
-- NextRide - PostgreSQL operational schema (OLTP serving layer)
-- Replaces Cassandra. Users, views, favorites, searches, preferences,
-- recommendations, predictions + a serving mirror of the car catalog
-- (cars) synced from ClickHouse silver (see pipeline/serving/sync_cars.py).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------- users
CREATE TABLE IF NOT EXISTS users (
    user_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    age         INT,
    location    TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------- cars
-- Serving mirror of silver.listings. id = uuid5(source, listing_id) so it is
-- stable and re-syncing never duplicates.
CREATE TABLE IF NOT EXISTS cars (
    id              UUID PRIMARY KEY,
    source          TEXT,
    listing_id      TEXT,
    title           TEXT,
    brand           TEXT,
    model           TEXT,
    year            INT,
    price           NUMERIC,
    currency        TEXT,
    fuel_type       TEXT,
    transmission    TEXT,
    mileage         INT,
    door_count      INT,
    fiscal_power    INT,
    origin          TEXT,
    first_owner     TEXT,
    condition       TEXT,
    sector          TEXT,
    seller_city     TEXT,
    creator         TEXT,
    equipment       TEXT,
    image_folder    TEXT,
    url             TEXT,
    publication_date TEXT,
    image_urls      JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_cars_brand      ON cars (brand);
CREATE INDEX IF NOT EXISTS idx_cars_model      ON cars (model);
CREATE INDEX IF NOT EXISTS idx_cars_fuel       ON cars (fuel_type);
CREATE INDEX IF NOT EXISTS idx_cars_transmission ON cars (transmission);
CREATE INDEX IF NOT EXISTS idx_cars_sector     ON cars (sector);
CREATE INDEX IF NOT EXISTS idx_cars_price      ON cars (price);
CREATE INDEX IF NOT EXISTS idx_cars_year       ON cars (year);
CREATE INDEX IF NOT EXISTS idx_cars_source     ON cars (source);

-- ------------------------------------------------- user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id                 UUID PRIMARY KEY REFERENCES users (user_id) ON DELETE CASCADE,
    preferred_brands        TEXT[] NOT NULL DEFAULT '{}',
    preferred_fuel_types    TEXT[] NOT NULL DEFAULT '{}',
    preferred_transmissions TEXT[] NOT NULL DEFAULT '{}',
    preferred_years         INT[]  NOT NULL DEFAULT '{}',
    preferred_door_count    INT[]  NOT NULL DEFAULT '{}',
    budget_min              INT,
    budget_max              INT,
    mileage_min             INT,
    mileage_max             INT,
    last_updated            TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------- car_views_by_user
-- user_id relaxed (no FK): views may be recorded for any client-provided id.
CREATE TABLE IF NOT EXISTS car_views_by_user (
    user_id               UUID NOT NULL,
    view_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    view_timestamp        TIMESTAMPTZ NOT NULL DEFAULT now(),
    car_id                UUID NOT NULL REFERENCES cars (id) ON DELETE CASCADE,
    view_duration_seconds INT,
    view_source           TEXT,
    PRIMARY KEY (user_id, view_timestamp, car_id)
);

-- ----------------------------------------------- favorite_cars_by_user
CREATE TABLE IF NOT EXISTS favorite_cars_by_user (
    user_id          UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    car_id           UUID NOT NULL REFERENCES cars (id) ON DELETE CASCADE,
    added_timestamp  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, car_id)
);

-- ----------------------------------------------------- user_searches
-- user_id relaxed (no FK): history is keyed by any client-provided id.
CREATE TABLE IF NOT EXISTS user_searches (
    user_id          UUID NOT NULL,
    search_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    search_query     TEXT,
    filters          JSONB DEFAULT '{}'::jsonb,
    result_count     INT,
    PRIMARY KEY (user_id, search_timestamp)
);

-- ---------------------------------------------- user_recommendations
CREATE TABLE IF NOT EXISTS user_recommendations (
    user_id              UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    car_id               UUID NOT NULL REFERENCES cars (id) ON DELETE CASCADE,
    method               TEXT,
    rank                 INT,
    recommendation_reason TEXT,
    similarity_score     REAL,
    created_at           TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, car_id)
);

-- ------------------------------------------------- user_similarities
CREATE TABLE IF NOT EXISTS user_similarities (
    target_user_id     UUID NOT NULL,
    reference_user_id  UUID NOT NULL,
    similarity_score   DOUBLE PRECISION,
    last_updated       TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (target_user_id, reference_user_id)
);

-- ---------------------------------------------------- car_predictions
-- user_id is TEXT (any client-provided id), relaxed on purpose.
CREATE TABLE IF NOT EXISTS car_predictions (
    prediction_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT,
    car_features        JSONB DEFAULT '{}'::jsonb,
    predicted_price     REAL,
    prediction_timestamp TIMESTAMPTZ DEFAULT now()
);
