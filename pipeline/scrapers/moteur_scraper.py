"""
NextRide — Moteur.ma car listings scraper (server-rendered HTML, no Selenium).

Moteur.ma is fully server-rendered. The listing page cards use the current
`ads-index-card` classes; each detail page exposes a spec table plus a
"Caractéristiques & Options" section. We parse everything with lxml.

Every extracted row uses the CANONICAL unified schema (see schema.py), the
same for Avito and Moteur. Rows are written to the ClickHouse bronze layer
and to a CSV (test artifact only — not used in production).

Usage:
    python pipeline/scrapers/moteur_scraper.py [--pages N] [--limit N] [--no-images]
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
from lxml import html as lh

from clickhouse_helpers import insert_bronze, truncate_bronze
from schema import CSV_FIELDS

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DATA_DIR = os.path.join(REPO_ROOT, "data", "moteur")
IMAGES_DIR = os.path.join(REPO_ROOT, "apps", "api", "images", "cars")

BASE_URL = "https://www.moteur.ma/fr/voiture/achat-voiture-occasion/"
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


def extract_id_from_url(url):
    match = re.search(r"/detail-annonce/(\d+)", url or "")
    return match.group(1) if match else "N/A"


def create_folder_name(idx):
    random_part = "".join(
        secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12)
    )
    return f"{random_part}_{idx}"


def text_of(el):
    return el.text_content().strip() if el is not None else "N/A"


def first(doc, selector):
    els = doc.cssselect(selector)
    return els[0] if els else None


def scrape_listing_page(page):
    """Return the list of listings (canonical keys) on a single page."""
    url = BASE_URL if page == 1 else f"{BASE_URL.rstrip('/')}?page={page}"
    print(f"🔎 Liste page {page}: {url}")
    doc = lh.fromstring(fetch(url))
    cards = doc.cssselect(".ads-index-card")
    print(f"✅ {len(cards)} annonces sur la page {page}")
    listings = []
    for card in cards:
        title = text_of(first(card, ".ads-index-title"))
        link_el = first(card, 'a[href*="detail-annonce"]')
        link = link_el.get("href") if link_el is not None else None
        price_el = first(card, ".ad-price-grid")
        price = price_el.text_content().strip() if price_el is not None else "N/A"
        city_el = first(card, ".item-card9-desc a")
        city = city_el.text_content().strip() if city_el is not None else "N/A"
        time_el = first(card, "span.timeago")
        pub_date = time_el.get("data-time") if time_el is not None else "N/A"
        desc_el = first(card, ".ad-desc")
        desc = desc_el.text_content().strip() if desc_el is not None else "N/A"
        meta = [s.text_content().strip() for s in card.cssselect(".ad-meta span")]
        listings.append({
            "source": "moteur",
            "listing_id": extract_id_from_url(link),
            "title": title,
            "price": price,
            "currency": "MAD",
            "year": meta[0] if len(meta) > 0 else "N/A",
            "transmission": meta[1] if len(meta) > 1 else "N/A",
            "sector": city,
            "seller_city": city,
            "equipment": desc,
            "publication_date": pub_date,
            "url": link,
            "image_urls": [],
        })
    return listings


def parse_spec_table(doc):
    """Return {label: value} from the 'Informations Véhicule' table."""
    specs = {}
    for tr in doc.cssselect("table.table-bordered tr"):
        tds = tr.cssselect("td")
        # each <tr> holds (label, value) pairs
        for j in range(0, len(tds) - 1, 2):
            label = tds[j].text_content().strip().rstrip(":")
            value = tds[j + 1].text_content().strip()
            if label and value:
                specs[label] = value
    return specs


def scrape_details(listing):
    """Fetch the detail page and return a canonical-schema row."""
    url = listing["url"]
    print(f"  🔎 Détail {listing['listing_id']}: {url}")
    doc = lh.fromstring(fetch(url))

    specs = parse_spec_table(doc)
    equipment = ", ".join(
        el.text_content().strip()
        for el in doc.xpath(
            "//h4[contains(text(),'Caractéristiques')]/following-sibling::div//div[contains(@class,'d-flex')]"
        )
        if el.text_content().strip()
    )
    desc = doc.xpath(
        "//h4[contains(text(),'Spécifications')]/following-sibling::div[1]//p"
    )
    full_desc = desc[0].text_content().strip() if desc else listing.get("equipment", "N/A")

    location = "N/A"
    for item in doc.cssselect(".ad-detail-meta__item"):
        icons = item.cssselect("i")
        if icons and "fa-map-marker" in icons[0].get("class", ""):
            location = item.text_content().strip()

    images = [
        img.get("src")
        for img in doc.cssselect(".ad-gallery-slide img")
        if img.get("src") and "http" in img.get("src")
    ]

    row = dict(listing)
    row["equipment"] = equipment or full_desc or "N/A"
    row["fuel_type"] = specs.get("Carburant", "N/A")
    row["transmission"] = specs.get("Transmission", listing.get("transmission", "N/A"))
    row["mileage"] = specs.get("Kilométrage", "N/A")
    row["brand"] = specs.get("Marque", "N/A")
    row["model"] = specs.get("Modèle", "N/A")
    row["door_count"] = specs.get("Nombre de portes", "N/A")
    row["fiscal_power"] = specs.get("Puissance fiscale", "N/A")
    row["creator"] = "N/A"
    row["first_owner"] = "N/A"
    row["condition"] = "N/A"
    row["origin"] = "N/A"
    row["image_folder"] = ""
    row["image_urls"] = images
    if location != "N/A":
        row["sector"] = location
        row["seller_city"] = location
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
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows({k: r.get(k, "") for k in CSV_FIELDS} for r in rows)
    print(f"✅ CSV sauvegardé: {path}")
    return path


def main():
    parser = argparse.ArgumentParser(description="Scraper Moteur.ma (HTML)")
    parser.add_argument("--pages", type=int, default=1, help="nb de pages à scraper (défaut 1)")
    parser.add_argument("--start-page", type=int, default=0, help="page de départ (0 = depuis le checkpoint)")
    parser.add_argument("--fresh", action="store_true", help="purger bronze + repartir de la page 1")
    parser.add_argument("--limit", type=int, default=0, help="max annonces (0 = tout)")
    parser.add_argument("--no-images", action="store_true", help="ne pas télécharger les images")
    parser.add_argument("--no-clickhouse", action="store_true", help="ne pas écrire dans bronze.listings")
    parser.add_argument("--out", default="moteur_complete.csv", help="nom du fichier CSV (test)")
    args = parser.parse_args()

    if args.fresh:
        truncate_bronze("moteur")
        reset_checkpoint()

    start = args.start_page if args.start_page > 0 else read_checkpoint() + 1
    print(f"🚗 Scraping Moteur.ma… à partir de la page {start} ({args.pages} pages)")

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
            lid = str(listing.get("listing_id", ""))
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
                print(f"✅ {row['title']} — {row['price']}")
                time.sleep(1)
            except Exception as e:  # noqa: BLE001
                print(f"❌ Erreur annonce {listing['listing_id']}: {e}")

        if not page_rows:
            print(f"🛑 Aucune annonce extraite page {page} — arrêt.")
            break
        rows.extend(page_rows)
        if not args.no_clickhouse:
            insert_bronze("moteur", page_rows)
        write_checkpoint(page)
        if remaining <= 0:
            break

    if not rows:
        print("❌ Aucune annonce récupérée.")
        sys.exit(1)

    save_to_csv(rows, args.out)
    print(f"\n✅ TERMINÉ — {len(rows)} annonces → bronze + {os.path.join('data', 'moteur', args.out)}")


if __name__ == "__main__":
    main()
