import asyncio
from datetime import datetime, timezone, timedelta
from db.session import AsyncSessionLocal
from api.v1.schemas.user import UserCreate
from services.user_service import UserService
from db.repositories.election import ElectionRepository, OptionRepository
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend


def generate_rsa_key_pem() -> str:
    """Genera una clave privada RSA en formato PEM para firma ciega."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    return pem.decode('utf-8')


async def run_seed():
    async with AsyncSessionLocal() as session:
        service = UserService(session)

        # Creamos usuario normal para el admin
        admin_data = UserCreate(
            name="Pedro",
            last_name="López",
            username="admin",
            password="elAdmin123/",
        )

        admin = await service.get_user_by_username("admin")
        if not admin:
            print("Creando admin...")
            admin = await service.create_user(admin_data)
            # Actualizamos su rol a admin
            await service.update_user_is_admin(admin.id, True)
            print("Admin creado.")
        else:
            print("Admin ya existe, saltando...")

        # Creamos usuario normal
        user_data = UserCreate(
            name="Ana",
            last_name="Sánchez",
            username="user",
            password="elUser123/",
        )

        user = await service.get_user_by_username("user")
        if not user:
            print("Creando usuario normal...")
            await service.create_user(user_data)
            print("Usuario creado.")
        else:
            print("Usuario normal ya existe, saltando...")

        # Creamos votación de prueba
        election_repo = ElectionRepository(session)
        option_repo = OptionRepository(session)

        # Verificar si ya existe una elección
        existing_elections = await election_repo.get_all(limit=1)
        if not existing_elections:
            print("Creando votación de prueba...")

            # Generar clave RSA para firma ciega
            blind_signature_key = generate_rsa_key_pem()

            # Crear elección con período de 30 días
            now = datetime.now(timezone.utc)
            election = await election_repo.create(
                title="Elección de Representante Estudiantil Diciembre 2025",
                description="Votación para elegir al representante estudiantil del período 01/12/25 - 31/12/25.",
                start_date=now,
                end_date=now + timedelta(days=10),
                is_active=True,
                blind_signature_key=blind_signature_key
            )

            # Crear opciones de votación
            candidates = [
                ("María García López", 1),
                ("Carlos Rodríguez Sánchez", 2),
                ("Ana Martínez Pérez", 3),
            ]

            for candidate_name, order in candidates:
                await option_repo.create(
                    election_id=election.id,
                    option_text=candidate_name,
                    option_order=order
                )

            await session.commit()
            print(f"Votación creada: '{election.title}' con {len(candidates)} opciones.")
        else:
            print("Ya existe al menos una votación, saltando...")

        print("Seed finalizado correctamente.")


if __name__ == "__main__":
    asyncio.run(run_seed())
