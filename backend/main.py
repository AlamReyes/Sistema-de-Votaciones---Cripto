from fastapi import FastAPI
from core.config import settings
from api.v1.routes import router as api_router
from sqlalchemy.ext.asyncio import create_async_engine
from db.base import Base

app = FastAPI(title=settings.PROJECT_NAME)
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def init_db():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        # Crear todas las tablas
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()