# Architecture cible — monorepo NextRide

> **Statut : appliqué.** La structure cible ci-dessous est en place dans le
> repo (voir [Migration](#migration) en fin de document pour le détail de ce
> qui a été fait).

## Problème avec la structure actuelle

L'actuel repo est un « flat monorepo » de 2023 : tout est au même niveau
(`backend/`, `kafka/`, `spark/`, `prediction/`, `nextride/`, `scraping/`,
`data_generator/`, `recommendations/`, `dags/`, `documentaions/`). Conséquences :

- pas de séparation entre **applications servies** (API, front, ML), **pipeline
  de données** (producers, spark, scrapers) et **infrastructure** (schémas,
  configs, Dockerfiles) ;
- Dockerfiles éparpillés dans `docker/` au lieu d'être co-localisés avec leur
  service ;
- pas de distinction entre `infra/` (ce que contiennent les conteneurs) et
  `deploy/` (comment on orchestre le système) ;
- tests éparpillés / inexistants par service ;
- nommage français/anglais incohérent (`nextride`, `data_generator`,
  `documentaions`).

## Principe général

> **apps** = ce qu'on **sert** · **pipeline** = ce qui **transforme/déplace** la donnée ·
> **infra** = ce que **contiennent** les conteneurs · **deploy** = comment on **orchestre**

## Arborescence cible

```
nextride/
├── apps/                        # Applications servies (HTTP / UI)
│   ├── api/                     # Express REST API            (ex: backend/)
│   │   ├── src/
│   │   │   ├── config/          #   env, client PostgreSQL
│   │   │   ├── routes/          #   auth, cars, search, prediction, users
│   │   │   ├── controllers/     #   handlers HTTP
│   │   │   ├── services/        #   logique métier (appels ml-service, etc.)
│   │   │   ├── models/          #   accès données (repositories)
│   │   │   └── middleware/      #   auth JWT, erreurs…
│   │   ├── tests/               #   Jest + supertest
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── web/                     # React frontend              (ex: nextride/)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── context/
│   │   │   └── config.js
│   │   ├── tests/
│   │   └── Dockerfile
│   ├── dashboard/               # Streamlit analytics (gold views)
│   └── ml-service/              # Flask price prediction      (ex: prediction/)
│       ├── app/
│       │   ├── api.py           #   routes (/predict, /health)
│       │   └── features.py      #   estimate_price (estimator)
│       ├── artifacts/           #   TF model .h5 / scalers (futur vrai modèle)
│       ├── data/                #   données d'entraînement
│       ├── tests/               #   pytest
│       ├── requirements.txt
│       └── Dockerfile

├── pipeline/                    # Code qui déplace/transforme la donnée
│   ├── scrapers/                #   avito + moteur (JSON/lxml)  (ex: scraping/)
│   ├── processors/              #   silver_cleaner (bronze → silver)
│   ├── serving/                 #   pg_db helper + sync_cars (silver → postgres)
│   ├── synthetic/               #   data generators           (ex: data_generator/)
│   └── recommendations/         #   combined algorithm        (ex: recommendations/ + backend/scripts)

├── infra/                       # Définition de l'infrastructure
│   ├── clickhouse/              #   init SQL (bronze, silver, gold)
│   ├── postgres/                #   schéma opérationnel
│   └── docker/                  #   Dockerfiles partagés + runners (entrypoints)

├── deploy/                      # Orchestration & déploiement
│   ├── docker-compose.yml       #   (actuellement à la racine)
│   └── .env.example
│   └── (option) docker-compose.dev.yml / .prod.yml / .extras.yml

├── tests/                       # Tests transverses
│   └── e2e/
│       └── smoke_test.py        #   (ex: scripts/smoke_test.py)

├── scripts/                     # Helpers dev/ops (up, down, seed, test…)
├── docs/                        # Documentation (README, PIPELINE, ARCHITECTURE…)
├── data/                        # Données brutes / seed (gitignorées, sauf échantillons)
├── Makefile                     # make up · make down · make seed · make test
├── .env.example
└── README.md
```

## Règles

1. **Chaque app est autonome** : son `Dockerfile`, ses `tests/`, ses
   dépendances. On l'édite ou la supprime sans toucher aux autres.
2. **`pipeline/` est purement data** : pas de code HTTP ni d'UI ; uniquement ce
   que consomment les jobs (scrapers, cleaners, seeds, recommandations).
3. **`infra/` = code d'infra** (schémas, configs, Dockerfiles partagés),
   séparé du code applicatif.
4. **`deploy/` = comment on met en marche** (compose files, env). Les services
   sont déclarés par le compose ; les `Dockerfile` vivent dans `apps/*` /
   `pipeline/*`, les fichiers partagés dans `infra/docker/`.
5. **Nommage anglais unifié** : `backend`→`api`, `nextride`→`web`,
   `prediction`→`ml-service`, `data_generator`→`pipeline/synthetic`,
   `scraping`→`pipeline/scrapers`, `spark`→`pipeline/processors`,
   `kafka`→`pipeline/producers`, `documentaions`→`docs`.
6. **Tests co-localisés** : `apps/api/tests/`, `pipeline/processors/tests/`…,
   + `tests/e2e/` pour le bout-en-bout.
7. **Un seul point d'entrée** : `Makefile` ou `scripts/` (`make up`, `make
   seed`, `make test`) — plus de 10 commandes à retenir.

## Correspondance ancien → nouveau

| Actuel                    | Cible                        |
|---------------------------|------------------------------|
| `backend/`                | `apps/api/`                  |
| `nextride/`               | `apps/web/`                  |
| `prediction/`             | `apps/ml-service/`           |
| `scraping/`               | `pipeline/scrapers/`         |
| `kafka/`                  | `pipeline/producers/`        |
| `spark/`                  | `pipeline/processors/`       |
| `data_generator/`         | `pipeline/synthetic/`        |
| `recommendations/` + `backend/scripts/` | `pipeline/recommendations/` |
| `docker/`                 | `infra/docker/`              |
| `infra/cassandra/`        | `infra/cassandra/` (inchangé) |
| `docker-compose.yml`      | `deploy/docker-compose.yml`  |
| `scripts/smoke_test.py`   | `tests/e2e/smoke_test.py`    |
| `documentaions/`          | `docs/legacy/` (archivé)      |
| `dags/`                   | supprimé (DAGs Airflow 2023, inutilisés) |

## Migration (appliquée)

Étapes réalisées :

1. Déplacement de chaque dossier vers sa cible (voir tableau ci-dessus).
   `git mv` effectué sur les dossiers suivis ; `git add -A` pour les nouveaux
   fichiers.
2. Mise à jour des chemins :
   - `deploy/docker-compose.yml` : `build.context` → racine du repo (`..`),
     `dockerfile` → `infra/docker/…`, volumes → `../data`, cache ivy Spark →
     `/root/.ivy2` (image `apache/spark`) ;
   - Dockerfiles dans `infra/docker/*/Dockerfile` : chemins `COPY` adaptés ;
   - `apps/api` : code déplacé sous `src/`, chemins `__dirname` (images,
     uploads) ajustés, tests → `apps/api/tests/` ;
   - `apps/ml-service` : `ml_service.py` scindé en `app/api.py` +
     `app/features.py`, artefacts → `artifacts/`, notebooks → `models/`,
     data → `data/`, tests adaptés (`pytest.ini` avec `pythonpath`) ;
   - `apps/web/src/config.js` inchangé (pas de chemins système).
3. Tests unitaires déplacés dans chaque service ; `scripts/smoke_test.py` →
   `tests/e2e/`.
4. Ajout d'un `Makefile` (`make up`, `make down`, `make seed`, `make test`,
   `make smoke`) et d'un `.env.example` à la racine.
5. Duplicats supprimés (`pipeline/processors/models/recommendations/*`, logs,
   `__pycache__`) ; `documentaions/` archivé dans `docs/legacy/` ; dumps CSV
   racine déplacés dans `data/`.
6. **Nettoyage legacy** : suppression des caches, du code mort
   (`pipeline/processors/predict.py`, `apps/api/src/config/test.js`, DAGs
   Airflow, scripts d'entraînement TF, notebooks, consumers de debug, README
   CRA) ; conservation des artefacts `.h5`/`.pkl` et des données.
7. Re-build + `docker compose -f deploy/docker-compose.yml up -d --build` +
   re-exécution des tests (pytest, jest, smoke) — validé : tout est vert.
