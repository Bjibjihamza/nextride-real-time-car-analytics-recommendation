# NextRide — Real-Time Car Analytics & Recommendation

A full-stack, Dockerized big-data pipeline for the **Moroccan used-car market**
(Avito / Moteur). It ingests scraped car listings, streams them through
**Kafka**, cleans them with **Spark**, stores them in **Cassandra**, serves a
**REST API**, and exposes a **React frontend** with price prediction and
personalized recommendations.

> **Status:** the *pipeline* works end-to-end. Web scraping and the real ML
> price model are the next milestones — see [Roadmap](#roadmap).

---

## 1. Architecture

```
                          ┌───────────────┐
   data/ (scraped CSVs)──▶│   producer    │  publishes raw rows
                          └──────┬────────┘      as JSON
                                 │ Kafka topics: avito_cars / moteur_cars
                          ┌──────▼────────┐
                          │     Kafka     │
                          └──────┬────────┘
                                 │ streaming consume (earliest)
                          ┌──────▼────────┐
                          │    Spark      │  cleans/normalises French data,
                          │ (PySpark job) │  deterministic UUIDs, dedup
                          └──────┬────────┘
                                 │ write
                          ┌──────▼────────┐
                          │  Cassandra    │  cars_keyspace (8 tables)
                          └──────┬────────┘
                                 │ queries (cassandra-driver)
                 ┌───────────────┴───────────────┐
                 │        ml-service (:5001)     │  deterministic price
                 │         Flask /predict        │  estimator (placeholder
                 └───────────────▲───────────────┘   for the real model)
                                 │
                 ┌───────────────┴───────────────┐
                 │        backend (:5002→5000)   │  Express REST API
                 │  auth · cars · search ·       │
                 │  predictions · recommendations│
                 └───────────────▲───────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │       frontend (:3000)        │  React (built + nginx)
                 └───────────────────────────────┘

  One-shot jobs (after the core is up):
    data-gen      seeds synthetic users / views / favorites / searches
    recommend     precomputes recommendations (combined_recommendations.py)
```

### Components

| Service           | Image / runtime             | Host port | Role                                        |
|-------------------|-----------------------------|-----------|---------------------------------------------|
| `cassandra`       | `cassandra:4.1`             | `9042`    | Storage (`cars_keyspace`)                   |
| `cassandra-init`  | `cassandra:4.1`             | —         | Applies `infra/cassandra/schema.cql` (once) |
| `kafka`           | `apache/kafka:3.7.0`        | `9092`    | Messaging (KRaft, single node)              |
| `kafka-init`      | `apache/kafka:3.7.0`        | —         | Creates topics `avito_cars`/`moteur_cars`   |
| `spark`           | `apache/spark:3.5.0-python3` | —        | Streaming cleaning Kafka → Cassandra        |
| `producer`        | `python:3.11-slim`          | —         | CSV → Kafka (one-shot)                      |
| `ml-service`      | `python:3.11-slim`          | `5001`    | `POST /predict` price estimator             |
| `backend`         | `node:20-alpine`            | `5002`    | Express API                                 |
| `frontend`        | `node:20` + `nginx:alpine`  | `3000`    | React SPA                                   |
| `data-gen`        | `python:3.11-slim`          | —         | Synthetic user data (one-shot)              |
| `recommend`       | `python:3.11-slim`          | —         | Recommendation computation (one-shot)       |

> **Note on ports:** the backend is exposed on host port **5002** because
> port 5000 is already used by another project on this machine. The frontend
> build is configured with `REACT_APP_API_URL=http://localhost:5002`.

---

## 2. Quick start

Prerequisites: **Docker** with Docker Compose v2.

```bash
# Build + start everything (first build takes a few minutes)
docker compose -f deploy/docker-compose.yml up -d --build
# ... or, if you have GNU make:
make up

# Watch the pipeline self-assemble:
#   1. cassandra + kafka become healthy
#   2. schema + topics are created
#   3. spark starts streaming
#   4. producer publishes the scraped CSVs
#   5. data-gen seeds synthetic users, recommend computes recommendations
docker compose -f deploy/docker-compose.yml ps

# Check the data landed in Cassandra
docker exec nextride-cassandra cqlsh -e "SELECT COUNT(*) FROM cars_keyspace.cleaned_cars;"

# Run the end-to-end smoke test
python tests/e2e/smoke_test.py
```

Open the app:

| What       | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:3000        |
| Backend    | http://localhost:5002        |
| ML service | http://localhost:5001/health |

### Manual / repeatable seeding

`docker compose up -d` already runs the seeders once. To re-run them:

```bash
docker compose -f deploy/docker-compose.yml run --rm data-gen
docker compose -f deploy/docker-compose.yml run --rm recommend
# or: make seed
```

To re-publish the CSVs (idempotent — rows are de-duplicated by deterministic
UUID):

```bash
docker compose -f deploy/docker-compose.yml run --rm producer
```

### Stop / reset

```bash
docker compose -f deploy/docker-compose.yml down      # stop (keeps data)
docker compose -f deploy/docker-compose.yml down -v   # stop + wipe volumes
```

---

## 3. How the data flows

1. **Ingestion** — `pipeline/producers/producer.py` reads
   `data/avito/avito_complete.csv` and `data/moteur/moteur_complete.csv` and
   publishes every row as a UTF-8 JSON message to the corresponding topic
   (strips the Moteur BOM from headers, drops empty values).
2. **Streaming cleaning** — `pipeline/processors/spark_cleaning.py` (PySpark
   Structured Streaming, `startingOffsets=earliest`) parses each JSON payload,
   normalises the French column names to the English schema, cleans values
   (price, mileage ranges, year, fiscal power, doors, sector, dates), filters
   invalid fuel/transmission values, de-duplicates, and assigns a
   **deterministic UUID** derived from `(source, listing_id)` so re-publishing
   never creates duplicates.
3. **Storage** — cleaned rows are written to `cars_keyspace.cleaned_cars`.
   Synthetic user tables (`users`, `user_preferences`, `car_views_by_user`,
   `favorite_cars_by_user`, `user_searches`) are seeded by `data-gen`.
4. **Recommendations** — `recommend` runs
   `pipeline/recommendations/combined_recommendations.py` (content-based +
   user-based + item-based + hybrid) and stores results in
   `user_recommendations`.
5. **Serving** — the Express backend reads Cassandra, calls `ml-service`
   (`POST /predict`) for price estimates, and serves the React frontend.

---

## 4. Tests

```bash
# ML price service (pytest, no Docker needed)
cd apps/ml-service && python -m pytest tests -q

# Backend API (Jest + supertest, Cassandra & ML mocked, no Docker needed)
cd apps/api && npm test

# End-to-end smoke test (requires the stack to be running)
python tests/e2e/smoke_test.py

# All of the above (if you have GNU make)
make test
```

The smoke test verifies: backend up, ML service up, cars present in
Cassandra, registration + login, search, price prediction, and authenticated
routes.

---

## 5. What was refactored (2026 cleanup)

The 2023 codebase was cleaned, Dockerized, and reorganised into a
domain-based monorepo (see `docs/ARCHITECTURE.md` for the full rationale):

- **Dockerized everything** — `deploy/docker-compose.yml` + per-service
  `Dockerfile`s under `infra/docker/`.
- **New monorepo layout** — `apps/` (served applications: `api`, `web`,
  `ml-service`), `pipeline/` (data code: `scrapers`, `producers`,
  `processors`, `synthetic`, `recommendations`), `infra/` (schemas + Docker),
  `deploy/` (orchestration), `tests/`, `docs/`.
- **Replaced the TensorFlow model** — the old `ml_service.py` needed a
  multi-GB TF runtime. It is now a deterministic, dependency-light price
  estimator (same `/predict` contract, always returns a plausible MAD price).
  The original artifacts (`.h5` weights, scalers, categorical mappings)
  remain in `apps/ml-service/artifacts/` for the real model milestone.
- **Coherent Cassandra schema** — `infra/cassandra/schema.cql` aligns every
  table with the actual queries (user_id as partition key where the backend
  filters by user, `user_recommendations` columns `method/rank/reason/score`,
  `car_predictions` keyed by `(user_id, prediction_timestamp)`).
- **Frontend API config** — the hardcoded `http://localhost:5000` URLs were
  centralized in `apps/web/src/config.js` (`API_BASE_URL`, `ML_BASE_URL`),
  driven by `REACT_APP_API_URL` at build time.
- **Backend fixes** — env-driven Cassandra config, removed the unused
  `@tensorflow/tfjs-node` dependency, split `app.js` (testable) from
  `server.js`, fixed favorite remove queries for the new primary keys, made
  `filters` a real map in `user_searches`, and made `/recommendations/generate`
  read precomputed rows instead of shelling out to Python.
- **Deterministic Spark IDs** — cleaned rows use `uuid5(source, listing_id)`,
  making the pipeline idempotent.
- **Seed scripts are env-driven** — `pipeline/synthetic/*` and the
  recommendation scripts read `CASSANDRA_HOST` from the environment instead of
  `localhost`.
- **Repo hygiene** — `backend/node_modules` (15,900 files) was untracked from
  git, `documentaions/` merged into `docs/`, root CSV dumps moved to `data/`.

---

## 6. Project structure

```
├── Makefile                        # make up / down / test / seed / smoke
├── deploy/
│   └── docker-compose.yml          # full stack orchestration
├── infra/
│   ├── cassandra/schema.cql        # Cassandra schema
│   └── docker/                     # Dockerfiles + runner scripts
├── apps/                           # served applications
│   ├── api/                        #   Express REST API
│   │   ├── src/  (config/routes/controllers/models/middleware)
│   │   └── tests/
│   ├── web/                        #   React frontend
│   └── ml-service/                 #   Flask price prediction
│       ├── app/  (api.py, features.py)
│       ├── artifacts/              #     original TF model artifacts
│       └── tests/
├── pipeline/                       # data code (transform/move)
│   ├── scrapers/                   #   Selenium (avito, moteur)
│   ├── producers/                  #   CSV → Kafka
│   ├── processors/                 #   Spark cleaning job
│   ├── synthetic/                  #   data generators
│   └── recommendations/            #   algorithms + combined runner
├── data/                           # scraped CSVs (+ reference dumps)
├── tests/e2e/                      # smoke_test.py
├── docs/                           # PIPELINE.md, ARCHITECTURE.md, legacy/ (2023 docs)
└── README.md
```

---

## 7. Troubleshooting

- **`port is already allocated` on 5002/3000/9042/9092** — another process is
  using it. Change the `"HOST:CONTAINER"` mapping in
  `deploy/docker-compose.yml` and the `REACT_APP_API_URL` build arg
  accordingly.
- **Spark is slow on first start** — it downloads the Kafka/Cassandra
  connector jars from Maven into the `spark_ivy` volume (a few minutes).
- **`UnknownTopicOrPartitionException`** — run `docker compose -f
  deploy/docker-compose.yml up -d` so `kafka-init` creates the topics before
  Spark/subscribers start.
- **Cassandra `no available connections`** — give Cassandra time
  (`start_period` is 60s); check `docker logs nextride-cassandra`.
- **Want the original ML model?** — the TF artifacts are still in
  `apps/ml-service/artifacts/`. Swapping back means returning to a
  TensorFlow-based image (see Roadmap).

---

## 8. Roadmap

- **Web scraping** — finish wiring `pipeline/scrapers/avito_scraper.py` and
  `pipeline/scrapers/moteur_scraper.py` (Selenium) to feed the producer
  continuously.
- **Real ML model** — retrain and serve the model behind the same `/predict`
  contract using the original artifacts kept in `apps/ml-service/artifacts/`
  (`.h5` weights, scalers, categorical mappings); the deterministic estimator
  is only a placeholder.
- **Airflow** — recreate scheduling DAGs for the scrapers (the 2023 DAGs were
  removed during the cleanup; the scraping workflow itself is not yet wired in).
- **Monitoring** — add structured logging and health dashboards.
