# Conexión asíncrona con la bd
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from core.config import settings

# Crear el motor asíncrono que gestiona las conexiones a la bd
engine = create_async_engine(settings.DATABASE_URL, echo=False) # echo=False para no mostrar queries en consola
# Crear el generador de sesiones de la bd
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False) # expire_on_commit=False mantiene sesiones accesibles

# Función generadora de sesiones, abre la sesión cuando se necesita
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session # Proporciona la sesión al endpoint
            await session.commit() # Commit si todo sale bien
        except Exception:
            await session.rollback() # Rollback si ocurre un error
            raise
        finally:
            await session.close() # Cierra la sesión
