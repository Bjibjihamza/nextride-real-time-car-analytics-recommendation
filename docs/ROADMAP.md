# Roadmap de réalisation — NextRide

## Ordre de travail recommandé

### Sprint / Phase A — Base data platform
1. Scrapers Python
2. Stockage brut MinIO
3. Traitement Spark
4. ClickHouse

### Sprint / Phase B — Premier produit visible
1. Dashboard BI

### Sprint / Phase C — Plateforme utilisateur
1. FastAPI
2. PostgreSQL
3. Frontend Next.js

### Sprint / Phase D — Intelligence
1. Price model
2. Deal Score
3. Recommendation engine
4. MLflow

### Sprint / Phase E — Industrialisation
1. Redis
2. Docker Compose
3. GitHub Actions
4. Prometheus + Grafana

---

## MVP par niveaux

| Niveau | Contenu |
| --- | --- |
| **MVP 1 — Data & Analytics** | Scraping · MinIO · Spark · ClickHouse · BI dashboard |
| **MVP 2 — Produit web** | FastAPI · PostgreSQL · Next.js · recherche / favoris / analytics |
| **MVP 3 — Intelligence** | estimation prix · deal score · recommandations |
| **MVP 4 — Production-ready** | monitoring · CI/CD · cache · supervision |

---

## Logique de priorité

1. **MVP 1 d'abord** : c'est le cœur data (collecte → stockage → nettoyage → OLAP → BI).
   Il donne un produit visible tôt et alimente tout le reste.
2. **MVP 2 ensuite** : l'app web consomme les données analytiques déjà en place.
3. **MVP 3** : le ML s'appuie sur les datasets propres (Spark) + comportements (PostgreSQL),
   donc après l'app.
4. **MVP 4** : l'industrialisation sécurise l'ensemble une fois la valeur prouvée.

---

## Décisions à valider au fur et à mesure

- **Power BI vs Apache Superset** (Phase 5) — selon l'envie de valoriser la formation BI
  ou d'avoir une stack entièrement self-hosted.
- **Scheduling** : Airflow complet dès le début vs cron/simple scheduler pour démarrer.
- **Portée des événements utilisateurs** : tracking interne dès la Phase 6, ou simple
  lecture des interactions PostgreSQL pour la reco (Phase 7).