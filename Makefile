COMPOSE := docker compose -f deploy/docker-compose.yml

.PHONY: up down build ps logs reset seed seed-data recommend smoke test test-backend test-ml

## Build & start the full stack (first build takes a few minutes)
up:
	$(COMPOSE) up -d --build

## Stop the stack (keeps data volumes)
down:
	$(COMPOSE) down

## Rebuild all images without restarting
build:
	$(COMPOSE) build

## Container status
ps:
	$(COMPOSE) ps

## Tail logs of all services
logs:
	$(COMPOSE) logs -f

## Stop the stack AND delete all volumes (fresh start)
reset:
	$(COMPOSE) down -v

## Seed synthetic user data + compute recommendations (requires up)
seed: seed-data recommend

## Seed synthetic users / views / favorites / searches
seed-data:
	$(COMPOSE) run --rm data-gen

## Compute recommendations for seeded users
recommend:
	$(COMPOSE) run --rm recommend

## Re-publish the scraped CSVs to Kafka (idempotent)
publish:
	$(COMPOSE) run --rm producer

## End-to-end smoke test (requires the stack to be up)
smoke:
	python tests/e2e/smoke_test.py

## Run all unit tests (backend + ml-service)
test: test-backend test-ml

## Backend API tests (Jest + supertest, no Docker needed)
test-backend:
	cd apps/api && npm test -- --runInBand

## ML service tests (pytest, no Docker needed)
test-ml:
	cd apps/ml-service && python -m pytest tests -q
