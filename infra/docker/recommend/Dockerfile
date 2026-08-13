FROM python:3.11-slim

WORKDIR /app

COPY pipeline/recommendations/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY pipeline/serving/pg_db.py /app/pg_db.py
COPY pipeline/recommendations/combined_recommendations.py /app/combined_recommendations.py
COPY infra/docker/recommend/run.py /app/run.py
COPY infra/docker/recommend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV PYTHONPATH=/app
ENV PG_HOST=postgres

ENTRYPOINT ["/app/entrypoint.sh"]
