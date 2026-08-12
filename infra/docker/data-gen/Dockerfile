FROM python:3.11-slim

WORKDIR /app

COPY pipeline/synthetic/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY pipeline/synthetic/ /app/scripts/
COPY infra/docker/wait_for_cassandra.py /app/wait_for_cassandra.py
COPY infra/docker/data-gen/run.py /app/run.py
COPY infra/docker/data-gen/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV CASSANDRA_HOST=cassandra

ENTRYPOINT ["/app/entrypoint.sh"]
