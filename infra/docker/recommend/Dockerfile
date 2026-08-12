FROM python:3.11-slim

WORKDIR /app

COPY pipeline/recommendations/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY pipeline/recommendations/combined_recommendations.py /app/combined_recommendations.py
COPY infra/docker/wait_for_cassandra.py /app/wait_for_cassandra.py
COPY infra/docker/recommend/run.py /app/run.py
COPY infra/docker/recommend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV CASSANDRA_HOST=cassandra

ENTRYPOINT ["/app/entrypoint.sh"]
