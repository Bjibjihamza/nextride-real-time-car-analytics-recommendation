FROM python:3.11-slim

WORKDIR /app

COPY apps/ml-service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY apps/ml-service/app/ /app/app/

EXPOSE 5001

CMD ["python", "-m", "app.api"]
