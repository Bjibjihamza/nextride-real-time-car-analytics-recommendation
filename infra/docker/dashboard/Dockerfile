# NextRide - analytics dashboard
FROM python:3.11-slim

RUN pip install --no-cache-dir streamlit pandas plotly requests

WORKDIR /app
COPY apps/dashboard/app.py ./app.py

EXPOSE 8501

HEALTHCHECK --interval=20s --timeout=10s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8501/_stcore/health')"

CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0", "--server.headless=true"]
