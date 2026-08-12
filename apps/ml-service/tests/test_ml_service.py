"""Tests for the NextRide ML price prediction service."""

from app.api import app
from app.features import estimate_price


def make_client():
    app.config["TESTING"] = True
    return app.test_client()


def test_health_endpoint():
    client = make_client()
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json["status"] == "ok"


def test_predict_with_full_payload():
    client = make_client()
    res = client.post(
        "/predict",
        json={
            "brand": "toyota",
            "model": "corolla",
            "year": 2018,
            "mileage": 90000,
            "fuel_type": "diesel",
            "transmission": "manuelle",
            "fiscal_power": 6,
            "door_count": 5,
            "first_owner": "non",
            "condition": "bon",
        },
    )
    assert res.status_code == 200
    price = res.json["prediction"]["predictedPrice"]
    assert isinstance(price, float)
    assert 15000 <= price <= 5000000


def test_predict_with_empty_payload_still_returns_a_price():
    client = make_client()
    res = client.post("/predict", json={})
    assert res.status_code == 200
    price = res.json["prediction"]["predictedPrice"]
    assert 15000 <= price <= 5000000


def test_predict_rejects_non_json_body():
    client = make_client()
    res = client.post("/predict", data="not json", content_type="text/plain")
    assert res.status_code == 400


def test_newer_low_mileage_car_is_more_expensive():
    newer = estimate_price({"brand": "toyota", "year": 2023, "mileage": 10000})
    older = estimate_price({"brand": "toyota", "year": 2005, "mileage": 250000})
    assert newer > older


def test_luxury_brand_is_more_expensive_than_economy_brand():
    luxury = estimate_price({"brand": "bmw", "year": 2018, "mileage": 90000})
    economy = estimate_price({"brand": "dacia", "year": 2018, "mileage": 90000})
    assert luxury > economy
