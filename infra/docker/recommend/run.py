"""Generate recommendations for seeded users via combined_recommendations.py."""

import os
import subprocess
import sys

from cassandra.cluster import Cluster

os.environ["WAIT_FOR_TABLE"] = "users"
from wait_for_cassandra import main as wait_for_cassandra  # noqa: E402

MAX_USERS = int(os.environ.get("MAX_USERS", "5"))


def get_user_ids() -> list:
    cluster = Cluster([os.environ.get("CASSANDRA_HOST", "cassandra")])
    try:
        session = cluster.connect(os.environ.get("CASSANDRA_KEYSPACE", "cars_keyspace"))
        rows = session.execute("SELECT user_id FROM users")
        return [str(row.user_id) for row in rows]
    finally:
        cluster.shutdown()


def main() -> None:
    wait_for_cassandra()
    user_ids = get_user_ids()
    if not user_ids:
        print("No users found — run the data-gen service first.")
        sys.exit(1)

    for uid in user_ids[:MAX_USERS]:
        print(f"=== Generating recommendations for {uid} ===")
        result = subprocess.run([sys.executable, "/app/combined_recommendations.py", uid])
        if result.returncode != 0:
            print(f"WARN: combined_recommendations.py exited with {result.returncode} for {uid}")

    print(f"RECOMMEND_DONE: recommendations generated for {min(len(user_ids), MAX_USERS)} user(s)")


if __name__ == "__main__":
    main()
