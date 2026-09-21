# Architecture technique — NextRide

## Flux de données global

```
 Avito.ma ─┐
          ├─▶ [1] Scrapers (Python) ─▶ Kafka ─▶ MinIO (Parquet, raw)
 Moteur.ma┘                                    │
                                                ▼
                                        [3] Spark (clean, dedup, features)
                                                │
              ┌─────────────────────────────────┤
              ▼                                 ▼
      [4] dbt ─▶ ClickHouse (analytics)    Datasets ML (MinIO/Spark)
              │                                 │
        ┌─────┼──────┐                          ▼
        ▼     ▼      ▼                 [7] ML (CatBoost/XGBoost, LightFM, MLflow)
   [5] BI  [6] API  [6] Dashboard       ▶ deal score · prix · recommandations
                 │                             │
                 ▼                             ▼
        PostgreSQL (app) ◀────────── Redis (cache) ◀─── FastAPI
                                                    │
                                                    ▼
                                          Frontend (Next.js + React)
```

## Couche par couche

### 1. Scraping — Python + Requests/HTTPX + lxml/BeautifulSoup
- Sources : **Avito.ma**, **Moteur.ma** (HTML/JSON, pas de Selenium par défaut).
- Unification minimale des champs (schéma canonique commun aux sources).
- Gestion : pagination, erreurs réseau, reprise de collecte (checkpointing).

**Output :** données brutes d'annonces → **Kafka / MinIO**.

### 2. Ingestion & stockage brut — Kafka + MinIO + Parquet
- Les scrapers **publient** dans Kafka (découplage producteur/consommateur).
- Les consommateurs **persistent** le raw en Parquet dans MinIO (historique complet des snapshots).
- Parquet = format efficace pour les lectures analytiques Spark.

**Output :** données brutes historisées + événements exploitables → **Spark**.

### 3. Traitement Big Data — Apache Spark
- Nettoyage, déduplication, normalisation multi-sources (marques, modèles, villes).
- Feature engineering initial, gestion des valeurs manquantes, contrôle qualité.

Exemples de normalisation :
- `VW`, `Volkswagen`, `volks wagen` → `Volkswagen`
- `Casa`, `Casablanca` → `Casablanca`

**Output :** données clean → **dbt** (analytics) et **datasets ML**.

### 4. Transformation analytique — dbt → ClickHouse
- dbt construit les **marts** analytiques et teste la qualité des modèles.
- Les agrégats sont chargés dans **ClickHouse** (OLAP).

Exemples de datasets : prix médian par modèle/année, volume d'annonces par ville,
évolution des prix dans le temps, durée de vie des annonces.

**Output :** tables analytiques → **BI**, **analytics app**, **features ML (partiel)**.

### 5. BI & Market Intelligence — Power BI / Superset
- Dashboard marché : tendances de prix, répartition par ville, top marques/modèles,
  analyse temporelle.
- **Input principal :** ClickHouse.
- Premier produit visible : **« miroir du marché automobile marocain »** (MVP Analytics).

### 6. Backend applicatif — FastAPI + PostgreSQL + Redis + Next.js
- **FastAPI** : point d'accès unique — listings, favoris, profil, recherche,
  analytics, score/recommandations.
- **PostgreSQL** : users, favoris, préférences, sessions, historique de recherche.
- **Redis** : cache des requêtes fréquentes et recommandations pré-calculées.
- **Next.js + React** : marketplace, page détail annonce, profil, tableau analytics,
  zone recommandations.

### 7. ML & IA — CatBoost/XGBoost + LightFM + MLflow
- **7.1 Price estimation** : prédiction du prix juste, écart au marché, **Deal Score**.
  Inputs : datasets MinIO/Spark, agrégats ClickHouse.
- **7.2 Recommendation engine** : content-based sur préférences, puis collaborative/
  hybride. Inputs : comportements utilisateurs (PostgreSQL/event tracking), profils,
  listings clean, signaux marché.
- **7.3 MLOps** : MLflow pour le suivi des versions, comparaison des runs et registry.

**Output :** modèles servis via **FastAPI → Frontend**.

### 8. Ops & supervision — Docker + GitHub Actions + Prometheus + Grafana
- Containerisation de tous les services (Docker Compose).
- CI/CD (GitHub Actions) : tests, lint, build images.
- Monitoring : API, pipelines, Kafka, Spark, DB — métriques, alerting, logs.

> Transverse : Docker peut démarrer tôt ; la supervision complète vient en général plus tard.

---

## Synthèse des flux inter-services

| Depuis | Vers | Contenu |
| --- | --- | --- |
| Scrapers | Kafka | annonces brutes |
| Kafka | MinIO | raw Parquet (historique) |
| MinIO / Kafka | Spark | traitement, nettoyage |
| Spark | dbt | données clean |
| dbt | ClickHouse | tables analytiques / agrégats |
| ClickHouse | BI, FastAPI, ML features | analytics, signaux marché |
| Spark | ML training | datasets ML |
| PostgreSQL | ML reco | préférences / comportements |
| ML models | FastAPI | prix, deal score, recommandations |
| FastAPI | Frontend | API |
| PostgreSQL / Redis | FastAPI | données applicatives + cache |