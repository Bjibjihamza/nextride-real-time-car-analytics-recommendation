# Phases du projet NextRide

Version finale, phase par phase : **Objectif · Outils · Inputs · Outputs · Dépend de**.

## Synthèse

| Phase | Objectif | Outils | Inputs | Outputs | Dépend de |
| --- | --- | --- | --- | --- | --- |
| **1. Collecte** | Récupérer les annonces des sources externes | Python, lxml/BS4, Avito.ma, Moteur.ma, Airflow (ou cron) | sites sources | annonces brutes | — |
| **2. Ingestion / stockage brut** | Conserver l'historique brut complet | Kafka, MinIO, Parquet | annonces brutes | raw historisé + événements | Phase 1 |
| **3. Traitement / nettoyage** | Données propres et cohérentes | Apache Spark | raw MinIO/Kafka | données clean + features | Phase 2 |
| **4. Modélisation analytique** | Datasets métiers exploitables | dbt, ClickHouse | données clean | tables analytiques (marts) | Phase 3 |
| **5. BI / Market Intelligence** | Vision marché | Power BI / Superset | ClickHouse | miroir du marché (MVP Analytics) | Phase 4 |
| **6. Backend + frontend** | Plateforme utilisateur | FastAPI, PostgreSQL, Redis, Next.js | ClickHouse, Postgres, Redis | API + web app | Phase 4 |
| **7. ML & IA** | Intelligence métier | CatBoost/XGBoost, LightFM, MLflow | MinIO/Spark datasets, ClickHouse, PostgreSQL | prix, deal score, recos | Phases 3, 4, 6 |
| **8. Industrialisation** | Stable, déployable, supervisé | Docker Compose, GitHub Actions, Prometheus, Grafana | tous services | stack orchestrée + monitoring | transverse |

---

## Détail par phase

### Phase 1 — Collecte des données

- **Objectif :** récupérer les annonces depuis les sources externes.
- **Blocs :** Avito.ma, Moteur.ma, scrapers Python, Airflow (ou scheduler simple au début).
- **Ce qu'on fait :** créer les scrapers, unifier le minimum de champs, lancer la
  collecte régulièrement, gérer pagination, erreurs et reprise.
- **Inputs :** sites sources.
- **Outputs :** données brutes d'annonces.
- **Lien vers la suite :** `Scrapers → Kafka / MinIO`.

### Phase 2 — Ingestion & stockage brut

- **Objectif :** conserver toutes les données dans leur forme brute/historique.
- **Blocs :** Kafka, MinIO + Parquet.
- **Ce qu'on fait :** publier les annonces dans Kafka, stocker le raw dans MinIO,
  historiser tous les snapshots.
- **Pourquoi :** Kafka = décorréler scraping/traitement ; MinIO = historique complet ;
  Parquet = format efficace pour analytics/Spark.
- **Inputs :** annonces brutes.
- **Outputs :** données brutes historisées + événements exploitables.
- **Lien vers la suite :** `Kafka / MinIO → Spark`.

### Phase 3 — Traitement Big Data / nettoyage

- **Objectif :** transformer les données brutes en données propres et cohérentes.
- **Blocs :** Apache Spark.
- **Ce qu'on fait :** nettoyage, déduplication, normalisation marques/modèles/villes,
  feature engineering initial, gestion des valeurs manquantes, contrôle qualité.
- **Exemple :** `VW`/`Volkswagen` → `Volkswagen` ; `Casa` → `Casablanca`.
- **Inputs :** raw depuis Kafka / MinIO.
- **Outputs :** données clean, prêtes pour analyse et ML.
- **Lien vers la suite :** `Spark → dbt`, `Spark → datasets ML`.

### Phase 4 — Transformation analytique

- **Objectif :** construire les datasets métiers exploitables.
- **Blocs :** dbt, ClickHouse.
- **Ce qu'on fait :** tables analytiques, marts structurés, agrégats dans ClickHouse.
- **Exemples :** prix médian par modèle/année, volume par ville, évolution des prix,
  durée de vie des annonces.
- **Pourquoi :** dbt = modélisation analytique propre ; ClickHouse = requêtes rapides.
- **Inputs :** données clean (Spark).
- **Outputs :** tables analytiques prêtes pour BI, analytics app et features ML (partiel).
- **Lien vers la suite :** `dbt → ClickHouse`, `ClickHouse → BI / FastAPI / ML features`.

### Phase 5 — BI & Market Intelligence

- **Objectif :** créer la vision marché.
- **Blocs :** Power BI / Superset, dashboard marché.
- **Ce qu'on fait :** dashboard marché global, tendances de prix, répartition par
  ville, top marques/modèles, analyse temporelle.
- **Input principal :** ClickHouse.
- **Outputs :** premier produit visible — « miroir du marché automobile marocain ».
- **Lien vers la suite :** `ClickHouse → Power BI / Superset`. Cette phase peut déjà
  donner un **MVP Analytics**.

### Phase 6 — Backend applicatif + Frontend

- **Objectif :** construire la plateforme utilisable par un utilisateur final.
- **Blocs :** FastAPI, PostgreSQL, Redis, Next.js + React.
- **Backend (FastAPI) :** API listings, favoris, profil utilisateur, recherche,
  analytics, score/recommandations.
- **Base applicative (PostgreSQL) :** utilisateurs, favoris, préférences, sessions,
  historique de recherche.
- **Frontend (Next.js) :** marketplace, page détail annonce, profil utilisateur,
  tableau analytics simplifié, zone recommandations.
- **Inputs :** ClickHouse, PostgreSQL, Redis.
- **Outputs :** API + application web.
- **Lien vers la suite :** `Frontend → FastAPI`, `FastAPI → PostgreSQL / ClickHouse / Redis`.

### Phase 7 — ML & IA

- **Objectif :** ajouter l'intelligence métier.
- **Blocs :** feature store/datasets ML, CatBoost/XGBoost, moteur de recommandation,
  MLflow, Deal Score.

**Sous-phase 7.1 — Price Estimation**
- Inputs : MinIO / datasets Spark, agrégats ClickHouse.
- Ce qu'on fait : prédiction du prix juste, écart au marché, génération du **Deal Score**.
- Outputs : estimation de prix + score de bonne affaire.

**Sous-phase 7.2 — Recommendation Engine**
- Inputs : comportements utilisateurs (PostgreSQL / event tracking), profils,
  listings clean, signaux marché.
- Ce qu'on fait : recommandations sur préférences (content-based), puis collaborative/hybride.
- Outputs : annonces recommandées.

**Sous-phase 7.3 — MLOps**
- MLflow : suivi des versions, comparaison des runs, registry.

- **Lien vers la suite :** `MinIO/Spark → training`, `ClickHouse → market features`,
  `PostgreSQL → behavior`, `modèles → FastAPI → Frontend`.

### Phase 8 — Serving, déploiement, supervision

- **Objectif :** rendre la plateforme stable, déployable et surveillée.
- **Blocs :** Docker Compose, GitHub Actions, Prometheus, Grafana.
- **Ce qu'on fait :** conteneuriser les services, CI/CD, monitoring API/pipelines/DB,
  alerting, logs.
- **Remarque :** phase transverse — Docker peut démarrer tôt, la supervision complète
  vient souvent après.