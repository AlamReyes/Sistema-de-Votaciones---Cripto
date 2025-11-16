# Punto de entrada de FastAPI
from fastapi import FastAPI
from core.config import settings
from api.v1.routes.routes import router as api_router
from fastapi.middleware.cors import CORSMiddleware

# Instancia principal
app = FastAPI(title=settings.PROJECT_NAME)
# Registro de rutas y añade el prefijo /api/v1/
app.include_router(api_router, prefix=settings.API_V1_STR)

origins = [
    "http://localhost:3000",  
    "http://127.0.0.1:3000",
    "http://localhost:3001",  
    "http://127.0.0.1:3001",  
]

app.add_middleware(
    CORSMiddleware,
    #allow_origins=origins,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)