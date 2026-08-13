"""
NextRide - Canonical / unified schema shared by both scrapers and the
ClickHouse layers.

Avito and Moteur use different field names for the same information
(e.g. Avito exposes 'seller', Moteur 'Créateur'). Every scraper emits rows
with THESE keys, so a car from either source has the same label. Bronze
and silver columns are derived from this list.
"""

CANONICAL_FIELDS = [
    "source",          # avito | moteur
    "listing_id",      # identifiant stable de l'annonce chez la source
    "title",           # titre de l'annonce
    "price",           # prix (nombre)
    "currency",        # DH | MAD
    "year",            # année-modèle
    "fuel_type",       # Essence | Diesel | Hybride | Électrique
    "transmission",    # Automatique | Manuelle
    "creator",         # vendeur / propriétaire (shop ou particulier)
    "sector",          # ville / région
    "mileage",         # kilométrage (nombre)
    "brand",           # marque
    "model",           # modèle
    "door_count",      # nombre de portes
    "origin",          # origine (WW au Maroc, importée...)
    "first_owner",     # première main (Oui/Non)
    "fiscal_power",    # puissance fiscale (CV)
    "condition",       # état du véhicule
    "equipment",       # équipements / options / description
    "seller_city",     # ville du vendeur
    "image_folder",    # dossier des images téléchargées
    "url",             # lien vers l'annonce
    "publication_date",# date de publication
    "image_urls",      # liste des URLs des images
]

CSV_FIELDS = [f for f in CANONICAL_FIELDS if f not in ("image_urls",)]
