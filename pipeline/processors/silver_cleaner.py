"""
NextRide - Silver cleaner.

Reads bronze.listings (ClickHouse), applies a thoroughly-tested cleaning
pipeline, de-duplicates to the latest capture per (source, listing_id), and
materialises silver.listings.

Cleaning rules are derived from a deep EDA over ~2000 scraped ads
(see tests/scrapers/EDA notes): price placeholders, fuel variants,
sector accents/aliases, mileage caps, door/fiscal bounds, N/A handling.

Usage:
    python pipeline/processors/silver_cleaner.py [--rebuild] [--dry-run]

Environment (same as the scrapers):
    CLICKHOUSE_URL / CLICKHOUSE_USER / CLICKHOUSE_PASSWORD
"""

import argparse
import json
import os
import sys
import unicodedata

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

BRONZE_COLS = [
    "source", "listing_id", "title", "price", "currency", "year", "fuel_type",
    "transmission", "creator", "sector", "mileage", "brand", "model",
    "door_count", "origin", "first_owner", "fiscal_power", "condition",
    "equipment", "seller_city", "image_folder", "url", "publication_date",
    "image_urls", "captured_at",
]

# ---------------------------------------------------------------- bounds
PRICE_MIN, PRICE_MAX = 10_000, 10_000_000
YEAR_MIN, YEAR_MAX = 1980, 2026
MILEAGE_MAX = 1_000_000
DOORS_OK = {2, 3, 4, 5}
FISCAL_MIN, FISCAL_MAX = 3, 50

# ------------------------------------------------------------- cleaning
def _clean_str(v):
    if v is None:
        return None
    s = str(v).strip()
    return None if s in ("", "N/A", "NULL", "None", "nan") else s


def _deaccent(s):
    if not s:
        return s
    return "".join(
        c for c in unicodedata.normalize("NFD", s)
        if unicodedata.category(c) != "Mn"
    )


def clean_fuel(v):
    v = _clean_str(v)
    if not v:
        return None
    low = v.lower()
    if "diesel" in low or "mazout" in low or "mazot" in low:
        return "diesel"
    if "essence" in low or "petrol" in low:
        return "essence"
    if "hybride" in low or "hybrid" in low:
        return "hybride"
    if "electrique" in _deaccent(low) or "electric" in low:
        return "electrique"
    if "lpg" in low or "gpl" in low or "gaz" in low:
        return "lpg"
    return None


def clean_transmission(v):
    v = _clean_str(v)
    if not v:
        return None
    low = v.lower()
    if "auto" in low:
        return "automatique"
    if "manu" in low or "manuel" in low:
        return "manuelle"
    if "bva" in low:
        return "automatique"
    if "bvm" in low:
        return "manuelle"
    return None


def clean_price(v):
    try:
        p = float(v)
    except (TypeError, ValueError):
        return None
    return int(p) if PRICE_MIN <= p <= PRICE_MAX else None


def clean_year(v):
    try:
        y = int(float(v))
    except (TypeError, ValueError):
        return None
    return y if YEAR_MIN <= y <= YEAR_MAX else None


def clean_mileage(v):
    try:
        m = int(float(v))
    except (TypeError, ValueError):
        return None
    if m < 0 or m > MILEAGE_MAX:
        return None
    return m


def clean_door_count(v):
    try:
        d = int(float(v))
    except (TypeError, ValueError):
        return None
    return d if d in DOORS_OK else None


def clean_fiscal_power(v):
    try:
        f = int(float(v))
    except (TypeError, ValueError):
        return None
    return f if FISCAL_MIN <= f <= FISCAL_MAX else None


SECTOR_ALIASES = {
    "fes": "Fes",
    "sale": "Sale",
    "meknes": "Meknes",
    "kenitra": "Kenitra",
    "tetouan": "Tetouan",
    "laayoune": "Laayoune",
    "beni mellal": "Beni Mellal",
    "fquih ben saleh": "Fquih Ben Salah",
    "kelaa sraghna": "El Kelaa des Sraghna",
    "el jadida": "El Jadida",
    "al hoceima": "Al Hoceima",
    "ben slimane": "Benslimane",
    "khouribga": "Khouribga",
    "dar bouazza": "Dar Bouazza",
    "had soualem": "Had Soualem",
    "sidi rahal": "Sidi Rahal",
    "el gara": "El Gara",
    "beni melal": "Beni Mellal",
    "laayoun": "Laayoune",
}


def clean_sector(v):
    v = _clean_str(v)
    if not v:
        return "Autre"
    key = _deaccent(v).strip().lower()
    key = " ".join(key.split())
    return SECTOR_ALIASES.get(key, _deaccent(v).strip())


def clean_brand(v):
    v = _clean_str(v)
    return v


def clean_model(v):
    return _clean_str(v)


