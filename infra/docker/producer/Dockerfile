FROM python:3.11-slim

WORKDIR /app

COPY pipeline/producers/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY pipeline/producers/producer.py /app/producer.py

# /app/data is populated by the compose volume mount (./data -> /app/data)
ENTRYPOINT ["python", "/app/producer.py"]
