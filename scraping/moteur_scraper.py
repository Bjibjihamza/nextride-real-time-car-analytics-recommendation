import os
import re
import time
import json
import secrets
import string
import requests
import pandas as pd
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from kafka import KafkaProducer

# Configuration des répertoires
DATA_DIR = "../data/moteur"
IMAGES_DIR = os.path.join("..", "backend", "images", "cars")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

# Configuration Kafka
KAFKA_BOOTSTRAP_SERVERS = 'localhost:9092'
KAFKA_TOPIC = 'moteur_cars'

def setup_kafka_producer():
    """Configure et initialise le producer Kafka."""
    try:
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: str(k).encode('utf-8')
        )
        print(f"✅ Connexion réussie au serveur Kafka: {KAFKA_BOOTSTRAP_SERVERS}")
        return producer
    except Exception as e:
        print(f"❌ Erreur lors de la connexion à Kafka: {e}")
        return None

def send_to_kafka(producer, topic, key, value):
    """Envoie un message à un topic Kafka."""
    if producer is None:
        print("⚠️ Producer Kafka non disponible, message non envoyé")
        return False
    try:
        future = producer.send(topic, key=key, value=value)
        result = future.get(timeout=60)
        print(f"✅ Message envoyé à Kafka: topic={topic}, partition={result.partition}, offset={result.offset}")
        return True
    except Exception as e:
        print(f"❌ Erreur lors de l'envoi à Kafka: {e}")
        return False

def setup_driver():
    """Configure and initialize the Selenium driver."""
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--log-level=3")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def create_folder_name(title, idx):
    """Crée un nom de dossier court, aléatoire et valide sans accents ni caractères spéciaux."""
    random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    folder_name = f"{random_part}_{idx}"
    return folder_name

def download_image(url, folder_path, index):
    """Télécharge une image à partir d'une URL avec des en-têtes améliorés."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        print(f"Téléchargement de {url} vers {folder_path}")
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code == 200:
            file_extension = url.split('.')[-1]
            if '?' in file_extension:
                file_extension = file_extension.split('?')[0]
            if not file_extension or len(file_extension) > 5:
                file_extension = "jpg"
            image_path = os.path.join(folder_path, f"image_{index}.{file_extension}")
            with open(image_path, 'wb') as f:
                f.write(response.content)
            print(f"✅ Image enregistrée : {image_path}")
            return True
        else:
            print(f"❌ Erreur HTTP {response.status_code} pour {url}")
        return False
    except Exception as e:
        print(f"⚠️ Erreur lors du téléchargement de l'image {url}: {e}")
        return False

def extract_id_from_url(url):
    """Extrait l'ID de l'annonce à partir de l'URL."""
    match = re.search(r"/detail-annonce/(\d+)/", url)
    return match.group(1) if match else "N/A"

def scrape_listings_page(driver, page_number):
    """Scrape la page des annonces."""
    BASE_URL = "https://www.moteur.ma/fr/voiture/achat-voiture-occasion/"
    offset = (page_number - 1) * 30
    page_url = f"{BASE_URL}{offset}" if offset > 0 else BASE_URL
    print(f"🔎 Scraping page {page_number}: {page_url}")
    driver.get(page_url)
    try:
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CLASS_NAME, "row-item"))
        )
    except:
        print(f"❌ Aucune annonce trouvée sur la page {page_number} !")
        return []
    car_elements = driver.find_elements(By.CLASS_NAME, "row-item")
    print(f"✅ {len(car_elements)} annonces trouvées sur la page {page_number} !")
    data = []
    for car in car_elements:
        try:
            title_element = car.find_element(By.CLASS_NAME, "title_mark_model")
            title = title_element.text.strip() if title_element else "N/A"
            try:
                link_element = car.find_element(By.XPATH, ".//h3[@class='title_mark_model']/a")
                link = link_element.get_attribute("href") if link_element else "N/A"
                ad_id = extract_id_from_url(link)
            except:
                link, ad_id = "N/A", "N/A"
            try:
                price_element = car.find_element(By.CLASS_NAME, "PriceListing")
                price = price_element.text.strip()
            except:
                price = "N/A"
            meta_elements = car.find_elements(By.TAG_NAME, "li")
            year = "N/A"
            city = "N/A"
            fuel = "N/A"
            forbidden_values = ["Appeler pour le prix", "Se faire rappeler", "Booster l'annonce", ""]
            for li in meta_elements:
                text = li.text.strip()
                if re.match(r"^(19|20)\d{2}$", text):
                    year = text
                elif text.lower() in ["essence", "diesel", "hybride", "électrique"]:
                    fuel = text.capitalize()
                elif city == "N/A" and text not in forbidden_values:
                    city = text
            if city in forbidden_values or city == "N/A":
                print(f"⚠️ Ville douteuse pour l'annonce ID {ad_id} : '{city}' - {link}")
            data.append({
                "ID": ad_id,
                "Titre": title,
                "Prix": price,
                "Année": year,
                "Type de carburant": fuel,
                "Ville": city,
                "URL de l'annonce": link
            })
        except Exception as e:
            print(f"⚠️ Erreur avec une annonce: {e}")
    time.sleep(3)
    return data

