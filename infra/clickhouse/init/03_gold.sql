-- =====================================================================
-- NextRide - ClickHouse - Gold layer
-- Aggregate views over silver.listings, ready for dashboards / BI.
-- Live views: they always reflect the current silver state.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS gold;

-- KPIs globaux par source
CREATE OR REPLACE VIEW gold.market_overview AS
SELECT
    source,
    count()                                                                  AS n_listings,
    countIf(price IS NOT NULL)                                               AS n_priced,
    round(avg(price))                                                        AS avg_price,
    round(quantile(0.5)(price))                                              AS median_price,
    round(min(price))                                                        AS min_price,
    round(max(price))                                                        AS max_price,
    uniqExact(brand)                                                         AS n_brands,
    round(avg(year))                                                         AS avg_year,
    round(avg(mileage))                                                      AS avg_mileage
FROM silver.listings
GROUP BY source;

-- Statistiques par marque
CREATE OR REPLACE VIEW gold.brand_stats AS
SELECT
    source,
    brand,
    count()                       AS n_listings,
    round(avg(price))             AS avg_price,
    round(quantile(0.5)(price))   AS median_price,
    round(avg(year))              AS avg_year,
    round(avg(mileage))           AS avg_mileage
FROM silver.listings
WHERE brand != ''
GROUP BY source, brand;

-- Statistiques par ville / secteur
CREATE OR REPLACE VIEW gold.sector_stats AS
SELECT
    source,
    sector,
    count()                       AS n_listings,
    round(avg(price))             AS avg_price,
    round(quantile(0.5)(price))   AS median_price
FROM silver.listings
GROUP BY source, sector;

-- Distribution carburant x transmission
CREATE OR REPLACE VIEW gold.fuel_transmission_stats AS
SELECT
    source,
    fuel_type,
    transmission,
    count()                       AS n_listings,
    round(avg(price))             AS avg_price
FROM silver.listings
GROUP BY source, fuel_type, transmission;

-- Prix par année-modèle
CREATE OR REPLACE VIEW gold.year_stats AS
SELECT
    source,
    year,
    count()                       AS n_listings,
    round(avg(price))             AS avg_price,
    round(quantile(0.5)(price))   AS median_price
FROM silver.listings
WHERE year IS NOT NULL
GROUP BY source, year;

-- Tendance prix par mois de publication
CREATE OR REPLACE VIEW gold.price_trend AS
SELECT
    source,
    toStartOfMonth(parseDateTimeBestEffort(publication_date)) AS month,
    count()                       AS n_listings,
    round(avg(price))             AS avg_price,
    round(quantile(0.5)(price))   AS median_price
FROM silver.listings
WHERE publication_date != '' AND publication_date IS NOT NULL AND price IS NOT NULL
GROUP BY source, month;
