from fastapi import HTTPException
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from api.v1.schemas.user import UserCreate, UserUpdate, UserUpdatePublicKey
from db.models.user import User
from crypto.voting_crypto import VotingCrypto
from db.repositories.user import UserRepository


# Siempre que se use repo.xxx usar await porque es la operación que toca la bd
class UserService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    # ------------------------
    # CREATE
    # ------------------------
    async def create_user(self, data: UserCreate) -> User:
        """
        Crea un nuevo usuario con contraseña hasheada.
        """
        password_hash = VotingCrypto.hash_password(data.password)
        return await self.repo.create(data, password_hash)

    # ------------------------
    # AUTH / LOGIN
    # ------------------------
    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """
        Verifica username + password.
        """
        # Verifica que exista el usuario utilizando su username
        user = await self.repo.get_by_username(username.lower())
        if not user:
            return None
        # Verifica contraseña
        if not VotingCrypto.verify_password(password, user.password_hash):
            return None
        return user

    # ------------------------
    # READ
    # ------------------------
    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        # Buscar usuario por su id
        return await self.repo.get_by_id(user_id)

    async def get_user_by_username(self, username: str) -> Optional[User]:
        # Buscar usuario por su username
        return await self.repo.get_by_username(username.lower())

    async def list_users(self, skip: int = 0, limit: int = 10) -> List[User]:
        # Buscar una lista de usuario para paginación
        return await self.repo.list_users(skip, limit)

    async def count_users(self) -> int:
        return await self.repo.count_users()

    # ------------------------
    # UPDATE
    # ------------------------
    async def update_user(self, user_id: int, data: UserUpdate) -> Optional[User]:
        """
        Actualiza un usuario. No maneja cambios de admin.
        """
        # Obtener el usuario por username para validar que no exista
        user_exists = await self.repo.get_by_username(data.username)
        if user_exists and user_exists.id != user_id:
            raise HTTPException(
                status_code=400,
                detail="El nombre de usuario ya está en uso"
            )

        # Obtiene el usuario por id
        user = await self.repo.get_by_id(user_id)
        if not user:
            return None
        # Si viene password lo hasheamos
        if data.password:
            hashed = VotingCrypto.hash_password(data.password)
            data.password_hash = hashed 
        # Llama al repository que hace el update del usuario
        return await self.repo.update(user, data)

    async def update_user_is_admin(self, user_id: int, is_admin: bool) -> Optional[User]:
        """
        Cambia el estado de admin. Esto solo lo debe llamar un admin real.
        """
        # Obtiene al usuario por id
        user = await self.repo.get_by_id(user_id)
        if not user:
            return None
        # Llama al repository que hace el update del campo is_admin
        return await self.repo.update_is_admin(user, is_admin)

    async def update_user_public_key(self, user_id: int, data: UserUpdatePublicKey) -> Optional[User]:
        """
        Agrega la public key del usuario cuando genera su private key.
        """
        user = await self.repo.get_by_id(user_id)
        if not user:
            return None

        return await self.repo.update_public_key(user, data)

    # ------------------------
    # DELETE
    # ------------------------
    async def delete_user(self, user_id: int) -> bool:
        # Verificar si existe el usuario
        user = await self.repo.get_by_id(user_id)
        if not user:
            return False
        # Eliminar al usuario
        await self.repo.delete(user)
        return True