def scrape_detail_page(driver, url, ad_id, title, price, idx):
    """Scrape les détails d'une annonce spécifique."""
    try:
        driver.get(url)
        time.sleep(3)
        folder_name = create_folder_name(title, idx)
        folder_path = os.path.join(IMAGES_DIR, folder_name)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            print(f"📂 Dossier créé : {folder_path}")
        location = "N/A"
        mileage = "N/A"
        brand = "N/A"
        model = "N/A"
        doors = "N/A"
        first_hand = "N/A"
        fiscal_power = "N/A"
        equipment_text = "N/A"
        seller_city = "N/A"
        dedouane = "N/A"
        transmission = "N/A"
        fuel_type = "N/A"
        creator = "N/A"
        try:
            creator_element = driver.find_element(By.XPATH, "//a[.//i[contains(@class, 'icon-normal-megaphone')]]")
            if creator_element:
                creator = creator_element.text.strip()
            if creator == "N/A":
                creator_element = driver.find_element(By.XPATH, "//div[@class='actions block_tele']//li/a[i[contains(@class, 'icon-normal-megaphone')]]")
                creator = creator_element.text.strip()
        except Exception as e:
            print(f"Erreur extraction du créateur: {e}")
            try:
                creator_element = driver.find_element(By.XPATH, "//div[@class='block-inner block-detail-ad']//div[@class='actions block_tele']//a[contains(@href, 'stock-professionnel')]")
                creator = creator_element.text.strip()
            except Exception as e2:
                print(f"Erreur extraction du créateur (méthode alternative): {e2}")
        try:
            transmission_element = driver.find_element(By.XPATH, "//span[contains(text(), 'Boite de vitesses')]/following-sibling::span")
            transmission = transmission_element.text.strip()
        except Exception as e:
            print(f"Erreur extraction directe de transmission: {e}")
        detail_lines = driver.find_elements(By.CLASS_NAME, "detail_line")
        for line in detail_lines:
            try:
                spans = line.find_elements(By.TAG_NAME, "span")
                if len(spans) >= 2:
                    key = spans[0].text.strip()
                    value = spans[1].text.strip()
                    if "Kilométrage" in key:
                        mileage = value
                    elif "Boite de vitesses" in key:
                        transmission = value
                    elif "Carburant" in key:
                        fuel_type = value
                    elif "Puissance fiscale" in key:
                        fiscal_power = value
                    elif "Nombre de portes" in key:
                        doors = value
                    elif "Première main" in key:
                        first_hand = value
                    elif "Véhicule dédouané" in key:
                        dedouane = value
            except Exception as e:
                print(f"Erreur lors de l'extraction d'une ligne de détail: {e}")
        try:
            description_element = driver.find_element(By.CSS_SELECTOR, "div.options div.col-md-12")
            equipment_text = description_element.text.strip()
        except Exception as e:
            print(f"Erreur extraction description: {e}")
        try:
            city_element = driver.find_element(By.XPATH, "//a[contains(@href, 'ville')]")
            seller_city = city_element.text.strip()
            location = seller_city
        except Exception as e:
            print(f"Erreur extraction ville: {e}")
        image_count = 0
        try:
            image_elements = driver.find_elements(By.CSS_SELECTOR, "img[data-u='image']")
            for index, img in enumerate(image_elements):
                img_url = img.get_attribute("src")
                if img_url and "http" in img_url:
                    success = download_image(img_url, folder_path, index + 1)
                    if success:
                        image_count += 1
        except Exception as e:
            print(f"Erreur lors de l'extraction des images: {e}")
        try:
            title_parts = title.split()
            if len(title_parts) >= 2:
                brand = title_parts[0].upper()
                model = title_parts[1].capitalize()
        except Exception as e:
            print(f"Erreur lors de l'extraction de la marque et du modèle depuis le titre: {e}")
        detail_data = {
            "ID": ad_id,
            "Titre": title,
            "Prix": price,
            "Date de publication": datetime.now().strftime("%Y-%m-%d"),
            "Type de carburant": fuel_type,
            "Transmission": transmission,
            "Créateur": creator,
            "Secteur": location,
            "Kilométrage": mileage,
            "Marque": brand,
            "Modèle": model,
            "Nombre de portes": doors,
            "Première main": first_hand,
            "Puissance fiscale": fiscal_power,
            "Équipements": equipment_text,
            "Ville du vendeur": seller_city,
            "Dossier d'images": folder_name,
            "Dédouané": dedouane
        }
        return detail_data
    except Exception as e:
        print(f"❌ Erreur lors du scraping de la page {url}: {e}")
        return {
            "ID": ad_id,
            "Titre": title,
            "Prix": price,
            "Date de publication": datetime.now().strftime("%Y-%m-%d"),
            "Type de carburant": "N/A",
            "Transmission": "N/A",
            "Créateur": "N/A" ,
            "Secteur": "N/A",
            "Kilométrage": "N/A",
            "Marque": "N/A",
            "Modèle": "N/A",
            "Nombre de portes": "N/A",
            "Première main": "N/A",
            "Puissance fiscale": "N/A",
            "Équipements": "N/A",
            "Ville du vendeur": "N/A",
            "Dossier d'images": folder_name,
            "Dédouané": "N/A"
        }

