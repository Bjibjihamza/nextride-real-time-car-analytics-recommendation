"""Seed NextRide with synthetic users, preferences, views, favorites, searches."""

import os
import subprocess
import sys

SCRIPTS = [
    "users.py",
    "user_preferences.py",
    "car_views_by_user.py",
    "favorite_cars.py",
    "user_searches.py",
]

os.environ.setdefault("NUM_USERS", "10")


def main() -> None:
    for script in SCRIPTS:
        print(f"=== Running {script} ===")
        result = subprocess.run([sys.executable, os.path.join("/app/scripts", script)])
        if result.returncode != 0:
            print(f"FAILED: {script} exited with {result.returncode}")
            sys.exit(result.returncode)
    print("DATA_GEN_DONE: synthetic data seeded successfully")


if __name__ == "__main__":
    main()
