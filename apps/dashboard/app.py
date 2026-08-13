"""
NextRide - Gold analytics dashboard (Streamlit).

Reads the gold views from ClickHouse and renders the used-car market
analytics: KPIs, price trends, brand/sector rankings, fuel distribution.

Run locally:
    pip install streamlit pandas plotly requests
    streamlit run apps/dashboard/app.py

Or via docker: docker compose -f deploy/docker-compose.yml up -d dashboard
"""

import os

import pandas as pd
import plotly.express as px
import requests
import streamlit as st

CLICKHOUSE_URL = os.environ.get("CLICKHOUSE_URL", "http://localhost:8123")
CLICKHOUSE_USER = os.environ.get("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.environ.get("CLICKHOUSE_PASSWORD", "nextride")

st.set_page_config(page_title="NextRide Analytics", layout="wide")


def q(sql):
    r = requests.post(
        CLICKHOUSE_URL,
        params={"user": CLICKHOUSE_USER, "password": CLICKHOUSE_PASSWORD,
                "query": sql, "default_format": "JSONEachRow"},
        timeout=60,
    )
    r.raise_for_status()
    return pd.DataFrame([eval(l) for l in r.text.splitlines() if l.strip()]) if r.text.strip() else pd.DataFrame()


def df(source):
    where = "WHERE source = '%s'" % source if source != "Tous" else ""
    return where


st.title("🚗 NextRide — Marché auto marocain (analytics)")

if st.button("Rafraîchir"):
    st.cache_data.clear()

source = st.sidebar.selectbox("Source", ["Tous", "avito", "moteur"])
w = df(source)

# ---------------- KPIs ----------------
kpi = q(f"SELECT * FROM gold.market_overview {w}")
if not kpi.empty:
    c1, c2, c3, c4, c5, c6 = st.columns(6)
    c1.metric("Annonces", int(kpi["n_listings"].sum()))
    c2.metric("Avec prix", int(kpi["n_priced"].sum()))
    c3.metric("Prix moyen (DH/MAD)", f"{int(kpi['avg_price'].mean()):,}")
    c4.metric("Prix médian", f"{int(kpi['median_price'].mean()):,}")
    c5.metric("Année moyenne", f"{int(kpi['avg_year'].mean())}")
    c6.metric("Km moyen", f"{int(kpi['avg_mileage'].mean()):,}")

st.divider()

col_a, col_b = st.columns(2)

# ---------------- Prix par année ----------------
with col_a:
    st.subheader("Prix moyen par année-modèle")
    y = q(f"SELECT * FROM gold.year_stats {w}")
    if not y.empty:
        fig = px.bar(
            y.sort_values("year"),
            x="year", y="avg_price",
            color="source",
            hover_data=["n_listings"],
            title="Prix moyen (DH/MAD) par année",
        )
        st.plotly_chart(fig, use_container_width=True)

# ---------------- Tendance prix / mois ----------------
with col_b:
    st.subheader("Tendance des prix (mois de publication)")
    t = q(f"SELECT * FROM gold.price_trend {w}")
    if not t.empty:
        t["month"] = pd.to_datetime(t["month"])
        fig = px.line(
            t.sort_values("month"),
            x="month", y="median_price",
            color="source",
            markers=True,
            title="Prix médian par mois",
        )
        st.plotly_chart(fig, use_container_width=True)

col_c, col_d = st.columns(2)

# ---------------- Marques ----------------
with col_c:
    st.subheader("Top marques")
    b = q(f"SELECT * FROM gold.brand_stats {w} ORDER BY n_listings DESC LIMIT 15")
    if not b.empty:
        fig = px.bar(
            b.sort_values("n_listings"),
            x="n_listings", y="brand",
            color="avg_price",
            color_continuous_scale="viridis",
            orientation="h",
            hover_data=["avg_price", "median_price"],
            title="Annonces par marque (couleur = prix moyen)",
        )
        st.plotly_chart(fig, use_container_width=True)

# ---------------- Villes ----------------
with col_d:
    st.subheader("Top villes")
    s = q(f"SELECT * FROM gold.sector_stats {w} ORDER BY n_listings DESC LIMIT 15")
    if not s.empty:
        fig = px.bar(
            s.sort_values("n_listings"),
            x="n_listings", y="sector",
            color="median_price",
            color_continuous_scale="plasma",
            orientation="h",
            hover_data=["avg_price"],
            title="Annonces par ville (couleur = prix médian)",
        )
        st.plotly_chart(fig, use_container_width=True)

# ---------------- Carburant x Boîte ----------------
st.subheader("Distribution carburant × boîte")
f = q(f"SELECT * FROM gold.fuel_transmission_stats {w}")
if not f.empty:
    f["label"] = f["fuel_type"] + " · " + f["transmission"]
    fig = px.treemap(
        f, path=["source", "label"],
        values="n_listings",
        color="avg_price",
        color_continuous_scale="blues",
        title="Volumes par carburant/boîte",
    )
    st.plotly_chart(fig, use_container_width=True)

# ---------------- Dernières annonces ----------------
st.subheader("Dernières annonces (silver)")
last = q(
    f"SELECT source, title, brand, model, year, price, mileage, fuel_type, "
    f"transmission, sector, url FROM silver.listings "
    f"ORDER BY last_seen DESC LIMIT 50"
)
if not last.empty:
    last["price"] = last["price"].fillna(0).astype("int64")
    st.dataframe(
        last,
        use_container_width=True,
        column_config={
            "url": st.column_config.LinkColumn("Lien"),
            "price": st.column_config.NumberColumn("Prix", format="%d"),
        },
    )

st.caption(f"Source : ClickHouse ({CLICKHOUSE_URL}) — couches bronze → silver → gold")
