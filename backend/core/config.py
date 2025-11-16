# Elementos centrales del proyecto como variables de entorno
from pydantic_settings import BaseSettings, SettingsConfigDict

# Carga configuracion desde variables de entorno o .env
class Settings(BaseSettings):
    # Lee .env y puede sobreescribir los valores por defecto
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    # Variables de entorno por defecto
    PROJECT_NAME: str = "My FastAPI Backend"
    API_V1_STR: str = "/api/v1" # Prefijo para endpoints
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/appdb"
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int

# Instancia global y única (singleton)
settings = Settings()
