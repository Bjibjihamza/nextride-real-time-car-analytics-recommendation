"""
NextRide - Shared PostgreSQL access for the seed / recommendation jobs.

Wraps psycopg2 with environment-driven config, UUID adaptation and
jsonb helpers so the Cassandra-era scripts can be ported with minimal
mechanical changes (cursor.execute(%s params) + DictCursor rows).

Environment:
    PG_HOST / PG_PORT / PG_DATABASE / PG_USER / PG_PASSWORD
"""

import os
import uuid

import psycopg2
import psycopg2.extras


def _adapt_uuid(value):
    return psycopg2.extensions.QuotedString(str(value))


psycopg2.extensions.register_adapter(uuid.UUID, _adapt_uuid)
psycopg2.extras.register_default_json(globally=True)
psycopg2.extras.register_default_jsonb(globally=True)


def get_conn():
    return psycopg2.connect(
        host=os.environ.get("PG_HOST", "localhost"),
        port=int(os.environ.get("PG_PORT", "5432")),
        dbname=os.environ.get("PG_DATABASE", "nextride"),
        user=os.environ.get("PG_USER", "nextride"),
        password=os.environ.get("PG_PASSWORD", "nextride"),
        cursor_factory=psycopg2.extras.DictCursor,
    )


def query_all(conn, sql, params=None):
    """Run a SELECT and return all rows as dicts."""
    with conn.cursor() as cur:
        cur.execute(sql, params or ())
        rows = cur.fetchall()
    return [dict(r) for r in rows]


def execute(conn, sql, params=None):
    """Run a write query (caller commits)."""
    with conn.cursor() as cur:
        cur.execute(sql, params or ())
