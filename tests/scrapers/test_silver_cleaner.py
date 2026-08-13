"""
Tests for the silver cleaner (pipeline/processors/silver_cleaner.py).

Every edge case below was discovered in a real EDA over ~2000 scraped ads
from Avito.ma / Moteur.ma (price placeholders, fuel variants, sector
accents/aliases, mileage caps, door/fiscal bounds, N/A handling).

Run from the repo root:
    python tests/scrapers/test_silver_cleaner.py
"""

import os
import sys
import unittest

sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "pipeline", "processors"))
)

from silver_cleaner import (  # noqa: E402
    clean_brand,
    clean_door_count,
    clean_fiscal_power,
    clean_fuel,
    clean_mileage,
    clean_model,
    clean_price,
    clean_row,
    clean_sector,
    clean_transmission,
    clean_year,
)


class TestCleanPrice(unittest.TestCase):
    def test_ok(self):
        self.assertEqual(clean_price(39000), 39000)
        self.assertEqual(clean_price(172500.0), 172500)
        self.assertEqual(clean_price(10000), 10000)
        self.assertEqual(clean_price(10_000_000), 10_000_000)
        self.assertEqual(clean_price(2_650_000), 2_650_000)  # Porsche 911 légitime

    def test_placeholders_rejected(self):
        for bad in [23, 1, 10, 13, 240, 900, 105, 3, 14, 27, 3308, 9999]:
            self.assertIsNone(clean_price(bad), msg=f"prix {bad} doit être null")

    def test_huge_rejected(self):
        for bad in [855_000_000, 12_000_060, 10_000_001]:
            self.assertIsNone(clean_price(bad))

    def test_none(self):
        self.assertIsNone(clean_price(None))
        self.assertIsNone(clean_price("Demander le prix"))


class TestCleanFuel(unittest.TestCase):
    def test_variants(self):
        self.assertEqual(clean_fuel("Diesel"), "diesel")
        self.assertEqual(clean_fuel("Essence"), "essence")
        self.assertEqual(clean_fuel("Hybride"), "hybride")
        self.assertEqual(clean_fuel("LPG"), "lpg")
        self.assertEqual(clean_fuel("Électrique"), "electrique")
        self.assertEqual(clean_fuel("Electrique"), "electrique")
        self.assertEqual(clean_fuel("Mazout"), "diesel")
        self.assertEqual(clean_fuel("mazot"), "diesel")

    def test_unknown(self):
        self.assertIsNone(clean_fuel(""))
        self.assertIsNone(clean_fuel("N/A"))
        self.assertIsNone(clean_fuel("Hydrogène"))
        self.assertIsNone(clean_fuel(None))


class TestCleanTransmission(unittest.TestCase):
    def test_variants(self):
        self.assertEqual(clean_transmission("Automatique"), "automatique")
        self.assertEqual(clean_transmission("Manuelle"), "manuelle")
        self.assertEqual(clean_transmission("BVA"), "automatique")
        self.assertEqual(clean_transmission("bvm"), "manuelle")
        self.assertEqual(clean_transmission("Manual"), "manuelle")
        self.assertEqual(clean_transmission("Automatic"), "automatique")

    def test_unknown(self):
        self.assertIsNone(clean_transmission(""))
        self.assertIsNone(clean_transmission(None))
        self.assertIsNone(clean_transmission("Séquentielle"))


class TestCleanYear(unittest.TestCase):
    def test_ok(self):
        self.assertEqual(clean_year(2022), 2022)
        self.assertEqual(clean_year(1999), 1999)
        self.assertEqual(clean_year(1987), 1987)
        self.assertEqual(clean_year("2019"), 2019)

    def test_bounds(self):
        self.assertIsNone(clean_year(1979))
        self.assertIsNone(clean_year(2027))
        self.assertIsNone(clean_year(0))
        self.assertIsNone(clean_year(None))
        self.assertIsNone(clean_year("1980 ou plus ancien"))


