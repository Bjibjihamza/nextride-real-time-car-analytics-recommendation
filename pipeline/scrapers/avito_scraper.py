"""
NextRide — Avito.ma car listings scraper (JSON-based, no Selenium).

Avito is a Next.js app: every listing page embeds the full data in the
`__NEXT_DATA__` JSON blob and every detail page embeds the ad in
`componentProps.adInfo.ad`. We parse those directly with `requests`, which is
faster and far more robust than scraping the hashed CSS classes.

Every extracted row uses the CANONICAL unified schema (see schema.py), the
same for Avito and Moteur. Rows are written to the ClickHouse bronze layer
and to a CSV (test artifact only — not used in production).

Usage:
    python pipeline/scrapers/avito_scraper.py [--pages N] [--limit N] [--no-images]
"""

import argparse
import csv
import json
import os
import re
import secrets
import string
import sys
import time
from datetime import datetime

import requests

from clickhouse_helpers import insert_bronze, truncate_bronze
from schema import CSV_FIELDS

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DATA_DIR = os.path.join(REPO_ROOT, "data", "avito")
IMAGES_DIR = os.path.join(REPO_ROOT, "apps", "api", "images", "cars")

BASE_URL = "https://www.avito.ma/fr/maroc/voitures_d_occasion-à_vendre"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

PROGRESS_FILE = os.path.join(DATA_DIR, ".progress.json")


def read_checkpoint():
    try:
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            return int(json.load(f).get("last_page", 0))
    except (OSError, ValueError, TypeError):
        return 0


def write_checkpoint(page):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump({"last_page": page}, f)


def reset_checkpoint():
    try:
        os.remove(PROGRESS_FILE)
    except OSError:
        pass


def fetch(url):
    resp = requests.get(url, headers=HEADERS, timeout=45)
    resp.raise_for_status()
    resp.encoding = "utf-8"
    return resp.text


def parse_next_data(html):
    m = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        html,
        re.S,
    )
    if not m:
        raise RuntimeError("__NEXT_DATA__ introuvable (structure Avito changée ?)")
    return json.loads(m.group(1))


def get_param(params, key):
    for p in (params or []):
        if p.get("key") == key:
            return p.get("value") or p.get("fullValue") or "N/A"
    return "N/A"


def create_folder_name(idx):
    random_part = "".join(
        secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12)
    )
    return f"{random_part}_{idx}"


def to_display_date(iso):
    if not iso:
        return "N/A"
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return iso


def to_image_url(img):
    if isinstance(img, str):
        return img
    if isinstance(img, dict):
        paths = img.get("paths") or {}
        return paths.get("standard") or paths.get("fullHd") or paths.get("smallThumbnail")
    return None


def scrape_listing_page(page):
    """Return the list of ads on a single listing page."""
    url = f"{BASE_URL}?o={page}"
    print(f"🔎 Liste page {page}: {url}")
    data = parse_next_data(fetch(url))
    page_ads = (
        data.get("props", {})
        .get("pageProps", {})
        .get("componentProps", {})
        .get("ads", {})
        .get("ads", [])
    )
    print(f"✅ {len(page_ads)} annonces sur la page {page}")
    return page_ads


def scrape_details(listing):
    """Fetch the detail page and return a canonical-schema row + image urls."""
    url = listing.get("href")
    print(f"  🔎 Détail {listing.get('id')}: {url}")
    ad = parse_next_data(fetch(url))["props"]["pageProps"]["componentProps"]["adInfo"]["ad"]

    primary = ad.get("params", {}).get("primary", [])
    secondary = ad.get("params", {}).get("secondary", [])
    price = ad.get("price") or {}
    seller = ad.get("seller") or {}
    location = ad.get("location") or {}
    city = (location.get("city") or {}).get("name", "N/A")

    images = [u for u in (to_image_url(i) for i in ad.get("images", [])) if u]
    row = {
        "source": "avito",
        "listing_id": str(ad.get("id", "")),
        "title": ad.get("subject", "N/A"),
        "price": price.get("value"),
        "currency": price.get("currency", "DH"),
        "year": get_param(secondary, "regdate"),
        "fuel_type": get_param(secondary, "fuel"),
        "transmission": get_param(secondary, "bv"),
        "creator": seller.get("name", "N/A"),
        "sector": city,
        "mileage": get_param(secondary, "mileage_exact"),
        "brand": get_param(primary, "brand"),
        "model": get_param(primary, "model"),
        "door_count": get_param(primary, "doors"),
        "origin": get_param(primary, "v_origin"),
        "first_owner": get_param(primary, "first_owner"),
        "fiscal_power": get_param(primary, "pfiscale"),
        "condition": get_param(primary, "auto_condition"),
        "equipment": ad.get("description") or "N/A",
        "seller_city": city,
        "image_folder": "",
        "url": url,
        "publication_date": to_display_date(ad.get("listTime")),
        "image_urls": images,
    }
    return row


