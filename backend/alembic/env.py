# Folder creado con alembic init migrations
from logging.config import fileConfig
import asyncio
from sqlalchemy.ext.asyncio import async_engine_from_config

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Importar tu Base
from db.base import Base
# Importar modelos
import db.models  

# Alembic config
config = context.config

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# METADATA para autogenerate
target_metadata = Base.metadata


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,        # Detecta cambios en tipos de columnas
        compare_server_default=True  # Detecta cambios en defaults
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    # Crear engine async
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        future=True,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_offline():
    """
    Modo offline: genera SQL sin conectar a la BD.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    asyncio.run(run_async_migrations())


# Ejecutar según modo
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

""" # Importar base de los modelos
from db.base import Base

# Alembic config
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Estructura de tablas a usar
# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
target_metadata = Base.metadata

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online() """