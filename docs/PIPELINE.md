# NextRide pipeline — technical reference

## Data flow (step by step)

### 1. Scrapers (`pipeline/scrapers/`)
- `avito_scraper.py` — Avito is a Next.js app: listings and details are parsed
  from the `__NEXT_DATA__` JSON blob (no Selenium).
- `moteur_scraper.py` — Moteur is server-rendered HTML; cards + spec table are
  parsed with lxml.
- Both emit the **canonical unified schema** (`pipeline/scrapers/schema.py`),
  so Avito and Moteur use identical labels.
- Checkpointed (`data/<source>/.progress.json`): a run resumes after the last
  completed page; sponsored ads repeated across pages are skipped in-run.
- Rows are inserted into `bronze.listings` (ClickHouse). A CSV is written as a
  **test artifact only** — production uses the warehouse path.

### 2. Bronze (`bronze.listings`, ClickHouse)
Raw append-only captures. Duplicates across runs are intentional (they build
history). Full payload is kept as JSON (`payload` column); key columns are
typed for direct querying. Schema: `infra/clickhouse/init/01_bronze.sql`.

### 3. Silver (`silver.listings`, ClickHouse)
`pipeline/processors/silver_cleaner.py` reads bronze and writes a cleaned,
deduplicated table — one row per `(source, listing_id)` using the latest
capture. Cleaning rules (discovered via EDA over ~2000 ads):
- price: `10000–10_000_000` (filters placeholders like `23 MAD`)
- year: `1980–2026`
- mileage: `0–1_000_000`
- doors: `2–5` ; fiscal power: `3–50`
- fuel → `essence|diesel|hybride|lpg|electrique` ; transmission →
  `manuelle|automatique`
- sector: accents/aliases normalised (Fès→Fes, Salé→Sale, …)
- `N/A`/empty → `NULL`
Schema: `infra/clickhouse/init/02_silver.sql`. Tests:
`tests/scrapers/test_silver_cleaner.py`.

### 4. Gold (`gold.*`, ClickHouse)
Live aggregate views over silver (`market_overview`, `brand_stats`,
`sector_stats`, `fuel_transmission_stats`, `year_stats`, `price_trend`),
consumed by the Streamlit dashboard (`apps/dashboard`, port 8501).
Schema: `infra/clickhouse/init/03_gold.sql`.

### 5. Serving layer (PostgreSQL)
`pipeline/serving/sync_cars.py` mirrors silver into the `cars` table with a
deterministic `uuid5(source, listing_id)` id. The operational schema
(`infra/postgres/init/01_schema.sql`) holds `users`, `cars`,
`user_preferences`, `car_views_by_user`, `favorite_cars_by_user`,
`user_searches`, `user_similarities`, `user_recommendations`,
`car_predictions`.

One-shot seeds:
- `data-gen` (`pipeline/synthetic/`) — users, preferences, views, favorites,
  searches.
- `recommend` (`pipeline/recommendations/combined_recommendations.py`) —
  content/user/item-based + hybrid recommendations into
  `user_recommendations`.

### 6. ML price service (`apps/ml-service/app/api.py`)
Deterministic estimator. Same contract as the original service:

```json
POST /predict
{ "brand": "toyota", "year": 2018, "mileage": 90000, "fuel_type": "diesel", ... }
→ { "prediction": { "predictedPrice": 86000.0 } }
```

The original TensorFlow model artifacts (`.h5` weights, scalers, categorical
mappings) are kept in `apps/ml-service/artifacts/` but not used by the
containerized pipeline yet.

### 7. Backend API (`apps/api/`)
Express app (split into `app.js` + `server.js`), reads PostgreSQL via
`node-postgres`.

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/register` | register |
| POST | `/api/auth/login` | login |
| GET  | `/api/auth/verify` | validate token |
| GET/PUT | `/api/users` | profile |
| GET/PUT | `/api/users/preferences` | preferences |
| GET/POST/DELETE | `/api/users/favorites` | favorites |
| GET | `/api/users/recommendations` | precomputed recommendations |
| GET | `/api/users/recommendations/generate` | returns stored recommendations |
| POST | `/api/search` | search cars |
| GET | `/api/cars` , `/api/cars/latest` | listing |
| GET | `/api/cars/:id` | car details |
| GET | `/api/cars/brands` , `/api/cars/bubbles` | visualizations |
| POST | `/api/cars/view` | record view |
| POST | `/api/cars` | create listing (multer upload) |
| POST | `/api/prediction` | predict price (calls ml-service) |
| GET | `/api/prediction/history` | user prediction history |

### 8. Frontend (`apps/web/`)
React + MUI + react-router. API URLs centralized in `src/config.js`:

```js
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';
export const ML_BASE_URL   = process.env.REACT_APP_ML_URL   || 'http://localhost:5001';
```

## Environment variables

| Service | Variable | Default |
|---------|----------|---------|
| scrapers / cleaners | `CLICKHOUSE_URL` / `CLICKHOUSE_USER` / `CLICKHOUSE_PASSWORD` | `http://localhost:8123` / `default` / `nextride` |
| backend | `PG_HOST` / `PG_DATABASE` / `PG_USER` / `PG_PASSWORD` | `postgres` / `nextride` / `nextride` / `nextride` |
| backend | `ML_SERVICE_URL` | `http://localhost:5001/predict` |
| backend | `JWT_SECRET` | (set in compose) |
| data-gen | `PG_HOST`, `NUM_USERS` | `postgres`, `10` |
| recommend | `PG_HOST`, `MAX_USERS` | `postgres`, `5` |
| ml-service | `PORT` | `5001` |
| frontend build | `REACT_APP_API_URL` | `http://localhost:5002` |

## Extending

- **Add a scraping source**: emit rows in the canonical schema
  (`pipeline/scrapers/schema.py`) into `bronze.listings`.
- **Tighten cleaning**: edit the rules in
  `pipeline/processors/silver_cleaner.py` (and its tests).
- **Swap in the real model**: retrain on `silver.listings`, save weights into
  `apps/ml-service/artifacts/`, and keep the same `/predict` contract.
- **New recommendation method**: add it to
  `pipeline/recommendations/combined_recommendations.py` and write to
  `user_recommendations`.
