# NextRide — Real-Time Car Analytics & Recommendation

A full-stack, Dockerized pipeline for the **Moroccan used-car market**
(Avito / Moteur). It scrapes live listings into a **ClickHouse** data
warehouse (bronze → silver → gold), exposes an analytics **dashboard**, and
serves a **React frontend** with price prediction and personalized
recommendations backed by **PostgreSQL**.

```
                          ┌───────────────┐
  scrapers (avito/moteur)─▶│   ClickHouse  │  bronze (raw) → silver (cleaned)
                          └───────┬───────┘  gold (aggregates) → dashboard :8501
                                  │ sync_cars (silver → postgres cars)
                          ┌───────▼───────┐
                          │  PostgreSQL   │  users, cars, views, favorites,
                          └───────┬───────┘  searches, recommendations
                                  │ queries (node-postgres)
                  ┌───────────────┴───────────────┐
                  │        ml-service (:5001)     │  price estimator
                  └───────────────▲───────────────┘
                  ┌───────────────┴───────────────┐
                  │        backend (:5002→5000)   │  Express REST API
                  │  auth · cars · search ·       │
                  │  predictions · recommendations│
                  └───────────────▲───────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  │       frontend (:3000)        │  React (built + nginx)
                  └───────────────────────────────┘

  One-shot jobs:
    data-gen      seeds synthetic users / views / favorites / searches
    recommend     precomputes recommendations (combined_recommendations.py)
```

### Components

| Service      | Image / runtime                | Host port | Role                                        |
|--------------|--------------------------------|-----------|---------------------------------------------|
| `clickhouse` | `clickhouse/clickhouse-server` | `8123`    | Data warehouse (bronze/silver/gold)         |
| `postgres`   | `postgres:16-alpine`           | `5432`    | Operational DB (serving layer)              |
| `dashboard`  | `python:3.11-slim` + Streamlit | `8501`    | Analytics dashboard over gold views         |
| `ml-service` | `python:3.11-slim`             | `5001`    | `POST /predict` price estimator             |
| `backend`    | `node:20-alpine`               | `5002`    | Express API (PostgreSQL + ML service)       |
| `frontend`   | `node:20` + `nginx:alpine`     | `3000`    | React SPA                                   |
| `data-gen`   | `python:3.11-slim`             | —         | Synthetic user data (one-shot)              |
| `recommend`  | `python:3.11-slim`             | —         | Recommendation computation (one-shot)       |

---

## 1. Quick start

Prerequisites: **Docker** with Docker Compose v2, **Python 3.10+**.

```bash
# Build + start everything (first build takes a few minutes)
docker compose -f deploy/docker-compose.yml up -d --build
# ... or, if you have GNU make:
make up
```

### Data flow once the stack is up

1. **Scrape** — `python pipeline/scrapers/avito_scraper.py --pages 3`
   and `pipeline/scrapers/moteur_scraper.py --pages 3` write raw listings
   into `bronze.listings` (checkpointed, deduplicated within a run).
2. **Clean** — `python pipeline/processors/silver_cleaner.py` turns bronze
   into `silver.listings` (one row per `(source, listing_id)`, cleaned).
3. **Serve** — `python pipeline/serving/sync_cars.py` mirrors silver into
   the PostgreSQL `cars` table (or `make sync-cars`).
4. **Seed + recommend** (repeatable):
   ```bash
   docker compose -f deploy/docker-compose.yml run --rm data-gen
   docker compose -f deploy/docker-compose.yml run --rm recommend
   # or: make seed
   ```

Open the app:

| What       | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:3000        |
| Backend    | http://localhost:5002        |
| ML service | http://localhost:5001/health |
| Dashboard  | http://localhost:8501        |

Check the warehouse / database:

```bash
docker exec nextride-clickhouse clickhouse-client --query "SELECT source, count() FROM silver.listings GROUP BY source;"
docker exec nextride-postgres psql -U nextride -d nextride -c "SELECT count(*) FROM cars;"
```

### Stop / reset

```bash
docker compose -f deploy/docker-compose.yml down      # stop (keeps data)
docker compose -f deploy/docker-compose.yml down -v   # stop + wipe volumes
```

