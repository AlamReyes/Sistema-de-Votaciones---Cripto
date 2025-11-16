FROM python:3.12-slim

WORKDIR /app

# instalar curl para el healthcheck
RUN apt-get update && apt-get install -y curl && apt-get clean

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# aplica migraciones y arranca FastAPI
CMD sh -c "alembic revision --autogenerate -m 'Initial Tables' && alembic upgrade head && fastapi run main.py --host 0.0.0.0 --port 8000"