def main():
    """Fonction principale qui exécute le scraper complet."""
    print("🚗 Démarrage du scraper complet Moteur.ma...")
    driver = setup_driver()
    kafka_producer = setup_kafka_producer()
    try:
        print("\n📋 Récupération des annonces de la page 1...")
        listings_data = scrape_listings_page(driver, 1)
        if not listings_data:
            print("❌ Aucune annonce trouvée. Arrêt du programme.")
            driver.quit()
            return
        print(f"✅ {len(listings_data)} annonces récupérées.")
        print("\n🔍 Récupération des détails pour chaque annonce...")
        detailed_data = []
        for idx, listing in enumerate(listings_data, start=1):
            print(f"\n➡️ Traitement de l'annonce {idx}/{len(listings_data)}: {listing['Titre']}")
            detail = scrape_detail_page(
                driver,
                listing["URL de l'annonce"],
                listing['ID'],
                listing['Titre'],
                listing['Prix'],
                idx
            )
            if kafka_producer:
                print(f"📤 Envoi des données de l'annonce {detail['ID']} à Kafka...")
                send_to_kafka(kafka_producer, KAFKA_TOPIC, detail['ID'], detail)
            detailed_data.append(detail)
            time.sleep(2)
        output_file = os.path.join(DATA_DIR, f"moteur_complete.csv")
        df = pd.DataFrame(detailed_data)
        df.to_csv(output_file, index=False, encoding="utf-8-sig")
        print("\n✅ SCRAPING TERMINÉ AVEC SUCCÈS!")
        print(f"📊 {len(detailed_data)} annonces complètes récupérées.")
        print(f"📄 Données enregistrées dans: {output_file}")
        print(f"🖼️ Images téléchargées dans: {IMAGES_DIR}")
        print(f"📡 Données envoyées au topic Kafka: {KAFKA_TOPIC}")
    except Exception as e:
        print(f"❌ Erreur globale: {e}")
    finally:
        if kafka_producer:
            kafka_producer.flush()
            kafka_producer.close()
            print("🔌 Producer Kafka fermé.")
        driver.quit()
        print("🏁 Programme terminé.")

if __name__ == "__main__":
    main()