---

## 2. The warehouse (medallion in ClickHouse)

- **Bronze** (`bronze.listings`) — raw append-only captures from the
  scrapers, one row per seen ad (duplicates are expected and intentional;
  they build history). Full payload kept as JSON.
- **Silver** (`silver.listings`) — cleaned, conformed, deduplicated: one row
  per `(source, listing_id)` using the latest capture. Cleaning rules
  (price bounds, fuel/sector normalization, N/A handling) live in
  `pipeline/processors/silver_cleaner.py`.
- **Gold** — live aggregate views (`market_overview`, `brand_stats`,
  `sector_stats`, `fuel_transmission_stats`, `year_stats`, `price_trend`)
  consumed by the dashboard.

The scrapers share a **canonical schema** (`pipeline/scrapers/schema.py`)
so Avito and Moteur use identical labels. CSV output is a test artifact
only — the production path is scrapers → ClickHouse → Postgres.

## 3. The serving layer (PostgreSQL)

`infra/postgres/init/01_schema.sql` defines the operational schema:
`users`, `cars` (mirror of silver), `user_preferences`, `car_views_by_user`,
`favorite_cars_by_user`, `user_searches`, `user_recommendations`,
`user_similarities`, `car_predictions`. The backend reads/writes this DB via
`node-postgres`; car IDs are deterministic `uuid5(source, listing_id)`.

## 4. Tests

```bash
# ML price service (pytest, no Docker needed)
cd apps/ml-service && python -m pytest tests -q

# Backend API (Jest + supertest, PostgreSQL & ML mocked, no Docker needed)
cd apps/api && npm test

# Silver cleaner (unittest, no Docker needed)
python tests/scrapers/test_silver_cleaner.py

# Scraper smoke test (hits the live sites, limited rows)
python tests/scrapers/scraper_smoke_test.py --limit 5

# End-to-end smoke test (requires the stack to be running)
python tests/e2e/smoke_test.py

# All of the above (if you have GNU make)
make test
```

## 5. Project structure

```
├── Makefile                        # make up / down / test / seed / smoke / sync-cars
├── deploy/
│   └── docker-compose.yml          # full stack orchestration
├── infra/
│   ├── clickhouse/init/            # bronze/silver/gold SQL (applied on first start)
│   ├── postgres/init/              # operational schema
│   └── docker/                     # per-service Dockerfiles + runners
├── apps/
│   ├── api/                        #   Express REST API (PostgreSQL)
│   ├── web/                        #   React frontend
│   ├── dashboard/                  #   Streamlit analytics dashboard
│   └── ml-service/                 #   Flask price prediction
├── pipeline/
│   ├── scrapers/                   #   avito + moteur scrapers, schema, ClickHouse helper
│   ├── processors/                 #   silver_cleaner.py (bronze → silver)
│   ├── serving/                    #   pg_db helper + sync_cars (silver → postgres)
│   ├── synthetic/                  #   data generators (users/views/favorites/searches)
│   └── recommendations/            #   combined recommendation algorithm
├── data/                           # scraped CSVs (test artifacts only)
├── tests/
│   ├── e2e/                        # smoke_test.py
│   └── scrapers/                   # scraper smoke test + silver cleaner tests
└── docs/                           # ARCHITECTURE.md, PIPELINE.md, legacy/
```

## 6. Troubleshooting

- **`port is already allocated`** — change the `"HOST:CONTAINER"` mapping in
  `deploy/docker-compose.yml` and `REACT_APP_API_URL` accordingly.
- **Scrapers fail to connect to ClickHouse** — check the service is up
  (`docker compose ps`) and credentials match `CLICKHOUSE_*`.
- **Backend serves no cars** — run the silver cleaner then `make sync-cars`.
- **No recommendations** — run `data-gen` then `recommend` (needs a seeded
  user with views/favorites).

## 7. Roadmap

- **Real ML model** — train the price model on `silver.listings`/features
  history and serve it behind the same `/predict` contract (the current
  estimator is a placeholder).
- **Scheduling** — automate scraping + cleaning (cron/Airflow) with
  idempotent re-runs.
- **Monitoring** — structured logging and pipeline health dashboards.
