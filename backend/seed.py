import asyncio
from db.session import AsyncSessionLocal
from api.v1.schemas.user import UserCreate
from services.user_service import UserService


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

        print("Seed finalizado correctamente.")


if __name__ == "__main__":
    asyncio.run(run_seed())