def download_image(image_url, folder_path, image_name):
    try:
        resp = requests.get(image_url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        ctype = resp.headers.get("Content-Type", "")
        ext = ".jpg"
        if "png" in ctype:
            ext = ".png"
        path = os.path.join(folder_path, f"{image_name}{ext}")
        with open(path, "wb") as f:
            f.write(resp.content)
        return os.path.basename(path)
    except Exception as e:  # noqa: BLE001
        print(f"  ⚠️ Image {image_name} non téléchargée: {e}")
        return None


def save_to_csv(rows, filename):
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows({k: r.get(k, "") for k in CSV_FIELDS} for r in rows)
    print(f"✅ CSV sauvegardé: {path}")
    return path


def main():
    parser = argparse.ArgumentParser(description="Scraper Avito.ma (JSON)")
    parser.add_argument("--pages", type=int, default=1, help="nb de pages à scraper (défaut 1)")
    parser.add_argument("--start-page", type=int, default=0, help="page de départ (0 = depuis le checkpoint)")
    parser.add_argument("--fresh", action="store_true", help="purger bronze + repartir de la page 1")
    parser.add_argument("--limit", type=int, default=0, help="max annonces (0 = tout)")
    parser.add_argument("--no-images", action="store_true", help="ne pas télécharger les images")
    parser.add_argument("--no-clickhouse", action="store_true", help="ne pas écrire dans bronze.listings")
    parser.add_argument("--out", default="avito_complete.csv", help="nom du fichier CSV (test)")
    args = parser.parse_args()

    if args.fresh:
        truncate_bronze("avito")
        reset_checkpoint()

    start = args.start_page if args.start_page > 0 else read_checkpoint() + 1
    print(f"🚗 Scraping Avito.ma… à partir de la page {start} ({args.pages} pages)")

    rows = []
    remaining = args.limit if args.limit > 0 else float("inf")
    seen_ids = set()
    for page in range(start, start + args.pages):
        try:
            listings = scrape_listing_page(page)
        except Exception as e:  # noqa: BLE001
            print(f"❌ Page {page} échouée: {e}")
            break
        if not listings:
            print(f"🛑 Plus d'annonces (page {page} vide) — arrêt.")
            break

        page_rows = []
        for idx, listing in enumerate(listings, start=1):
            if remaining <= 0:
                break
            lid = str(listing.get("id", ""))
            if lid and lid in seen_ids:
                continue  # annonce déjà vue sur une autre page (sponsorisée)
            try:
                row = scrape_details(listing)
                if not args.no_images:
                    folder = create_folder_name(idx)
                    folder_path = os.path.join(IMAGES_DIR, folder)
                    os.makedirs(folder_path, exist_ok=True)
                    saved = 0
                    for i, img_url in enumerate(row["image_urls"], start=1):
                        if download_image(img_url, folder_path, f"image_{i}"):
                            saved += 1
                    row["image_folder"] = folder if saved else ""
                page_rows.append(row)
                seen_ids.add(lid)
                remaining -= 1
                print(f"✅ {row['title']} — {row['price']} {row['currency']}")
                time.sleep(1)
            except Exception as e:  # noqa: BLE001
                print(f"❌ Erreur annonce {listing.get('id')}: {e}")

        if not page_rows:
            print(f"🛑 Aucune annonce extraite page {page} — arrêt.")
            break
        rows.extend(page_rows)
        if not args.no_clickhouse:
            insert_bronze("avito", page_rows)
        write_checkpoint(page)
        if remaining <= 0:
            break

    if not rows:
        print("❌ Aucune annonce récupérée.")
        sys.exit(1)

    save_to_csv(rows, args.out)
    print(f"\n✅ TERMINÉ — {len(rows)} annonces → bronze + {os.path.join('data', 'avito', args.out)}")


if __name__ == "__main__":
    main()
