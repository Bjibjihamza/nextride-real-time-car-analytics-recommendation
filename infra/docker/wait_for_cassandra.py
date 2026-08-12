"""Wait for Cassandra to be up (and optionally for a table to have rows)."""

import os
import sys
import time

from cassandra.cluster import Cluster

HOST = os.environ.get("CASSANDRA_HOST", "localhost")
KEYSPACE = os.environ.get("CASSANDRA_KEYSPACE", "cars_keyspace")
TABLE = os.environ.get("WAIT_FOR_TABLE", "")  # optional: require count > 0
TIMEOUT = int(os.environ.get("WAIT_TIMEOUT", "180"))


def main() -> None:
    deadline = time.time() + TIMEOUT
    cluster = Cluster([HOST])
    while time.time() < deadline:
        try:
            session = cluster.connect(KEYSPACE)
            session.execute("SELECT now() FROM system.local")
            if TABLE:
                rows = session.execute(f"SELECT COUNT(*) AS c FROM {TABLE}")
                count = rows.one().c
                if count and count > 0:
                    print(f"Cassandra ready: {KEYSPACE}.{TABLE} has {count} rows")
                    cluster.shutdown()
                    return
                print(f"Cassandra up, waiting for rows in {TABLE} ...")
            else:
                print("Cassandra ready")
                cluster.shutdown()
                return
        except Exception as exc:  # noqa: BLE001
            print(f"Waiting for Cassandra: {exc}")
        time.sleep(5)
    print(f"Timed out waiting for Cassandra after {TIMEOUT}s")
    sys.exit(1)


if __name__ == "__main__":
    main()
