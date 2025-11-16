# Backend FastAPI

Proyecto base en **FastAPI** para exponer APIs con DB y migraciones.

### 1. Prerrequisitos

- **Git**
- **Python 3.12+** (descarga desde python.org e instala marcando “Add Python to PATH”). :contentReference[oaicite:0]{index=0}
- **Docker** y **Docker Compose** instalados y corriendo.
- (Opcional) Editor como VS Code.

---

### 2. Cambiar al directorio backend y crear entorno virtual

```bash
cd backend

python -m venv .venv

. .venv/bin/activate
```

#### 2.1 Salir del entorno virtual

```bash
deactivate
```

### 3. Dependencias

```bash
pip install -r requirements.txt
```

### 4. Crear .env

```bash
mv env.example .env
```

### 5. Correr en Docker (desde fuera del entorno virtual)

```bash
# Levantar el contenedor
docker compose up --build

# Seed a la base de datos
docker compose run seed

# En caso de querer eliminar volúmenes
docker compose down -v
```

### 6. Migraciones de alembic

```bash
alembic revision --autogenerate -m "mensaje"
alembic upgrade head
```

Abre [http://127.0.0.1:8000](http://127.0.0.1:8000) en tu navegador para ver el backend.

### 6. Pipeline

```
[Cliente manda JSON]
   ↓
FastAPI endpoint (usa Pydantic `Schemas` para validar entrada)
   ↓
Service crea objeto SQLAlchemy (usa modelo de `db/models`)
   ↓
Se guarda en la base de datos (usa los repositorios en `db/repositories`)
   ↓
Se devuelve el resultado (convertido a Pydantic → JSON)

```