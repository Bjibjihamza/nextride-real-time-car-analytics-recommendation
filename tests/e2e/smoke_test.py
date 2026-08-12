"""
End-to-end smoke test for the NextRide pipeline.

Verifies, against a running stack:
  * backend API is up            (GET  /)
  * ML service is up             (GET  /health)
  * Cassandra is populated       (GET  /api/cars -> non-empty)
  * user registration + login    (POST /api/auth/register, /api/auth/login)
  * car search                  (POST /api/search)
  * price prediction            (POST /api/prediction)

Usage:  python scripts/smoke_test.py
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = os.environ.get("API_URL", "http://localhost:5002")
ML = os.environ.get("ML_URL", "http://localhost:5001")
TIMEOUT = 10
RETRIES = 30


def request(method, url, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return resp.status, json.loads(resp.read().decode() or "{}")


def wait_until_ready(fn, retries=RETRIES, delay=5):
    last = None
    for _ in range(retries):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(delay)
    raise RuntimeError(f"Service not ready after {retries * delay}s: {last}")


def check(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))
    return ok


def main():
    results = []

    def api_ready():
        return request("GET", f"{API}/")

    status, _ = wait_until_ready(api_ready)
    results.append(check("backend API is up", status == 200))

    def ml_ready():
        return request("GET", f"{ML}/health")

    status, health = wait_until_ready(ml_ready)
    results.append(check("ML service is up", status == 200 and health.get("status") == "ok"))

    # Cassandra populated (cleaned_cars)
    status, body = request("GET", f"{API}/api/cars?page=1&limit=5")
    car_count = len(body.get("cars", [])) if isinstance(body.get("cars"), list) else 0
    results.append(check("Cassandra contains cleaned cars", car_count > 0, f"{car_count} cars"))

    # Register a fresh user
    username = f"smoke_{int(time.time())}"
    status, body = request(
        "POST",
        f"{API}/api/auth/register",
        {"username": username, "email": f"{username}@example.com", "password": "password123"},
    )
    token = body.get("token")
    results.append(check("user registration works", status == 201 and token, f"user={username}"))

    # Login
    status, body = request(
        "POST", f"{API}/api/auth/login", {"email": f"{username}@example.com", "password": "password123"}
    )
    token = body.get("token") or token
    results.append(check("user login works", status == 200 and token))

    # Search
    status, body = request("POST", f"{API}/api/search", {"searchTerm": "", "page": 1, "limit": 5})
    results.append(check("car search works", status == 200, f"{len(body.get('cars', []))} results"))

    # Prediction
    status, body = request(
        "POST",
        f"{API}/api/prediction",
        {
            "userId": username,
            "brand": "toyota",
            "model": "corolla",
            "year": 2018,
            "mileage": 90000,
            "fuel_type": "diesel",
            "transmission": "manuelle",
            "fiscal_power": 6,
            "door_count": 5,
        },
    )
    price = body.get("prediction", {}).get("predictedPrice") if status == 200 else None
    results.append(check("price prediction works", status == 200 and price is not None, f"price={price}"))

    # Protected route with token
    if token:
        status, _ = request("GET", f"{API}/api/users", token=token)
        results.append(check("authenticated /api/users works", status == 200))

    print("\n" + ("=" * 60))
    passed = sum(1 for r in results if r)
    print(f"Smoke test: {passed}/{len(results)} checks passed")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