class TestCleanMileage(unittest.TestCase):
    def test_ok(self):
        self.assertEqual(clean_mileage(105000), 105000)
        self.assertEqual(clean_mileage(0), 0)  # 'neuf'
        self.assertEqual(clean_mileage(81), 81)

    def test_bounds(self):
        self.assertIsNone(clean_mileage(1_000_001))
        self.assertIsNone(clean_mileage(-5))
        self.assertIsNone(clean_mileage(None))
        self.assertIsNone(clean_mileage("105,000 km"))


class TestCleanDoorCount(unittest.TestCase):
    def test_ok(self):
        self.assertEqual(clean_door_count(5), 5)
        self.assertEqual(clean_door_count(3), 3)
        self.assertEqual(clean_door_count(4), 4)
        self.assertEqual(clean_door_count(2), 2)

    def test_bounds(self):
        self.assertIsNone(clean_door_count(0))
        self.assertIsNone(clean_door_count(1))
        self.assertIsNone(clean_door_count(6))
        self.assertIsNone(clean_door_count(None))


class TestCleanFiscalPower(unittest.TestCase):
    def test_ok(self):
        self.assertEqual(clean_fiscal_power(6), 6)
        self.assertEqual(clean_fiscal_power(17), 17)
        self.assertEqual(clean_fiscal_power(10), 10)

    def test_bounds(self):
        self.assertIsNone(clean_fiscal_power(2))
        self.assertIsNone(clean_fiscal_power(51))
        self.assertIsNone(clean_fiscal_power(None))


class TestCleanSector(unittest.TestCase):
    def test_accent_variants(self):
        self.assertEqual(clean_sector("Fès"), "Fes")
        self.assertEqual(clean_sector("Fes"), "Fes")
        self.assertEqual(clean_sector("Salé"), "Sale")
        self.assertEqual(clean_sector("Meknès"), "Meknes")
        self.assertEqual(clean_sector("Kénitra"), "Kenitra")
        self.assertEqual(clean_sector("Tétouan"), "Tetouan")
        self.assertEqual(clean_sector("Laâyoune"), "Laayoune")
        self.assertEqual(clean_sector("Béni Mellal"), "Beni Mellal")

    def test_aliases(self):
        self.assertEqual(clean_sector("Fquih Ben Saleh"), "Fquih Ben Salah")
        self.assertEqual(clean_sector("Kelaa Sraghna"), "El Kelaa des Sraghna")

    def test_unchanged(self):
        self.assertEqual(clean_sector("Casablanca"), "Casablanca")
        self.assertEqual(clean_sector("Tanger"), "Tanger")

    def test_empty_becomes_autre(self):
        self.assertEqual(clean_sector(""), "Autre")
        self.assertEqual(clean_sector(None), "Autre")
        self.assertEqual(clean_sector("N/A"), "Autre")


class TestCleanRow(unittest.TestCase):
    def test_full_row(self):
        row = clean_row({
            "source": "moteur",
            "listing_id": "632156",
            "title": "مرحبا لي بغاها كاينة ف تمارة",
            "price": 12_000_060.0,
            "currency": "MAD",
            "year": 2023.0,
            "fuel_type": "Diesel",
            "transmission": "Automatique",
            "creator": "N/A",
            "sector": "Fès",
            "mileage": 82000.0,
            "brand": "Dacia",
            "model": "Logan",
            "door_count": 5.0,
            "origin": "N/A",
            "first_owner": "N/A",
            "fiscal_power": 6.0,
            "condition": "N/A",
            "equipment": "Climatisation, ABS",
            "seller_city": "Fès",
            "image_folder": "",
            "url": "https://example.com",
            "publication_date": "2026-08-13 14:00:00",
            "image_urls": ["https://example.com/1.jpg"],
            "captured_at": "2026-08-13 14:00:00",
        })
        self.assertIsNone(row["price"])  # 12M = blague → null
        self.assertEqual(row["sector"], "Fes")
        self.assertEqual(row["fuel_type"], "diesel")
        self.assertEqual(row["transmission"], "automatique")
        self.assertIsNone(row["creator"])
        self.assertIsNone(row["first_owner"])
        self.assertEqual(row["year"], 2023)
        self.assertEqual(row["mileage"], 82000)
        self.assertEqual(row["door_count"], 5)
        self.assertEqual(row["equipment"], "Climatisation, ABS")
        self.assertEqual(row["image_urls"], ["https://example.com/1.jpg"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
