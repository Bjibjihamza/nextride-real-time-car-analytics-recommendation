"""
NextRide - ClickHouse HTTP helper for the scrapers.

Writes raw scraped rows (CANONICAL unified schema, see schema.py) into the
Bronze layer (bronze.listings) using ClickHouse's HTTP interface
(FORMAT JSONEachRow). Every call is defensive: if ClickHouse is unreachable
the scrapers keep working (CSV still written).

Environment:
    CLICKHOUSE_URL      : ClickHouse HTTP endpoint (default http://localhost:8123)
    CLICKHOUSE_USER     : HTTP user (default default)
    CLICKHOUSE_PASSWORD : HTTP password (default nextride)
"""

import json
import os
import re

import requests

CLICKHOUSE_URL = os.environ.get("CLICKHOUSE_URL", "http://localhost:8123")
CLICKHOUSE_USER = os.environ.get("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.environ.get("CLICKHOUSE_PASSWORD", "nextride")

NUMERIC_RE = re.compile(r"\d+")


def _auth_params():
    params = {"user": CLICKHOUSE_USER}
    if CLICKHOUSE_PASSWORD:
        params["password"] = CLICKHOUSE_PASSWORD
    return params


def clickhouse_available():
    try:
        resp = requests.get(f"{CLICKHOUSE_URL}/ping", timeout=3)
        return resp.status_code == 200
    except requests.RequestException:
        return False


def _to_float(raw):
    """Parse a French-style price ('178 000 DH', '110,000 MAD', 215000, 217,5)."""
    if raw in (None, "", "N/A", "Appeler pour le prix", "Demander le prix"):
        return None
    cleaned = re.sub(r"[^\d.,]", "", str(raw))
    # thousands separators: '217,000' / '217.000' -> 217000 (comma/dot before 3 digits)
    cleaned = re.sub(r"[,.](\d{3})(?=\D|$)", r"\1", cleaned)
    cleaned = cleaned.replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _to_int(raw):
    if raw in (None, "", "N/A"):
        return None
    digits = "".join(NUMERIC_RE.findall(str(raw)))
    try:
        return int(digits)
    except ValueError:
        return None


def _to_year(raw):
    """Only accept a proper 4-digit year."""
    val = _to_int(raw)
    return val if val is not None and 1950 <= val <= 2100 else None


def _clean_str(value):
    if value is None:
        return ""
    value = str(value).strip()
    return "" if value in ("N/A", "None", "nan") else value


def _coerce(row):
    """Convert a canonical row into the bronze.listings typed columns."""
    return {
        "source": _clean_str(row.get("source")),
        "listing_id": _clean_str(row.get("listing_id")),
        "title": _clean_str(row.get("title")),
        "price": _to_float(row.get("price")),
        "currency": _clean_str(row.get("currency")),
        "year": _to_year(row.get("year")),
        "fuel_type": _clean_str(row.get("fuel_type")),
        "transmission": _clean_str(row.get("transmission")),
        "creator": _clean_str(row.get("creator")),
        "sector": _clean_str(row.get("sector")),
        "mileage": _to_int(row.get("mileage")),
        "brand": _clean_str(row.get("brand")),
        "model": _clean_str(row.get("model")),
        "door_count": _to_int(row.get("door_count")),
        "origin": _clean_str(row.get("origin")),
        "first_owner": _clean_str(row.get("first_owner")),
        "fiscal_power": _to_int(row.get("fiscal_power")),
        "condition": _clean_str(row.get("condition")),
        "equipment": _clean_str(row.get("equipment")),
        "seller_city": _clean_str(row.get("seller_city")),
        "image_folder": _clean_str(row.get("image_folder")),
        "url": _clean_str(row.get("url")),
        "publication_date": _clean_str(row.get("publication_date")),
        "image_urls": [u for u in (row.get("image_urls") or []) if u],
        "payload": json.dumps(row, ensure_ascii=False),
    }


def insert_bronze(source, rows):
    """Insert canonical rows (dicts) into bronze.listings.

    Returns the number of rows inserted, or 0 if ClickHouse is unreachable.
    """
    if not rows:
        return 0
    if not clickhouse_available():
        print("⚠️ ClickHouse indisponible - bronze ignoré (le CSV est quand même écrit).")
        return 0

    payload = [
        json.dumps({**_coerce(row), "source": source}, ensure_ascii=False)
        for row in rows
    ]

    query = "INSERT INTO bronze.listings FORMAT JSONEachRow"
    try:
        resp = requests.post(
            f"{CLICKHOUSE_URL}/",
            params={**{"query": query}, **_auth_params()},
            data="\n".join(payload).encode("utf-8"),
            timeout=30,
        )
        resp.raise_for_status()
        print(f"✅ {len(payload)} lignes insérées dans bronze.listings (source={source})")
        return len(payload)
    except requests.RequestException as e:
        print(f"⚠️ Échec insertion ClickHouse: {e}")
        return 0


def truncate_bronze(source=None):
    """Delete bronze rows for a source (or all if source is None)."""
    if not clickhouse_available():
        return
    query = "DELETE FROM bronze.listings WHERE 1=1"
    if source:
        query = f"DELETE FROM bronze.listings WHERE source = '{source}'"
    try:
        resp = requests.post(
            f"{CLICKHOUSE_URL}/",
            params={**{"query": query}, **_auth_params()},
            timeout=60,
        )
        resp.raise_for_status()
        print(f"🗑️ Bronze purgé (source={source or 'all'})")
    except requests.RequestException as e:
        print(f"⚠️ Échec purge ClickHouse: {e}")
