# NextRide pipeline — technical reference

## Data flow (step by step)

### 1. Producer (`pipeline/producers/producer.py`)
- Reads `data/avito/avito_complete.csv` and `data/moteur/moteur_complete.csv`.
- Headers are UTF-8; a UTF-8 BOM on the Moteur file is stripped.
- Publishes each non-empty row as a JSON message to `avito_cars` / `moteur_cars`.
- Creates the topics on first run (via `KafkaAdminClient`).

### 2. Spark streaming job (`pipeline/processors/spark_cleaning.py`)
- Structured Streaming, `trigger(processingTime="5s")`, `startingOffsets=earliest`.
- Parses each JSON payload against a French field schema.
- Cleaning pipeline per source (`avito` / `moteur`):
  - price: strip spaces / `DH`, keep `10000–10_000_000`
  - year: keep 4-digit years in `1900–2025`
  - mileage: avito ranges `10000-20000` averaged; moteur numeric
  - fiscal power: `3–50`
  - doors: `2–5`
  - fuel: `essence|diesel|hybride`
  - sector: normalised city names (Fès→Fes, …)
  - dates → `dd/MM/yyyy HH:mm`
- Column mapping French → English (`Prix`→`price`, `Marque`→`brand`, …).
- ID: `uuid5("avito|moteur", listing_id)` → idempotent re-publishes.
- Writes to `cars_keyspace.cleaned_cars` (append, consistency ONE).

### 3. Cassandra (`cars_keyspace`)
Schema: `infra/cassandra/schema.cql`.

| Table | Purpose | Primary key |
|-------|---------|-------------|
| `cleaned_cars` | processed listings | `id` |
| `users` | registered users | `user_id` |
| `user_preferences` | user car preferences | `user_id` |
| `car_views_by_user` | view events | `((user_id, view_date), view_timestamp)` |
| `favorite_cars_by_user` | saved cars | `(user_id, added_timestamp)` |
| `user_searches` | search history | `(user_id, search_timestamp)` |
| `user_similarities` | pairwise user similarity | `(target_user_id, reference_user_id)` |
| `user_recommendations` | precomputed recommendations | `(user_id, car_id)` |
| `car_predictions` | stored price predictions | `(user_id, prediction_timestamp)` |

### 4. ML price service (`apps/ml-service/app/api.py`)
Deterministic estimator. Same contract as the original service:

```json
POST /predict
{ "brand": "toyota", "year": 2018, "mileage": 90000, "fuel_type": "diesel", ... }
→ { "prediction": { "predictedPrice": 86000.0 } }
```

The original TensorFlow model artifacts (`.h5` weights, scalers, categorical
mappings) are kept in `apps/ml-service/artifacts/` but not used by the
containerized pipeline yet.

### 5. Backend API (`backend/`)
Express app (split into `app.js` + `server.js`).

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

### 6. Frontend (`nextride/`)
React 19 + MUI + react-router. API URLs centralized in `src/config.js`:

```js
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';
export const ML_BASE_URL   = process.env.REACT_APP_ML_URL   || 'http://localhost:5001';
```

## Environment variables

| Service | Variable | Default |
|---------|----------|---------|
| spark | `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` |
| spark | `CASSANDRA_HOST` / `CASSANDRA_PORT` / `CASSANDRA_KEYSPACE` | `localhost` / `9042` / `cars_keyspace` |
| spark | `CHECKPOINT_BASE` | `/tmp/nextride` |
| producer | `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` |
| producer | `AVITO_CSV` / `MOTEUR_CSV` | `data/avito/…`, `data/moteur/…` |
| ml-service | `PORT` | `5001` |
| backend | `CASSANDRA_CONTACT_POINT` / `CASSANDRA_KEYSPACE` | `localhost` / `cars_keyspace` |
| backend | `ML_SERVICE_URL` | `http://localhost:5001/predict` |
| backend | `JWT_SECRET` | (set in compose) |
| data-gen | `CASSANDRA_HOST`, `NUM_USERS` | `cassandra`, `10` |
| recommend | `CASSANDRA_HOST`, `MAX_USERS` | `cassandra`, `5` |
| data-gen/recommend | `WAIT_FOR_TABLE`, `WAIT_TIMEOUT` | cleaned_cars/users, `180` |
| frontend build | `REACT_APP_API_URL` | `http://localhost:5002` |

## Extending

- **Add a scraping source**: publish new JSON messages to a topic with a schema
  defined in `pipeline/processors/spark_cleaning.py`, add its French→English
  mapping, and register it in the `FRENCH_TO_ENGLISH` dict.
- **Swap in the real model**: retrain a model on the data in
  `apps/ml-service/data/`, save the weights into `apps/ml-service/artifacts/`,
  then make `apps/ml-service/app/` load them and keep the same `/predict`
  contract.
- **New recommendation method**: add it to
  `pipeline/recommendations/combined_recommendations.py` and write to
  `user_recommendations`.
