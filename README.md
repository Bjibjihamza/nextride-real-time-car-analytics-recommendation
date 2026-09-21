# NextRide — Plateforme Analytics & Recommandation du marché automobile marocain

> **Vision :** un miroir temps réel du marché de la voiture d'occasion au Maroc +
> un conseiller intelligent qui aide chaque acheteur à trouver la bonne voiture
> au bon prix.

NextRide collecte en continu les annonces de voitures d'occasion (Avito.ma,
Moteur.ma), les stocke en historique brut, les transforme en données propres et
exploitables, et expose :

1. **Une vision marché** (BI / dashboard) — prix, tendances, répartition par
   marque/modèle/ville.
2. **Un assistant d'achat** (web) — recherche, favoris, estimation de prix,
   deal score et recommandations personnalisées.

---

## Stack technique

| Couche | Outil | Pourquoi ce choix dans NextRide |
| --- | --- | --- |
| Scraping | **Python + Requests/HTTPX + lxml/BeautifulSoup** | Les sites d'annonces sont surtout HTML/JSON ; plus léger et rapide que Selenium (JS uniquement si une source l'exige). |
| Orchestration | **Apache Airflow** | Planifier les scrapers, relancer les tâches en erreur, gérer les dépendances entre ingestion, nettoyage, agrégation et ML. |
| Messaging / Streaming | **Apache Kafka** | Découpler producteurs et consommateurs ; pertinent aussi pour les événements utilisateurs. |
| Data Lake | **MinIO + Parquet** | Stockage objet type S3 local + format optimisé pour les traitements analytiques (Spark). Historique brut complet. |
| Big Data Processing | **Apache Spark** | Nettoyage massif, déduplication, normalisation multi-sources, feature engineering, traitement historique. |
| Transformation analytique | **dbt** | Construire proprement les tables analytiques, documenter et tester les modèles SQL. |
| Data Warehouse / OLAP | **ClickHouse** | Agrégations ultra-rapides sur des millions de lignes : prix moyen/médian, tendances, filtres par marque/modèle/année/ville. |
| Base applicative | **PostgreSQL** | Données transactionnelles : users, favoris, préférences, recherches sauvegardées, sessions. |
| Cache | **Redis** | Requêtes fréquentes, recommandations pré-calculées, sessions, données temporaires. |
| BI | **Power BI** ou **Apache Superset** | Power BI pour valoriser la formation BI ; Superset pour une stack 100 % self-hosted/intégrable. |
| ML prix | **CatBoost / XGBoost** | Excellent sur données tabulaires riches en variables catégorielles (marque, modèle, carburant, ville, boîte…). |
| Recommandation | **LightFM / implicit / modèle custom Python** | Combiner préférences utilisateur, similarité des véhicules et interactions ; commencer simple puis hybride. |
| MLOps | **MLflow** | Suivi des expériences, comparaison des modèles, métriques, versions et registry. |
| API | **FastAPI** | Léger, rapide, naturel avec Python/ML : prix, recommandations, analytics, données utilisateur. |
| Monitoring | **Prometheus + Grafana** | Surveiller pipelines, API, Kafka, Spark, erreurs, temps de réponse, ressources. |
| Containerisation | **Docker + Docker Compose** | Stack reproductible localement, facile à lancer pour une démo. |
| CI/CD | **GitHub Actions** | Tests automatiques, lint, build des images Docker, déploiement. |

---

## Vue d'ensemble des phases

```
Phase 1 → Collecte
Phase 2 → Stockage brut
Phase 3 → Traitement / nettoyage
Phase 4 → Modélisation analytique
Phase 5 → BI / visualisation marché
Phase 6 → Backend + base applicative + frontend
Phase 7 → ML / recommandation
Phase 8 → Industrialisation / monitoring
```

Chaîne des phases :

```
Phase 1 Collecte
    ↓
Phase 2 Ingestion / stockage brut
    ↓
Phase 3 Traitement / nettoyage
    ↓
Phase 4 Modélisation analytique
    ↓
 ┌───────────────┬─────────────────┐
 ↓               ↓                 ↓
Phase 5 BI     Phase 6 App       Phase 7 ML
                 ↓                 ↓
                 └────── FastAPI ──┘
                         ↓
                    Frontend final
```

---

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — architecture par couches et flux de données
- [docs/PHASES.md](docs/PHASES.md) — détail des 8 phases (objectif, outils, inputs, outputs, dépendances)
- [docs/ROADMAP.md](docs/ROADMAP.md) — ordre de réalisation, sprints, MVP par niveaux