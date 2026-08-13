FROM python:3.11-slim

WORKDIR /app

COPY pipeline/synthetic/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY pipeline/serving/pg_db.py /app/pg_db.py
COPY pipeline/synthetic/ /app/scripts/
COPY infra/docker/data-gen/run.py /app/run.py
COPY infra/docker/data-gen/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV PYTHONPATH=/app
ENV PG_HOST=postgres

ENTRYPOINT ["/app/entrypoint.sh"]
