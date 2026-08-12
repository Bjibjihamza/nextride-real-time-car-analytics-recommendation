-- =====================================================================
-- NextRide - Cassandra schema (cars_keyspace)
-- Coherent schema aligned with the backend / data generators / Spark job.
-- Table designs intentionally keep user_id as partition key so the
-- backend queries (WHERE user_id = ?) work without ALLOW FILTERING.
-- =====================================================================

CREATE KEYSPACE IF NOT EXISTS cars_keyspace
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}
AND durable_writes = true;

USE cars_keyspace;

-- ---------------------------------------------------------------------
-- cleaned_cars : processed car listings written by the Spark job.
-- id is a deterministic UUID derived from (source, original listing id).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cleaned_cars (
    id uuid PRIMARY KEY,
    brand text,
    condition text,
    creator text,
    door_count int,
    equipment text,
    first_owner text,
    fiscal_power int,
    fuel_type text,
    image_folder text,
    mileage int,
    model text,
    origin text,
    price int,
    publication_date text,
    sector text,
    seller_city text,
    source text,
    title text,
    transmission text,
    year int
);

CREATE INDEX IF NOT EXISTS cleaned_cars_brand_idx ON cleaned_cars (brand);
CREATE INDEX IF NOT EXISTS cleaned_cars_fuel_type_idx ON cleaned_cars (fuel_type);
CREATE INDEX IF NOT EXISTS cleaned_cars_transmission_idx ON cleaned_cars (transmission);

-- ---------------------------------------------------------------------
-- users : registered users (password stored as bcrypt hash).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id uuid PRIMARY KEY,
    age int,
    created_at timestamp,
    email text,
    location text,
    password text,
    username text
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- ---------------------------------------------------------------------
-- user_preferences : user car preferences (sets for multi-valued fields).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id uuid PRIMARY KEY,
    budget_max int,
    budget_min int,
    last_updated timestamp,
    mileage_max int,
    mileage_min int,
    preferred_brands set<text>,
    preferred_door_count set<int>,
    preferred_fuel_types set<text>,
    preferred_transmissions set<text>,
    preferred_years set<int>
);

-- ---------------------------------------------------------------------
-- car_views_by_user : view interactions, partitioned by (user_id, view_date).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS car_views_by_user (
    user_id uuid,
    view_date date,
    view_timestamp timestamp,
    car_id uuid,
    view_duration_seconds int,
    view_source text,
    PRIMARY KEY ((user_id, view_date), view_timestamp)
) WITH CLUSTERING ORDER BY (view_timestamp DESC);

-- ---------------------------------------------------------------------
-- favorite_cars_by_user : user favorite cars, partitioned by user_id.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorite_cars_by_user (
    user_id uuid,
    added_date date,
    added_timestamp timestamp,
    car_id uuid,
    PRIMARY KEY (user_id, added_timestamp)
) WITH CLUSTERING ORDER BY (added_timestamp DESC);

-- ---------------------------------------------------------------------
-- user_searches : search queries + filters, partitioned by user_id.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_searches (
    user_id uuid,
    search_date date,
    search_timestamp timestamp,
    filters map<text, text>,
    result_count int,
    search_query text,
    PRIMARY KEY (user_id, search_timestamp)
) WITH CLUSTERING ORDER BY (search_timestamp DESC);

-- ---------------------------------------------------------------------
-- user_similarities : precomputed pairwise user similarity scores.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_similarities (
    target_user_id uuid,
    reference_user_id uuid,
    last_updated timestamp,
    similarity_score double,
    PRIMARY KEY (target_user_id, reference_user_id)
);

-- ---------------------------------------------------------------------
-- user_recommendations : precomputed recommendations per user.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_recommendations (
    user_id uuid,
    car_id uuid,
    created_at timestamp,
    method text,
    rank int,
    recommendation_reason text,
    similarity_score float,
    PRIMARY KEY (user_id, car_id)
) WITH CLUSTERING ORDER BY (car_id ASC);

-- ---------------------------------------------------------------------
-- car_predictions : stored price predictions, partitioned by user_id.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS car_predictions (
    user_id text,
    prediction_timestamp timestamp,
    prediction_id uuid,
    car_features text,
    predicted_price float,
    PRIMARY KEY (user_id, prediction_timestamp)
) WITH CLUSTERING ORDER BY (prediction_timestamp DESC);
