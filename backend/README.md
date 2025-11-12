# Backend FastAPI

Proyecto base en **FastAPI** para exponer APIs con DB y migraciones.

## 1. Prerrequisitos

- **Git**
- **Python 3.12+** (descarga desde python.org e instala marcando “Add Python to PATH”). :contentReference[oaicite:0]{index=0}
- **Docker** y **Docker Compose** instalados y corriendo.
- (Opcional) Editor como VS Code.

---

## 2. Clonar el repositorio

```bash
git clone https://github.com/TU-ORG/TU-REPO.git
cd TU-REPO
```

## crear Entorno virtual
python -m venv .venv
.venv\Scripts\activate

## 3. Dependencias
pip install -r requirements.txt

## 4. Correr en docker
docker compose up --build

## 5. Migraciones de alembic

alembic revision --autogenerate -m "mensaje"
alembic upgrade head

