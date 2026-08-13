"""Scraper smoke test — real extraction against current site markup.

Diagnosis (2026-08): the Selenium scrapers in pipeline/scrapers are BROKEN —
both sites changed their markup and every CSS selector is stale (Avito: the
`sc-*` hashed classes are gone; Moteur: `.row-item` is gone).

What still works, with the CURRENT markup:

  * Avito.ma  — server-rendered Next.js page with all 38 listing-ads embedded
                in the `__NEXT_DATA__` JSON blob. No Selenium needed.
  * Moteur.ma — server-rendered HTML; new card classes `.ads-index-card`,
                `.ads-index-title`, `.ad-price-grid`, `.ad-meta`.

This test pulls up to `--limit` ads per site and dumps the raw data.
No image download, no Kafka, no CSV write.

Usage (from repo root):
    python tests/scrapers/scraper_smoke_test.py [--site both] [--limit 20]
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime

import requests
from lxml import html as lh

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

AVITO_URL = "https://www.avito.ma/fr/maroc/voitures_d_occasion-à_vendre?o=1"
MOTEUR_URL = "https://www.moteur.ma/fr/voiture/achat-voiture-occasion/"


def fetch(url):
    resp = requests.get(url, headers=HEADERS, timeout=45)
    resp.raise_for_status()
    resp.encoding = "utf-8"
    return resp.text


def extract_avito(limit):
    """Listings are embedded in the __NEXT_DATA__ JSON — no Selenium."""
    html = fetch(AVITO_URL)
    m = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        html,
        re.S,
    )
    if not m:
        raise RuntimeError("__NEXT_DATA__ introuvable (structure Avito changée ?)")
    data = json.loads(m.group(1))
    ads = data["props"]["pageProps"]["componentProps"]["ads"]["ads"]
    print(f"✅ Avito : {len(ads)} annonces dans le JSON")
    rows = []
    for a in ads[:limit]:
        params = {
            p.get("key"): (p.get("fullValue") or p.get("value"))
            for p in (a.get("params") or {}).get("secondary", [])
        }
        price = a.get("price") or {}
        rows.append({
            "id": a.get("id"),
            "listId": a.get("listId"),
            "titre": a.get("subject"),
            "prix": price.get("value"),
            "devise": price.get("currency"),
            "année": params.get("regdate"),
            "km": params.get("mileage_exact"),
            "carburant": params.get("fuel"),
            "boite": params.get("bv"),
            "ville": a.get("location"),
            "date": a.get("date"),
            "vendeur": (a.get("seller") or {}).get("name"),
            "type_vendeur": (a.get("seller") or {}).get("type"),
            "nb_images": len(a.get("images") or []),
            "url": a.get("href"),
        })
    return rows


def extract_moteur(limit):
    """Server-rendered HTML — new card classes."""
    html = fetch(MOTEUR_URL)
    doc = lh.fromstring(html)
    cards = doc.cssselect(".ads-index-card")
    print(f"✅ Moteur : {len(cards)} annonces dans la page")
    rows = []
    for card in cards[:limit]:
        title_el = card.cssselect(".ads-index-title")
        title = title_el[0].text_content().strip() if title_el else "N/A"
        link_el = card.cssselect('a[href*="detail-annonce"]')
        link = link_el[0].get("href") if link_el else None
        ad_id = re.search(r"detail-annonce/(\d+)", link or "").group(1) if link else "N/A"
        price_el = card.cssselect(".ad-price-grid")
        price = price_el[0].text_content().strip() if price_el else "N/A"
        city_el = card.cssselect(".item-card9-desc a")
        city = city_el[0].text_content().strip() if city_el else "N/A"
        time_el = card.cssselect("span.timeago")
        pub_date = time_el[0].get("data-time") if time_el else "N/A"
        desc_el = card.cssselect(".ad-desc")
        desc = desc_el[0].text_content().strip() if desc_el else "N/A"
        meta = [s.text_content().strip() for s in card.cssselect(".ad-meta span")]
        img_el = card.cssselect(".ads-index-media-img")
        img = img_el[0].get("src") if img_el else None
        rows.append({
            "id": ad_id,
            "titre": title,
            "prix": price,
            "année": meta[0] if len(meta) > 0 else "N/A",
            "boite": meta[1] if len(meta) > 1 else "N/A",
            "ville": city,
            "date": pub_date,
            "description": desc,
            "image": img,
            "url": link,
        })
    return rows


def preview(name, data):
    import pandas as pd

    if not data:
        return
    df = pd.DataFrame(data)
    print(f"\n----- Aperçu {name} ({len(df)} lignes) -----")
    pd.set_option("display.max_columns", None)
    pd.set_option("display.max_colwidth", 32)
    pd.set_option("display.width", 260)
    print(df.head(10).to_string())


def main():
    parser = argparse.ArgumentParser(description="Smoke test des scrapers")
    parser.add_argument("--site", choices=["avito", "moteur", "both"], default="both")
    parser.add_argument("--limit", type=int, default=20, help="max annonces (défaut 20)")
    args = parser.parse_args()

    results = {}
    for site, fn in (("avito", extract_avito), ("moteur", extract_moteur)):
        if args.site in (site, "both"):
            try:
                results[site] = fn(args.limit)
            except Exception as e:
                print(f"❌ {site}: {type(e).__name__}: {e}")
                results[site] = []

    preview("Avito", results.get("avito", []))
    preview("Moteur", results.get("moteur", []))

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = os.path.join(OUTPUT_DIR, f"scrape_{stamp}.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n📄 Données complètes écrites dans {out_file}")


if __name__ == "__main__":
    main()
