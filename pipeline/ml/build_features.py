"""
NextRide - ML feature builder (task A2).

Builds the price-prediction dataset from the warehouse:
  * features.price_history  - every price/mileage capture (from bronze)
  * features.car_features   - one engineered row per listing (from silver + bronze)
  * data/ml/*.parquet       - exported datasets for training (test artifacts)

Feature engineering adds: car_age, listing_age_days, capture_count,
image_count, equipment_length. Target = price.

Usage:
    python pipeline/ml/build_features.py [--no-export]

Environment: CLICKHOUSE_URL / CLICKHOUSE_USER / CLICKHOUSE_PASSWORD
"""

import argparse
import json
import os
import sys

import numpy as np
import pandas as pd
import requests

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

CLICKHOUSE_URL = os.environ.get("CLICKHOUSE_URL", "http://localhost:8123")
CLICKHOUSE_USER = os.environ.get("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.environ.get("CLICKHOUSE_PASSWORD", "nextride")

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ML_DIR = os.path.join(REPO_ROOT, "data", "ml")


def ch(sql, fmt="JSONEachRow"):
    r = requests.post(
        CLICKHOUSE_URL,
        params={"user": CLICKHOUSE_USER, "password": CLICKHOUSE_PASSWORD,
                "query": sql, "default_format": fmt},
        timeout=120,
    )
    r.raise_for_status()
    return r.text


def read_df(sql):
    rows = [json.loads(l) for l in ch(sql).splitlines() if l.strip()]
    return pd.DataFrame(rows)


def _jsonable(record):
    out = {}
    for k, v in record.items():
        if hasattr(v, "strftime"):
            out[k] = v.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        elif isinstance(v, list):
            out[k] = v
        elif pd.isna(v):
            out[k] = None
        elif isinstance(v, (float, np.floating)):
            out[k] = int(v) if float(v).is_integer() else float(v)
        else:
            out[k] = v
    return out


def write_ch(table, df):
    if df.empty:
        print(f"⚠️ {table} vide - rien écrit")
        return
    payload = "\n".join(json.dumps(_jsonable(r), ensure_ascii=False) for r in df.to_dict(orient="records"))
    r = requests.post(
        CLICKHOUSE_URL,
        params={"user": CLICKHOUSE_USER, "password": CLICKHOUSE_PASSWORD,
                "query": f"INSERT INTO {table} FORMAT JSONEachRow"},
        data=payload.encode("utf-8"),
        timeout=120,
    )
    r.raise_for_status()
    print(f"✅ {len(df)} lignes -> {table}")


def build_price_history(bronze):
    cols = ["source", "listing_id", "captured_at", "price", "mileage", "year"]
    hist = bronze[cols].copy()
    hist["captured_at"] = pd.to_datetime(hist["captured_at"], errors="coerce")
    return hist.dropna(subset=["captured_at"])


def build_car_features(bronze, silver):
    agg = (
        bronze.assign(captured_at=pd.to_datetime(bronze["captured_at"], errors="coerce"))
        .groupby(["source", "listing_id"])
        .agg(
            first_seen=("captured_at", "min"),
            last_seen=("captured_at", "max"),
            capture_count=("captured_at", "count"),
        )
        .reset_index()
    )
    image_counts = (
        bronze.assign(n_imgs=bronze["image_urls"].apply(lambda x: len(x) if x else 0))
        .sort_values("captured_at")
        .groupby(["source", "listing_id"])["n_imgs"]
        .last()
        .reset_index()
    )

    feats = silver.merge(agg, on=["source", "listing_id"], how="left").merge(
        image_counts, on=["source", "listing_id"], how="left"
    )

    feats["last_seen"] = pd.to_datetime(feats["last_seen"], errors="coerce")
    feats["first_seen"] = pd.to_datetime(feats["first_seen"], errors="coerce")
    current_year = pd.Timestamp.now().year

    feats["car_age"] = feats.apply(
        lambda r: (current_year - r["year"]) if pd.notna(r["year"]) else None, axis=1
    )
    feats["listing_age_days"] = (
        (feats["last_seen"] - feats["first_seen"]).dt.days.fillna(0).astype(int)
    )
    feats["capture_count"] = feats["capture_count"].fillna(1).astype(int)
    feats["image_count"] = feats["n_imgs"].fillna(0).astype(int)
    feats["equipment_length"] = feats["equipment"].fillna("").astype(str).str.len().astype(int)

    # ML cleanliness: empty strings -> NaN (not a real category)
    for col in ["brand", "model", "fuel_type", "transmission", "origin",
                "first_owner", "condition", "sector", "currency"]:
        feats[col] = feats[col].replace("", np.nan)

    cols = [
        "source", "listing_id", "brand", "model", "year", "car_age", "price",
        "mileage", "fuel_type", "transmission", "door_count", "fiscal_power",
        "origin", "first_owner", "condition", "sector", "equipment_length",
        "image_count", "capture_count", "listing_age_days", "first_seen",
        "last_seen", "currency",
    ]
    return feats[cols]


def report(feats, hist):
    print("\n" + "=" * 62)
    print("RAPPORT QUALITÉ DATASET ML")
    print("=" * 62)

    print(f"\nLignes (car_features) : {len(feats)}")
    print(f"Sources : {feats['source'].value_counts().to_dict()}")

    with_price = feats["price"].notna()
    print(f"Avec prix (cible)   : {with_price.sum()} ({100 * with_price.mean():.0f}%)")
    priced = feats[with_price]
    print("\nPrix (cible) :")
    print(priced["price"].describe(percentiles=[0.25, 0.5, 0.75, 0.9]).round(0).to_string())

    print("\nManquants (%) :")
    miss = feats.isna().mean().mul(100).round(1)
    print(miss[miss > 0].sort_values(ascending=False).to_string() or "  aucun")

    print("\nDistribution des variables clés :")
    for col in ["fuel_type", "transmission", "door_count", "brand"]:
        vc = feats[col].value_counts()
        print(f"\n  {col} (top 8) :")
        print(vc.head(8).to_string().replace("\n", "\n  "))

    print(f"\nHistorique prix : {len(hist)} captures, "
          f"{hist['listing_id'].nunique()} annonces uniques")
    print(f"  captures/annonce : {hist.groupby(['source','listing_id']).size().mean():.2f} (moyenne)")


def main():
    parser = argparse.ArgumentParser(description="Construit le dataset ML (features)")
    parser.add_argument("--no-export", action="store_true", help="ne pas écrire les fichiers parquet/csv")
    args = parser.parse_args()

    print("Lecture bronze + silver…")
    bronze = read_df(
        "SELECT source, listing_id, captured_at, price, mileage, year, image_urls "
        "FROM bronze.listings"
    )
    silver = read_df(
        "SELECT source, listing_id, brand, model, year, price, mileage, fuel_type, "
        "transmission, door_count, fiscal_power, origin, first_owner, condition, "
        "sector, equipment, currency FROM silver.listings"
    )
    bronze["image_urls"] = bronze["image_urls"].apply(lambda x: x or [])

    print(f"Bronze : {len(bronze)} | Silver : {len(silver)}")

    price_hist = build_price_history(bronze)
    feats = build_car_features(bronze, silver)

    report(feats, price_hist)

    # materialise into ClickHouse (features layer)
    ch("TRUNCATE TABLE features.price_history")
    ch("TRUNCATE TABLE features.car_features")
    write_ch("features.price_history", price_hist)
    write_ch("features.car_features", feats)

    if not args.no_export:
        os.makedirs(ML_DIR, exist_ok=True)
        feats.to_parquet(os.path.join(ML_DIR, "car_features.parquet"), index=False)
        feats.to_csv(os.path.join(ML_DIR, "car_features.csv"), index=False)
        price_hist.to_parquet(os.path.join(ML_DIR, "price_history.parquet"), index=False)
        print(f"\n📄 Datasets exportés dans {ML_DIR} (parquet + csv)")


if __name__ == "__main__":
    main()
