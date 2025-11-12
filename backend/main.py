from fastapi import FastAPI
from core.config import settings
from api.v1.routes import router as api_router

app = FastAPI(title=settings.PROJECT_NAME)
app.include_router(api_router, prefix=settings.API_V1_STR)