def clean_row(r):
    """Apply the full cleaning pipeline to one bronze row (dict)."""
    return {
        "source": _clean_str(r.get("source")),
        "listing_id": _clean_str(r.get("listing_id")),
        "title": _clean_str(r.get("title")),
        "brand": clean_brand(r.get("brand")),
        "model": clean_model(r.get("model")),
        "year": clean_year(r.get("year")),
        "price": clean_price(r.get("price")),
        "currency": _clean_str(r.get("currency")),
        "fuel_type": clean_fuel(r.get("fuel_type")),
        "transmission": clean_transmission(r.get("transmission")),
        "mileage": clean_mileage(r.get("mileage")),
        "door_count": clean_door_count(r.get("door_count")),
        "fiscal_power": clean_fiscal_power(r.get("fiscal_power")),
        "origin": _clean_str(r.get("origin")),
        "first_owner": _clean_str(r.get("first_owner")),
        "condition": _clean_str(r.get("condition")),
        "sector": clean_sector(r.get("sector")),
        "seller_city": clean_sector(r.get("seller_city")),
        "creator": _clean_str(r.get("creator")),
        "equipment": _clean_str(r.get("equipment")) or "",
        "image_folder": _clean_str(r.get("image_folder")) or "",
        "image_urls": r.get("image_urls") or [],
        "url": _clean_str(r.get("url")) or "",
        "publication_date": _clean_str(r.get("publication_date")) or "",
        "captured_at": r.get("captured_at"),
    }


# ------------------------------------------------------------ clickhouse
def ch(sql, fmt="JSONEachRow"):
    r = requests.post(
        CLICKHOUSE_URL,
        params={"user": CLICKHOUSE_USER, "password": CLICKHOUSE_PASSWORD,
                "query": sql, "default_format": fmt},
        timeout=120,
    )
    r.raise_for_status()
    return r.text


def read_bronze():
    rows = [
        json.loads(line)
        for line in ch(f"SELECT {', '.join(BRONZE_COLS)} FROM bronze.listings").splitlines()
        if line.strip()
    ]
    return pd.DataFrame(rows)


def _jsonable(record):
    out = {}
    for k, v in record.items():
        if isinstance(v, pd.Timestamp):
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


def write_silver(df):
    payload = "\n".join(
        json.dumps(_jsonable(r), ensure_ascii=False)
        for r in df.to_dict(orient="records")
    )
    sql = "INSERT INTO silver.listings FORMAT JSONEachRow"
    resp = requests.post(
        CLICKHOUSE_URL,
        params={"user": CLICKHOUSE_USER, "password": CLICKHOUSE_PASSWORD, "query": sql},
        data=payload.encode("utf-8"),
        timeout=120,
    )
    resp.raise_for_status()


def report(df, source):
    sub = df[df["source"] == source]
    print(f"\n[{source}] {len(sub)} lignes")
    for col in ["price", "year", "mileage", "fuel_type", "transmission", "brand", "sector", "door_count"]:
        n_null = sub[col].isna().sum()
        print(f"  {col:<13} null={n_null:>4} ({100 * n_null / max(len(sub),1):.0f}%)  "
              f"exemples={list(sub[col].dropna().unique()[:6])}")


def main():
    parser = argparse.ArgumentParser(description="Nettoyage bronze -> silver")
    parser.add_argument("--dry-run", action="store_true", help="analyse sans écrire")
    args = parser.parse_args()

    print("Lecture de bronze.listings…")
    bronze = read_bronze()
    print(f"Bronze : {len(bronze)} lignes")

    cleaned = pd.DataFrame([clean_row(r) for r in bronze.to_dict(orient="records")])
    cleaned["captured_at"] = pd.to_datetime(cleaned["captured_at"], errors="coerce")

    # dedup : dernière capture par (source, listing_id)
    cleaned = (
        cleaned.sort_values("captured_at")
        .groupby(["source", "listing_id"], as_index=False)
        .last()
    )
    cleaned = cleaned.rename(columns={"captured_at": "last_seen"})

    # statistiques d'historique
    hist = (
        bronze.assign(captured_at=pd.to_datetime(bronze["captured_at"], errors="coerce"))
        .groupby(["source", "listing_id"])["captured_at"]
        .agg(first_seen="min", capture_count="count")
        .reset_index()
    )
    out = cleaned.merge(hist, on=["source", "listing_id"], how="left")
    out["first_seen"] = pd.to_datetime(out["first_seen"], errors="coerce")

    print(f"Silver (dédupliqué) : {len(out)} lignes "
          f"({out['source'].value_counts().to_dict()})")

    report(out, "avito")
    report(out, "moteur")

    if args.dry_run:
        print("\n[DRY-RUN] rien écrit.")
        return

    ch("TRUNCATE TABLE silver.listings")
    write_silver(out)
    print("\n✅ silver.listings réécrit.")


if __name__ == "__main__":
    main()
